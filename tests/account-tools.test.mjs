import { CONSENT_COOKIE, CONSENT_VERSION } from '../shared/src/consent.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';
import { handle } from '../backend/src/controllers/api.mjs';
import { run, one, now, closeDatabases } from '../backend/src/config/db.mjs';
import { passwordHash } from '../backend/src/middleware/auth.mjs';
import { deliverable } from '../backend/src/validations/validation.mjs';
import { Resolver } from 'node:dns/promises';

const temporary = await mkdtemp(join(tmpdir(), 'techcare-account-'));
process.env.TECHCARE_DB_DRIVER = 'sqlite';
process.env.TECHCARE_TEST_SQLITE = '1';
process.env.TECHCARE_DATA_DIR = temporary;
process.env.TECHCARE_DEV_VERIFY = '1';
const origin = (process.env.TECHCARE_ORIGIN = 'http://127.0.0.1:3027');
async function call(path, data, cookie = '') {
  const response = await handle(
    new Request(`${origin}/api/${path}`, {
      method: data ? 'POST' : 'GET',
      headers: {
        cookie: `${cookie}; ${CONSENT_COOKIE}=${CONSENT_VERSION}`,
        ...(data ? { origin, 'content-type': 'application/json', 'x-techcare-request': '1' } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    }),
  );
  const type = response.headers.get('content-type') || '';
  return {
    status: response.status,
    response,
    data: type.includes('json') ? await response.json() : await response.text(),
  };
}
const pw = 'Synthetic-account-password';
async function login(email, password = pw) {
  const r = await call('login', { email, password });
  return r.status === 200 ? r.response.headers.get('set-cookie').split(';')[0] : r.status;
}
const alerts = async (cookie) => (await call('notifications', null, cookie)).data.alerts;
try {
  const sessions = {},
    ids = {},
    hash = passwordHash(pw);
  for (const role of ['member', 'other', 'moderator', 'admin']) {
    ids[role] = Number(
      run(
        'INSERT INTO users(name,email,hash,role,verified,created) VALUES(?,?,?,?,1,?)',
        `${role} user`,
        `${role}@example.test`,
        hash,
        role === 'other' ? 'member' : role,
        now(),
      ).lastInsertRowid,
    );
    sessions[role] = await login(`${role}@example.test`);
  }
  const question = {
    title: 'Laptop will not charge',
    body: 'The charging light stays off with two different chargers.',
    category: 'Hardware',
  };

  await test('rejected questions carry a note, can be resubmitted, and alert the author', async () => {
    const created = await call('posts', question, sessions.member);
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal(
      (
        await call(
          'moderate',
          { kind: 'post', id, status: 'rejected', note: 'Add your laptop model.' },
          sessions.moderator,
        )
      ).status,
      200,
    );
    const mine = (await call('dashboard', null, sessions.member)).data.posts[0];
    assert.equal(mine.status, 'rejected');
    assert.equal(mine.review_note, 'Add your laptop model.');
    assert.match((await alerts(sessions.member))[0].text, /not approved.*Add your laptop model/);
    assert.equal(
      (await call('posts', { ...question, id }, sessions.other)).status,
      403,
      'only the author edits',
    );
    const edited = await call(
      'posts',
      { ...question, id, title: 'Lenovo laptop will not charge' },
      sessions.member,
    );
    assert.equal(edited.status, 201);
    const row = one('SELECT title,status,review_note FROM posts WHERE id=?', id);
    assert.deepEqual(
      { ...row },
      {
        title: 'Lenovo laptop will not charge',
        status: 'pending',
        review_note: '',
      },
    );
    assert.equal(
      (await call('moderate', { kind: 'post', id, status: 'published' }, sessions.moderator))
        .status,
      200,
    );
    assert.equal((await alerts(sessions.member))[0].link, `/discussion/${id}`);
    assert.equal(
      (await call('posts', { ...question, id }, sessions.member)).status,
      409,
      'published questions are not edited in place',
    );
    await call('notifications', {}, sessions.member);
    assert.ok((await alerts(sessions.member)).every((a) => a.seen === 1));
  });

  await test('authors delete their own questions unless others have answered', async () => {
    const lone = (await call('posts', question, sessions.member)).data.id;
    assert.equal((await call('posts/delete', { id: lone }, sessions.other)).status, 403);
    assert.equal((await call('posts/delete', { id: lone }, sessions.member)).status, 200);
    assert.equal(one('SELECT 1 FROM posts WHERE id=?', lone), undefined);
    const answered = (await call('posts', question, sessions.member)).data.id;
    run("UPDATE posts SET status='published' WHERE id=?", answered);
    await call('comments', { post_id: answered, body: 'Try another outlet.' }, sessions.other);
    assert.equal((await call('posts/delete', { id: answered }, sessions.member)).status, 409);
  });

  await test('lost & found reports can be edited while in review and deleted with inquiries', async () => {
    const report = {
      kind: 'lost',
      item: 'Blue water bottle',
      details: 'A blue steel bottle with a dent near the cap.',
      location: 'Gym',
    };
    const id = (await call('lost-found', report, sessions.member)).data.id;
    await call(
      'moderate',
      { kind: 'report', id, status: 'rejected', note: 'Describe any stickers.' },
      sessions.moderator,
    );
    assert.equal(
      (await call('dashboard', null, sessions.member)).data.reports[0].review_note,
      'Describe any stickers.',
    );
    assert.equal(
      (await call('my-content?kind=report&id=' + id, null, sessions.member)).data.item.item,
      report.item,
    );
    assert.equal((await call('my-content?kind=report&id=' + id, null, sessions.other)).status, 404);
    assert.equal(
      (
        await call(
          'lost-found',
          { ...report, id, item: 'Blue bottle, cat sticker' },
          sessions.member,
        )
      ).status,
      201,
    );
    assert.equal(one('SELECT status FROM lost_found WHERE id=?', id).status, 'pending');
    run("UPDATE lost_found SET status='published' WHERE id=?", id);
    await call('item-inquiries', { id, body: 'I think I found this in the gym.' }, sessions.other);
    assert.match((await alerts(sessions.member))[0].text, /private message about your notice/);
    const inquiry = one('SELECT id FROM item_inquiries WHERE report_id=?', id).id;
    await call('item-inquiries/reply', { id: inquiry, response: 'Thank you!' }, sessions.member);
    assert.match((await alerts(sessions.other))[0].text, /reply about the notice/);
    assert.equal((await call('lost-found/delete', { id }, sessions.other)).status, 403);
    assert.equal((await call('lost-found/delete', { id }, sessions.member)).status, 200);
    assert.equal(one('SELECT 1 FROM item_inquiries WHERE report_id=?', id), undefined);
  });

  await test('accepted friend requests alert the requester', async () => {
    await call('friend', { user_id: ids.member, action: 'request' }, sessions.other);
    await call('friend', { user_id: ids.other, action: 'accept' }, sessions.member);
    assert.match((await alerts(sessions.other))[0].text, /accepted your friend request/);
  });

  await test('password changes require the current password and sign out other devices', async () => {
    const second = await login('member@example.test');
    const next = 'Another-synthetic-password';
    assert.equal(
      (
        await call(
          'account/password',
          { current: 'wrong-password-x', password: next },
          sessions.member,
        )
      ).status,
      400,
    );
    assert.equal(
      (await call('account/password', { current: pw, password: next }, sessions.member)).status,
      200,
    );
    assert.equal((await call('me', null, sessions.member)).data.user.id, ids.member);
    assert.equal((await call('me', null, second)).data.user, null);
    assert.equal(await login('member@example.test'), 401);
    assert.equal(typeof (await login('member@example.test', next)), 'string');
  });

  await test('email changes take effect only after the new address confirms a code', async () => {
    const next = 'Another-synthetic-password';
    assert.equal(
      (
        await call(
          'account/email',
          { email: 'other@example.test', password: next },
          sessions.member,
        )
      ).status,
      409,
      'addresses already in use are refused',
    );
    const requested = await call(
      'account/email',
      { email: 'member.new@example.test', password: next },
      sessions.member,
    );
    assert.equal(requested.status, 200);
    assert.equal(
      one('SELECT email FROM users WHERE id=?', ids.member).email,
      'member@example.test',
    );
    assert.equal(
      (await call('account/email/verify', { code: '000000' }, sessions.member)).status,
      400,
    );
    const confirmed = await call(
      'account/email/verify',
      { code: requested.data.development_code },
      sessions.member,
    );
    assert.equal(confirmed.data.user.email, 'member.new@example.test');
  });

  await test('admins suspend and restore members; administrators are protected', async () => {
    assert.equal(
      (await call('admin/suspend', { id: ids.other, suspended: true }, sessions.moderator)).status,
      403,
    );
    assert.equal(
      (await call('admin/suspend', { id: ids.admin, suspended: true }, sessions.admin)).status,
      403,
    );
    assert.equal(
      (
        await call(
          'admin/suspend',
          { id: ids.other, suspended: true, reason: 'Spam' },
          sessions.admin,
        )
      ).status,
      200,
    );
    assert.equal((await call('me', null, sessions.other)).data.user, null);
    assert.equal(await login('other@example.test'), 403);
    assert.ok(!(await call('members')).data.members.some((u) => u.id === ids.other));
    await call('admin/suspend', { id: ids.other, suspended: false }, sessions.admin);
    sessions.other = await login('other@example.test');
    assert.equal(typeof sessions.other, 'string');
    const log = (await call('admin/audit', null, sessions.admin)).data.entries;
    assert.deepEqual(
      log.slice(0, 2).map((e) => [e.action, e.target, e.reason]),
      [
        ['restore', ids.other, ''],
        ['suspend', ids.other, 'Spam'],
      ],
    );
    assert.equal((await call('admin/audit', null, sessions.moderator)).status, 403);
  });

  await test('staff see a feedback summary and export CSV without formula injection', async () => {
    await call(
      'feedback',
      { rating: 5, message: 'Great booth and friendly staff.' },
      sessions.member,
    );
    await call('feedback', { rating: 2, message: '=HYPERLINK("http://x")' }, sessions.other);
    const summary = (await call('queue', null, sessions.moderator)).data.feedbackSummary;
    assert.deepEqual(summary, {
      count: 2,
      average: 3.5,
      ratings: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 },
    });
    assert.equal((await call('feedback.csv', null, sessions.member)).status, 403);
    const csv = await call('feedback.csv', null, sessions.moderator);
    assert.match(csv.response.headers.get('content-disposition'), /attachment/);
    assert.ok(csv.data.includes('"\'=HYPERLINK(""http://x"")"'));
    assert.ok(
      (await call('ratings.csv', null, sessions.moderator)).data.includes('"average","3.5"'),
    );
  });

  await test('admins export every dataset as CSV, staff only what they may see', async () => {
    assert.equal((await call('users.csv', null, sessions.moderator)).status, 403);
    assert.equal((await call('nothing.csv', null, sessions.admin)).status, 404);
    const users = (await call('users.csv', null, sessions.admin)).data;
    assert.ok(users.startsWith('id,name,email,role')); // text() drops the Excel byte-order mark
    assert.ok(users.includes('other@example.test'));
    assert.ok(!/\$2[aby]\$|scrypt|hash/i.test(users), 'password hashes never leave the server');
    for (const name of ['discussions', 'lost-found', 'reports', 'audit'])
      assert.equal((await call(name + '.csv', null, sessions.admin)).status, 200, name);
  });

  await test('only admins delete accounts; personal data goes and public posts remain', async () => {
    const next = 'Another-synthetic-password';
    const kept = one(
      'SELECT id FROM posts WHERE user_id=? AND status=?',
      ids.member,
      'published',
    ).id;
    assert.equal((await call('account/delete', { password: next }, sessions.member)).status, 404);
    for (const session of [sessions.member, sessions.moderator])
      assert.equal(
        (await call('admin/delete-account', { id: ids.other }, session)).status,
        403,
        'members and moderators cannot delete accounts',
      );
    assert.equal(
      (await call('admin/delete-account', { id: ids.admin }, sessions.admin)).status,
      403,
      'administrators are protected',
    );
    const deleted = await call(
      'admin/delete-account',
      { id: ids.member, reason: 'Asked at the booth' },
      sessions.admin,
    );
    assert.equal(deleted.status, 200);
    assert.equal(one('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?', ids.member).n, 0);
    assert.equal(
      one("SELECT reason FROM audit WHERE action='delete' AND target=?", ids.member).reason,
      'Asked at the booth',
    );
    const u = one('SELECT name,email,bio,verified FROM users WHERE id=?', ids.member);
    assert.deepEqual(
      { ...u },
      {
        name: 'Deleted member',
        email: `deleted-${ids.member}@deleted.invalid`,
        bio: '',
        verified: 0,
      },
    );
    assert.equal(
      one('SELECT 1 FROM friendships WHERE sender=? OR receiver=?', ids.member, ids.member),
      undefined,
    );
    assert.equal((await call('post?id=' + kept)).data.post.name, 'Deleted member');
    assert.equal(await login('member.new@example.test', next), 401);
  });

  await test('sign-up rejects email domains that cannot receive mail', async (t) => {
    const answers = {
      'gmail.com': [{ exchange: 'gmail-smtp-in.l.google.com', priority: 5 }],
      'example.com': [{ exchange: '', priority: 0 }], // null MX: accepts no mail
    };
    t.mock.method(Resolver.prototype, 'resolveMx', async (domain) => {
      if (domain === 'offline.test')
        throw Object.assign(new Error('timeout'), { code: 'ETIMEOUT' });
      if (answers[domain]) return answers[domain];
      throw Object.assign(new Error('no data'), { code: 'ENODATA' });
    });
    assert.equal(await deliverable('ana@gmail.com'), 'ana@gmail.com');
    await assert.rejects(deliverable('dasdsadsa21321s@dsadasdasd.com'), /cannot receive mail/);
    await assert.rejects(deliverable('someone@example.com'), /cannot receive mail/);
    // A DNS outage must not block sign-up; the emailed code still has to arrive.
    assert.equal(await deliverable('ana@offline.test'), 'ana@offline.test');
  });
} finally {
  closeDatabases();
  const child = relative(tmpdir(), temporary);
  if (child.startsWith('techcare-account-') && !child.includes('..') && !isAbsolute(child))
    await rm(temporary, { recursive: true, force: true });
}
