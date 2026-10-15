import { all, one, run, now, transaction } from '../config/db.mjs';
import { Problem, requireUser, blocked, throttle } from '../middleware/auth.mjs';
import * as v from '../validations/validation.mjs';
import { saveMedia, discardCommunityMedia, discardQuestionMedia } from './media.mjs';
import { voteColumns } from './discussion.mjs';

const staff = ['admin', 'moderator'];
// Notices older than this leave the active lists and move to Archived.
export const LOST_FOUND_DAYS = 90;
// A bell notification for anything other than a comment reply.
export async function alert(userId, text, link = '') {
  await run(
    'INSERT INTO alerts(user_id,text,link,created) VALUES(?,?,?,?)',
    userId,
    text.slice(0, 700),
    link,
    now(),
  );
}
// Authors may edit while a submission awaits or failed review; an edit always returns it to review.
const editable = ['pending', 'rejected'];
async function ownSubmission(table, d, me, label) {
  const row = await one(`SELECT * FROM ${table} WHERE id=?`, v.id(d.id));
  if (!row || row.user_id !== me.id)
    throw new Problem(`You can change only your own ${label}.`, 403);
  return row;
}
export async function savePost(d, me) {
  requireUser(me);
  const editing = d.id ? await ownSubmission('posts', d, me, 'questions') : null;
  if (editing && !editable.includes(editing.status))
    throw new Problem(
      'Published questions cannot be edited. Delete it, or ask a moderator for help.',
      409,
    );
  const title = v.text(d.title, 'Question title', 8, 120),
    body = v.text(d.body, 'Problem description', 20, 2000),
    category = v.choice(d.category, v.categories, 'category');
  // Up to four photos (photo0..photo3; photo is the older single-photo field). New photos replace
  // the saved set and removePhoto clears it. posts.photo keeps the first one as the feed cover.
  const uploaded = [];
  try {
    for (const data of [d.photo, d.photo0, d.photo1, d.photo2, d.photo3]
      .filter(Boolean)
      .slice(0, 4))
      uploaded.push(await saveMedia(data, me.id, 'question'));
  } catch (error) {
    for (const url of uploaded) await discardQuestionMedia(url, me.id);
    throw error;
  }
  const saved = JSON.parse(editing?.photos || '[]');
  const photos = uploaded.length ? uploaded : d.removePhoto === '1' ? [] : saved;
  const photo = photos[0] || '',
    photoList = JSON.stringify(photos);
  let id;
  try {
    if (editing) {
      const r = await run(
        "UPDATE posts SET title=?,body=?,category=?,photo=?,photos=?,status='pending',review_note='' WHERE id=? AND user_id=? AND status IN ('pending','rejected')",
        title,
        body,
        category,
        photo,
        photoList,
        editing.id,
        me.id,
      );
      if (!r.changes) throw new Problem('This question changed. Refresh and try again.', 409);
      id = editing.id;
    } else
      id = Number(
        (
          await run(
            'INSERT INTO posts(user_id,title,body,category,created,photo,photos) VALUES(?,?,?,?,?,?,?)',
            me.id,
            title,
            body,
            category,
            now(),
            photo,
            photoList,
          )
        ).lastInsertRowid,
      );
  } catch (error) {
    for (const url of uploaded) await discardQuestionMedia(url, me.id);
    throw error;
  }
  for (const url of saved) if (!photos.includes(url)) await discardQuestionMedia(url, me.id);
  return {
    ok: true,
    id,
    message: editing
      ? 'Question resubmitted for moderator review.'
      : 'Question submitted for moderator review. Track its status in My Dashboard.',
  };
}
export async function deletePost(d, me) {
  requireUser(me);
  const post = await ownSubmission('posts', d, me, 'questions');
  // Removing a thread would take other members' answers with it; staff handle that via reports.
  if (await one('SELECT 1 FROM comments WHERE post_id=? AND user_id<>? LIMIT 1', post.id, me.id))
    throw new Problem(
      'Others have answered this question, so it stays. Report it if it should be removed.',
      409,
    );
  const photos = (
    await all("SELECT photo FROM comments WHERE post_id=? AND photo<>''", post.id)
  ).map((row) => row.photo);
  await run('DELETE FROM posts WHERE id=? AND user_id=?', post.id, me.id);
  for (const url of JSON.parse(post.photos || '[]')) await discardQuestionMedia(url, me.id);
  for (const url of photos) await discardCommunityMedia(url, me.id);
  return { message: 'Question deleted.' };
}
export async function publishedComment(id) {
  return await one(
    `SELECT c.* FROM comments c JOIN posts p ON p.id=c.post_id
    LEFT JOIN comments root ON root.id=c.root_id WHERE c.id=? AND c.status='published'
    AND p.status='published' AND (c.root_id IS NULL OR root.status='published')`,
    id,
  );
}
export async function notifyReply(id) {
  const comment = await publishedComment(id);
  if (!comment || !comment.parent_id || comment.deleted) return;
  const parent = await one('SELECT user_id FROM comments WHERE id=?', comment.parent_id);
  if (
    parent &&
    parent.user_id !== comment.user_id &&
    !(await blocked(parent.user_id, comment.user_id))
  )
    await run(
      'INSERT OR IGNORE INTO notifications(user_id,comment_id,created) VALUES(?,?,?)',
      parent.user_id,
      id,
      now(),
    );
}
export async function listComments(url, me) {
  const post = v.id(url.searchParams.get('post')),
    page = v.page(url);
  if (!(await one("SELECT 1 FROM posts WHERE id=? AND status='published'", post)))
    throw new Problem('Published discussion not found.', 404);
  const root = url.searchParams.get('root') ? v.id(url.searchParams.get('root')) : null;
  if (root) {
    const target = await publishedComment(root);
    if (!target || target.post_id !== post || target.root_id)
      throw new Problem('Comment thread not found.', 404);
  }
  const rows = await all(
    `SELECT c.id,c.body,c.photo,c.parent_id,c.root_id,c.deleted,c.revision,c.created,
    c.user_id=? AS own,u.name,u.role,CASE WHEN u.visibility='private' THEN '' ELSE u.avatar END AS avatar,
    ${voteColumns('comment', 'c')},parentUser.name AS replyTo,
    (SELECT count(*) FROM comments child WHERE child.root_id=c.id AND child.status='published') AS replies
    FROM comments c JOIN users u ON u.id=c.user_id LEFT JOIN comments parent ON parent.id=c.parent_id
    LEFT JOIN users parentUser ON parentUser.id=parent.user_id
    WHERE c.post_id=? AND c.status='published' AND ${root ? 'c.root_id=?' : 'c.root_id IS NULL'}
    ORDER BY c.created,c.id LIMIT 21 OFFSET ${page.offset}`,
    me?.id || 0,
    me?.id || 0,
    post,
    ...(root ? [root] : []),
  );
  return {
    comments: rows.slice(0, 20),
    hasMore: rows.length > 20,
    page: page.number,
    rootCount: (
      await one(
        "SELECT count(*) AS n FROM comments WHERE post_id=? AND root_id IS NULL AND status='published'",
        post,
      )
    ).n,
  };
}
export async function saveComment(d, me) {
  requireUser(me);
  const editing = d.id ? await one('SELECT * FROM comments WHERE id=?', v.id(d.id)) : null;
  if (d.id && (!editing || editing.user_id !== me.id || editing.deleted))
    throw new Problem('You can edit only your own comments.', 403);
  // Staff removals are final: the author may delete the comment but not republish it by editing.
  if (editing?.status === 'rejected' && d.action !== 'delete')
    throw new Problem('A moderator removed this comment, so it can no longer be edited.', 403);
  if (editing && Number(d.revision) !== editing.revision)
    throw new Problem('This comment changed. Refresh before editing again.', 409);
  const post = editing?.post_id || v.id(d.post_id);
  const validateParent = async () => {
    if (!(await one("SELECT 1 FROM posts WHERE id=? AND status='published'", post)))
      throw new Problem('Reply to a published discussion.', 404);
    const parentId = editing?.parent_id || (d.parent_id ? v.id(d.parent_id) : null);
    const parent = parentId ? await publishedComment(parentId) : null;
    if (parentId && (!parent || parent.post_id !== post || (!editing && parent.deleted)))
      throw new Problem('Reply to an available comment in this discussion.', 404);
    return parent;
  };
  await validateParent();
  const removing = d.action === 'delete';
  const body = removing
    ? ''
    : v.text(
        d.body || '',
        'Comment',
        d.file || (editing?.photo && d.removePhoto !== '1') ? 0 : 3,
        1000,
      );
  const status = editing ? editing.status : 'published';
  if (removing && !editing) throw new Problem('Choose your comment.');
  let uploaded = '';
  let photo = removing || d.removePhoto === '1' ? '' : editing?.photo || '';
  if (d.file && !removing) photo = uploaded = await saveMedia(d.file, me.id, 'comment');
  let id;
  try {
    await transaction(async () => {
      const parent = await validateParent();
      if (editing) {
        const result = await run(
          'UPDATE comments SET body=?,photo=?,status=?,deleted=?,revision=revision+1 WHERE id=? AND revision=?',
          body,
          photo,
          status,
          removing ? 1 : 0,
          editing.id,
          editing.revision,
        );
        if (!result.changes)
          throw new Problem('This comment changed. Refresh before editing again.', 409);
        id = editing.id;
      } else
        id = Number(
          (
            await run(
              'INSERT INTO comments(post_id,user_id,body,status,created,photo,parent_id,root_id) VALUES(?,?,?,?,?,?,?,?)',
              post,
              me.id,
              body,
              status,
              now(),
              photo,
              parent?.id || null,
              parent?.root_id || parent?.id || null,
            )
          ).lastInsertRowid,
        );
      if (status === 'published' && !removing) await notifyReply(id);
    });
  } catch (error) {
    if (uploaded) await discardCommunityMedia(uploaded, me.id);
    throw error;
  }
  if (editing?.photo && editing.photo !== photo) await discardCommunityMedia(editing.photo, me.id);
  return {
    id,
    message: removing
      ? 'Comment removed. Existing replies are kept.'
      : status === 'published'
        ? 'Comment published.'
        : 'Comment submitted for moderator review.',
  };
}
export async function saveLost(d, me) {
  requireUser(me);
  const editing = d.id ? await ownSubmission('lost_found', d, me, 'reports') : null;
  if (editing && !editable.includes(editing.status))
    throw new Problem(
      'Published notices cannot be edited. Delete it and submit a new report instead.',
      409,
    );
  const kind = v.choice(d.kind, ['lost', 'found'], 'report type');
  const item = v.text(d.item, 'Item name', 3, 100),
    details = v.publicDescription(d.details),
    location = v.text(d.location, 'Location', 3, 100);
  const eventDate = v.text(d.event_date || '', 'Date', 0, 10);
  if (
    eventDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
      !Number.isFinite(Date.parse(eventDate)) ||
      new Date(eventDate).toISOString().slice(0, 10) !== eventDate)
  )
    throw new Problem('Choose a valid date.');
  const photos = [];
  try {
    for (let i = 0; i < 4; i++)
      if (d[`photo${i}`]) photos.push(await saveMedia(d[`photo${i}`], me.id, 'lost'));
    // New photos replace the saved set; otherwise an edit keeps the existing photos.
    const saved = JSON.stringify(photos.length ? photos : JSON.parse(editing?.photos || '[]'));
    let id;
    if (editing) {
      const r = await run(
        "UPDATE lost_found SET kind=?,item=?,details=?,location=?,photos=?,event_date=?,status='pending',review_note='' WHERE id=? AND user_id=? AND status IN ('pending','rejected')",
        kind,
        item,
        details,
        location,
        saved,
        eventDate,
        editing.id,
        me.id,
      );
      if (!r.changes) throw new Problem('This report changed. Refresh and try again.', 409);
      id = editing.id;
    } else
      id = Number(
        (
          await run(
            'INSERT INTO lost_found(user_id,kind,item,details,location,created,photos,event_date) VALUES(?,?,?,?,?,?,?,?)',
            me.id,
            kind,
            item,
            details,
            location,
            now(),
            saved,
            eventDate,
          )
        ).lastInsertRowid,
      );
    if (editing && photos.length)
      for (const url of JSON.parse(editing.photos)) await discardCommunityMedia(url, me.id);
    return {
      id,
      message: editing
        ? 'Your report was updated and sent for review again.'
        : 'Your report and photos have been submitted for review.',
    };
  } catch (error) {
    for (const url of photos) await discardCommunityMedia(url, me.id);
    throw error;
  }
}
export async function deleteLost(d, me) {
  requireUser(me);
  const report = await ownSubmission('lost_found', d, me, 'reports');
  await transaction(async () => {
    await run('DELETE FROM item_inquiries WHERE report_id=?', report.id);
    await run('DELETE FROM lost_found WHERE id=?', report.id);
  });
  for (const url of JSON.parse(report.photos)) await discardCommunityMedia(url, me.id);
  return { message: 'Report deleted.' };
}
export async function communityGet(path, url, me) {
  if (path === 'notifications') {
    requireUser(me);
    const rows = await all(
      `SELECT n.id,n.seen,n.created,c.post_id,c.id AS comment_id,c.root_id,u.name,p.title,
      (SELECT count(*) FROM comments earlier WHERE earlier.post_id=c.post_id AND earlier.root_id IS NULL AND earlier.status='published' AND (earlier.created<root.created OR (earlier.created=root.created AND earlier.id<root.id))) AS preceding FROM notifications n
      JOIN comments c ON c.id=n.comment_id JOIN users u ON u.id=c.user_id JOIN posts p ON p.id=c.post_id
      LEFT JOIN comments root ON root.id=c.root_id WHERE n.user_id=? AND c.status='published' AND c.deleted=0
      AND p.status='published' AND (root.id IS NULL OR root.status='published') ORDER BY n.id DESC LIMIT 50`,
      me.id,
    );
    // Computed here: MySQL's "/" is decimal division, so SQL would yield pages like 1.25.
    return {
      notifications: rows.map(({ preceding, ...row }) => ({
        ...row,
        page: 1 + Math.floor(preceding / 20),
      })),
      alerts: await all(
        'SELECT id,text,link,seen,created FROM alerts WHERE user_id=? ORDER BY id DESC LIMIT 50',
        me.id,
      ),
    };
  }
  if (path === 'my-content') {
    requireUser(me);
    const kind = v.choice(url.searchParams.get('kind'), ['post', 'report'], 'content type'),
      id = v.id(url.searchParams.get('id'));
    const row =
      kind === 'post'
        ? await one(
            'SELECT id,title,body,category,photo,photos,status,review_note FROM posts WHERE id=? AND user_id=?',
            id,
            me.id,
          )
        : await one(
            'SELECT id,kind,item,details,location,event_date,photos,status,review_note FROM lost_found WHERE id=? AND user_id=?',
            id,
            me.id,
          );
    if (!row) throw new Problem('Not found among your submissions.', 404);
    return { item: row.photos ? { ...row, photos: JSON.parse(row.photos) } : row };
  }
  if (path === 'content-reports') {
    requireUser(me, staff);
    return {
      reports:
        await all(`SELECT r.*,u.name,CASE WHEN r.kind='post' THEN p.body ELSE c.body END AS body,
      CASE WHEN r.kind='post' THEN p.id ELSE c.post_id END AS post_id
      FROM content_reports r JOIN users u ON u.id=r.reporter LEFT JOIN posts p ON r.kind='post' AND p.id=r.target
      LEFT JOIN comments c ON r.kind='comment' AND c.id=r.target WHERE r.resolved=0 ORDER BY r.id DESC LIMIT 100`),
    };
  }
  if (path === 'item-inquiries') {
    requireUser(me);
    return {
      inquiries: await all(
        `SELECT i.id,i.body,i.response,i.report_id,i.created,l.item,u.name,(l.user_id=? OR ?=1) AS canReply FROM item_inquiries i
      JOIN lost_found l ON l.id=i.report_id JOIN users u ON u.id=i.user_id
      WHERE l.user_id=? OR i.user_id=? OR ?=1 ORDER BY i.id DESC LIMIT 100`,
        me.id,
        staff.includes(me.role) ? 1 : 0,
        me.id,
        me.id,
        staff.includes(me.role) ? 1 : 0,
      ),
    };
  }
}
export async function communityPost(path, d, me) {
  requireUser(me);
  if (path === 'notifications') {
    await run('UPDATE notifications SET seen=1 WHERE user_id=?', me.id);
    await run('UPDATE alerts SET seen=1 WHERE user_id=?', me.id);
    return { message: 'Notifications marked as read.' };
  }
  if (path === 'lost-found/returned') {
    const id = v.id(d.id);
    // The private return record documents custody: who received the item and how ownership was checked.
    const note = v.text(d.note, 'Return record', 5, 500);
    const result = await run(
      "UPDATE lost_found SET returned=1,claim_note=?,returned_at=? WHERE id=? AND status='published' AND returned=0 AND (user_id=? OR ?=1)",
      note,
      now(),
      id,
      me.id,
      staff.includes(me.role) ? 1 : 0,
    );
    if (!result.changes)
      throw new Problem('Only the reporter or staff can mark this item returned.', 403);
    return { message: 'Item marked as returned.' };
  }
  if (path === 'item-inquiries') {
    await throttle(`inquiries:${me.id}`, 10, 3600);
    const report = await one(
      "SELECT * FROM lost_found WHERE id=? AND status='published' AND returned=0",
      v.id(d.id),
    );
    if (!report || (await blocked(me.id, report.user_id)))
      throw new Problem('This notice is unavailable.', 404);
    const body = v.text(d.body, 'Message', 10, 1000);
    await run(
      'INSERT INTO item_inquiries(report_id,user_id,body,created) VALUES(?,?,?,?)',
      report.id,
      me.id,
      body,
      now(),
    );
    if (report.user_id !== me.id)
      await alert(
        report.user_id,
        `Someone sent a private message about your notice “${report.item}”.`,
        '/lostfound',
      );
    return { message: 'Message sent privately to the reporter and project team.' };
  }
  if (path === 'item-inquiries/reply') {
    const inquiry = await one(
      'SELECT i.id,i.user_id,l.user_id AS owner,l.item FROM item_inquiries i JOIN lost_found l ON l.id=i.report_id WHERE i.id=?',
      v.id(d.id),
    );
    if (
      !inquiry ||
      !(inquiry.owner === me.id || staff.includes(me.role)) ||
      (await blocked(inquiry.user_id, me.id))
    )
      throw new Problem('You cannot reply to this inquiry.', 403);
    await run(
      'UPDATE item_inquiries SET response=? WHERE id=?',
      v.text(d.response, 'Reply', 3, 1000),
      inquiry.id,
    );
    if (inquiry.user_id !== me.id)
      await alert(
        inquiry.user_id,
        `You have a reply about the notice “${inquiry.item}”.`,
        '/lostfound',
      );
    return { message: 'Private reply saved.' };
  }
  if (path === 'content-reports') {
    await throttle(`content-reports:${me.id}`, 20, 3600);
    const kind = v.choice(d.kind, ['post', 'comment'], 'content type'),
      id = v.id(d.id);
    const target =
      kind === 'post'
        ? await one("SELECT id FROM posts WHERE id=? AND status='published'", id)
        : await publishedComment(id);
    if (!target || target.deleted) throw new Problem('Published content not found.', 404);
    await run(
      'INSERT INTO content_reports(reporter,kind,target,reason,created) VALUES(?,?,?,?,?) ON CONFLICT(reporter,kind,target) DO UPDATE SET reason=excluded.reason,resolved=0',
      me.id,
      kind,
      id,
      v.text(d.reason, 'Reason', 5, 500),
      now(),
    );
    return { message: 'Report sent to the moderation team.' };
  }
  if (path === 'content-reports/resolve') {
    requireUser(me, staff);
    const report = await one('SELECT * FROM content_reports WHERE id=? AND resolved=0', v.id(d.id));
    if (!report) throw new Problem('Report already resolved.', 409);
    const action = v.choice(d.action, ['dismiss', 'remove'], 'decision');
    await transaction(async () => {
      if (action === 'remove')
        await run(
          `UPDATE ${report.kind === 'post' ? 'posts' : 'comments'} SET status='rejected' WHERE id=?`,
          report.target,
        );
      await run(
        'UPDATE content_reports SET resolved=1 WHERE kind=? AND target=?',
        report.kind,
        report.target,
      );
      await run(
        'INSERT INTO audit(actor,action,kind,target,reason,created) VALUES(?,?,?,?,?,?)',
        me.id,
        action,
        report.kind,
        report.target,
        report.reason,
        now(),
      );
    });
    return {
      message: action === 'remove' ? 'Content removed from public view.' : 'Report dismissed.',
    };
  }
}
