import { randomInt } from 'node:crypto';
import { one, run, now, transaction, useMySQL } from '../config/db.mjs';
import {
  Problem,
  requireUser,
  ownUser,
  passwordHash,
  passwordOK,
  digest,
  throttle,
  sessionToken,
} from '../middleware/auth.mjs';
import * as v from '../validations/validation.mjs';
import { sendMail, codeEmail } from './mail.mjs';
import { discardProfileMedia } from './media.mjs';

// Every account change re-checks the password and shares one per-account attempt limit.
async function confirmPassword(me, password) {
  await throttle(`account:${me.id}`, 10, 300);
  if (typeof password !== 'string' || !passwordOK(password, me.hash))
    throw new Problem('Your current password is incorrect.');
}

export async function changePassword(d, me, request) {
  requireUser(me);
  await confirmPassword(me, d.current);
  const hash = passwordHash(v.password(d.password));
  await transaction(async () => {
    await run('UPDATE users SET hash=? WHERE id=?', hash, me.id);
    await run('DELETE FROM password_resets WHERE user_id=?', me.id);
    await run(
      'DELETE FROM sessions WHERE user_id=? AND token_hash<>?',
      me.id,
      digest(sessionToken(request) || ''),
    );
  });
  return { message: 'Password changed. Your other devices have been signed out.' };
}

export async function requestEmailChange(d, me, demo) {
  requireUser(me);
  await confirmPassword(me, d.password);
  const email = v.email(d.email);
  if (email === me.email) throw new Problem('This is already your account email.');
  if (await one('SELECT id FROM users WHERE email=?', email))
    throw new Problem('This email cannot be used. Try another address.', 409);
  if (useMySQL()) await v.deliverable(email);
  const code = String(randomInt(1000000)).padStart(6, '0');
  await sendMail(
    email,
    codeEmail({
      subject: 'Confirm your new TechCare email',
      heading: 'Confirm your new email',
      intro: 'Enter this code in My Dashboard to switch your TechCare account to this address.',
      label: 'TechCare email change code',
      code,
      note: 'If you did not request this, you can ignore this email.',
    }),
    demo,
  );
  await run(
    'INSERT INTO email_changes(user_id,email,code_hash,expires,attempts) VALUES(?,?,?,?,0) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,code_hash=excluded.code_hash,expires=excluded.expires,attempts=0',
    me.id,
    email,
    passwordHash(code),
    now() + 900,
  );
  return {
    message: 'Enter the six-digit code sent to your new email address.',
    ...(demo ? { development_code: code } : {}),
  };
}

export async function confirmEmailChange(d, me) {
  requireUser(me);
  await throttle(`account:${me.id}`, 10, 300);
  if (typeof d.code !== 'string' || !/^\d{6}$/.test(d.code))
    throw new Problem('Enter exactly six digits.');
  const change = await one('SELECT * FROM email_changes WHERE user_id=?', me.id);
  if (!change || change.expires <= now() || change.attempts >= 5)
    throw new Problem('Invalid or expired code. Request a new one.');
  if (!passwordOK(d.code, change.code_hash)) {
    await run('UPDATE email_changes SET attempts=attempts+1 WHERE user_id=?', me.id);
    throw new Problem('Invalid or expired code.');
  }
  await transaction(async () => {
    await run('UPDATE users SET email=? WHERE id=?', change.email, me.id);
    await run('DELETE FROM email_changes WHERE user_id=?', me.id);
  });
  return {
    message: 'Email address updated.',
    user: ownUser(await one('SELECT * FROM users WHERE id=?', me.id)),
  };
}

// Removes personal data and access. Public questions and comments stay, credited to "Deleted member".
export async function deleteAccount(d, me) {
  requireUser(me);
  await confirmPassword(me, d.password);
  if (me.role === 'admin')
    throw new Problem(
      'Administrator accounts are protected. Use the approved operator procedure.',
      403,
    );
  const id = me.id;
  await transaction(async () => {
    await run(
      "UPDATE users SET name='Deleted member',email=?,hash='!',bio='',avatar='',visibility='private',verified=0,role='member' WHERE id=?",
      `deleted-${id}@deleted.invalid`,
      id,
    );
    for (const table of [
      'sessions',
      'email_verifications',
      'email_changes',
      'password_resets',
      'alerts',
      'notifications',
    ])
      await run(`DELETE FROM ${table} WHERE user_id=?`, id);
    await run('DELETE FROM follows WHERE follower=? OR followed=?', id, id);
    await run('DELETE FROM friendships WHERE sender=? OR receiver=?', id, id);
    await run('DELETE FROM blocks WHERE blocker=? OR blocked=?', id, id);
    // Reported messages stay as evidence for open staff reviews.
    await run(
      'DELETE FROM messages WHERE (sender=? OR receiver=?) AND id NOT IN (SELECT message_id FROM message_reports)',
      id,
      id,
    );
  });
  if (me.avatar) await discardProfileMedia(me.avatar, id);
  return { message: 'Your account has been deleted.' };
}
