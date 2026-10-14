import { all, one, run, now, transaction } from '../config/db.mjs';
import { Problem, requireUser } from '../middleware/auth.mjs';
import * as v from '../validations/validation.mjs';

export async function setSuspended(d, me) {
  requireUser(me, ['admin']);
  const target = v.id(d.id),
    suspended = d.suspended === true,
    reason = v.text(d.reason || '', 'Reason', 0, 500);
  await transaction(async () => {
    const u = await one('SELECT id,role FROM users WHERE id=?', target);
    if (!u) throw new Problem('Account not found.', 404);
    if (target === me.id || u.role === 'admin')
      throw new Problem(
        'Administrator accounts are protected. Use the approved operator procedure.',
        403,
      );
    await run('UPDATE users SET suspended=? WHERE id=?', suspended ? 1 : 0, target);
    if (suspended) await run('DELETE FROM sessions WHERE user_id=?', target);
    await run(
      "INSERT INTO audit(actor,action,kind,target,reason,created) VALUES(?,?,'user',?,?,?)",
      me.id,
      suspended ? 'suspend' : 'restore',
      target,
      reason,
      now(),
    );
  });
  return {
    message: suspended
      ? 'Account suspended and signed out everywhere.'
      : 'Account restored. The member can sign in again.',
  };
}

export async function auditLog(url, me) {
  requireUser(me, ['admin']);
  const page = v.page(url);
  const rows = await all(
    `SELECT a.id,a.action,a.kind,a.target,a.reason,a.created,u.name FROM audit a JOIN users u ON u.id=a.actor ORDER BY a.id DESC LIMIT 21 OFFSET ${page.offset}`,
  );
  return { entries: rows.slice(0, 20), page: page.number, hasMore: rows.length > 20 };
}

export async function feedbackSummary() {
  const total = await one('SELECT count(*) AS count, avg(rating) AS average FROM feedback');
  const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of await all('SELECT rating, count(*) AS n FROM feedback GROUP BY rating'))
    ratings[row.rating] = Number(row.n);
  return {
    count: Number(total.count),
    average: total.count ? Math.round(Number(total.average) * 10) / 10 : 0,
    ratings,
  };
}

// Quoted cells; a leading formula character is neutralised so spreadsheets never evaluate input.
const cell = (value) => {
  const text = String(value);
  return '"' + (/^[=+\-@\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"';
};
export async function feedbackCsv(me) {
  requireUser(me, ['moderator', 'admin']);
  const rows = await all(
    'SELECT f.id,f.created,u.name,f.rating,f.message FROM feedback f JOIN users u ON u.id=f.user_id ORDER BY f.id',
  );
  return [
    'id,submitted,name,rating,message',
    ...rows.map((r) =>
      [r.id, new Date(r.created * 1000).toISOString(), r.name, r.rating, r.message]
        .map(cell)
        .join(','),
    ),
  ].join('\r\n');
}
