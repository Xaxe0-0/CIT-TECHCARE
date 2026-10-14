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
const when = (seconds) => (seconds ? new Date(Number(seconds) * 1000).toISOString() : '');
const yes = (flag) => (flag ? 'yes' : 'no');
const staff = ['moderator', 'admin'];
// Each export: who may download it, its header row, and its rows. Never add password hashes,
// session tokens, or private message bodies here.
const exportsByName = {
  feedback: {
    roles: staff,
    header: 'id,submitted,name,rating,message',
    rows: async () =>
      (
        await all(
          'SELECT f.id,f.created,u.name,f.rating,f.message FROM feedback f JOIN users u ON u.id=f.user_id ORDER BY f.id',
        )
      ).map((r) => [r.id, when(r.created), r.name, r.rating, r.message]),
  },
  ratings: {
    roles: staff,
    header: 'stars,responses,percent',
    rows: async () => {
      const { count, average, ratings } = await feedbackSummary();
      const percent = (n) => (count ? Math.round((n / count) * 1000) / 10 : 0) + '%';
      return [
        ...[5, 4, 3, 2, 1].map((n) => [n, ratings[n], percent(ratings[n])]),
        ['average', average, count + ' total'],
      ];
    },
  },
  users: {
    roles: ['admin'],
    header: 'id,name,email,role,verified,suspended,joined',
    rows: async () =>
      (
        await all('SELECT id,name,email,role,verified,suspended,created FROM users ORDER BY id')
      ).map((r) => [
        r.id,
        r.name,
        r.email,
        r.role,
        yes(r.verified),
        yes(r.suspended),
        when(r.created),
      ]),
  },
  discussions: {
    roles: ['admin'],
    header: 'id,posted,author,category,status,title,votes,replies',
    rows: async () =>
      (
        await all(
          `SELECT p.id,p.created,u.name,p.category,p.status,p.title,
            (SELECT COALESCE(SUM(value),0) FROM post_votes WHERE post_id=p.id) AS votes,
            (SELECT count(*) FROM comments WHERE post_id=p.id AND deleted=0) AS replies
           FROM posts p LEFT JOIN users u ON u.id=p.user_id ORDER BY p.id`,
        )
      ).map((r) => [
        r.id,
        when(r.created),
        r.name,
        r.category,
        r.status,
        r.title,
        r.votes,
        r.replies,
      ]),
  },
  'lost-found': {
    roles: ['admin'],
    header: 'id,reported,reporter,kind,item,location,status,returned',
    rows: async () =>
      (
        await all(
          'SELECT l.id,l.created,u.name,l.kind,l.item,l.location,l.status,l.returned_at FROM lost_found l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.id',
        )
      ).map((r) => [
        r.id,
        when(r.created),
        r.name,
        r.kind,
        r.item,
        r.location,
        r.status,
        when(r.returned_at),
      ]),
  },
  reports: {
    roles: ['admin'],
    header: 'id,reported,reporter,kind,target,reason,resolved',
    rows: async () =>
      (
        await all(
          'SELECT c.id,c.created,u.name,c.kind,c.target,c.reason,c.resolved FROM content_reports c LEFT JOIN users u ON u.id=c.reporter ORDER BY c.id',
        )
      ).map((r) => [r.id, when(r.created), r.name, r.kind, r.target, r.reason, yes(r.resolved)]),
  },
  audit: {
    roles: ['admin'],
    header: 'id,when,staff,action,kind,target,reason',
    rows: async () =>
      (
        await all(
          'SELECT a.id,a.created,u.name,a.action,a.kind,a.target,a.reason FROM audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.id',
        )
      ).map((r) => [r.id, when(r.created), r.name, r.action, r.kind, r.target, r.reason]),
  },
};

// Returns null for an unknown export so the caller can answer 404.
export async function exportCsv(name, me) {
  const spec = Object.hasOwn(exportsByName, name) ? exportsByName[name] : null;
  if (!spec) return null;
  requireUser(me, spec.roles);
  const rows = await spec.rows();
  return [spec.header, ...rows.map((row) => row.map((value) => cell(value ?? '')).join(','))].join(
    '\r\n',
  );
}
