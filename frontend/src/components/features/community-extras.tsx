'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Bell, ChatsCircle, Flag, Prohibit } from '@phosphor-icons/react';
import { Avatar, Form, TextArea, Loading, ErrorState, Empty, Modal, Success, date } from '../ui/ui';
import { api, ApiError } from '@/services/api';
import { useData } from '@/hooks/use-data';
import { useTechCare } from '@/context/techcare-context';
import type { Message, Result, User } from '@shared/types';

export function ReportContent({ kind, id }: { kind: 'post' | 'comment'; id: number }) {
  const { user, auth, notify } = useTechCare();
  const [open, setOpen] = useState(false);
  return (
    <div className="report-content">
      <button
        className="text-button"
        type="button"
        onClick={() => (user ? setOpen(!open) : auth())}
      >
        Report
      </button>
      {open && (
        <div className="inline-composer">
          <Form
            submit="Send report"
            onSubmit={async (values) => {
              const r = await api<Result>('content-reports', { ...values, kind, id });
              setOpen(false);
              notify(r.message!);
            }}
          >
            <TextArea label="Reason for reporting" name="reason" min={5} max={500} />
            <button className="text-button" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </Form>
        </div>
      )}
    </div>
  );
}
export function ContentReports() {
  const { notify } = useTechCare();
  const result = useData<{
    reports: {
      id: number;
      name: string;
      kind: string;
      body: string;
      reason: string;
      post_id: number;
    }[];
  }>('content-reports');
  if (result.loading) return <Loading />;
  if (result.error) return <ErrorState message={result.error} retry={result.reload} />;
  return result.data?.reports.length ? (
    <>
      {result.data.reports.map((r) => (
        <article className="panel queue-card" key={r.id}>
          <h2>Reported {r.kind}</h2>
          <p>{r.body || 'Content is no longer available.'}</p>
          <p>
            <strong>Reason:</strong> {r.reason}
          </p>
          <small>Reported by {r.name}</small>
          <Form
            submit="Apply decision"
            onSubmit={async (values) => {
              const response = await api<Result>('content-reports/resolve', {
                ...values,
                id: r.id,
              });
              notify(response.message!);
              result.reload();
            }}
          >
            <label className="field">
              <span>Decision</span>
              <select name="action">
                <option value="dismiss">Dismiss report and keep content</option>
                <option value="remove">Remove content from public view</option>
              </select>
            </label>
          </Form>
        </article>
      ))}
    </>
  ) : (
    <Empty title="No content reports">Reports from discussions will appear here.</Empty>
  );
}
type Notification = {
  id: number;
  seen: number;
  name: string;
  post_id: number;
  root_id: number;
  page: number;
  title: string;
  created: number;
};
type Alert = { id: number; text: string; link: string; seen: number; created: number };
// Topbar panels close on navigation or Escape and refresh once a minute while the page is visible.
function useTopbarPanel() {
  const pathname = usePathname();
  const [tick, setTick] = useState(0),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  return { tick, open, setOpen };
}
type InboxEntry = User & {
  unread: number;
  last: { body: string; created: number; mine: boolean } | null;
};
export function Inbox() {
  const { version, refresh, notify } = useTechCare();
  const { tick, open, setOpen } = useTopbarPanel();
  const [person, setPerson] = useState<User | null>(null),
    [busy, setBusy] = useState<number | null>(null);
  const result = useData<{
    requests: User[];
    sent: User[];
    conversations: InboxEntry[];
    unread: number;
  }>('inbox', version + tick);
  const inbox = result.data;
  const count = (inbox?.unread || 0) + (inbox?.requests.length || 0);
  async function respond(u: User, action: 'accept' | 'remove') {
    setBusy(u.id);
    try {
      await api('friend', { user_id: u.id, action });
      refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const requestRow = (u: User, actions: ReactNode) => (
    <div className="inbox-row" key={u.id}>
      <Avatar user={u} />
      <span className="inbox-copy">
        <strong>{u.name}</strong>
      </span>
      {actions}
    </div>
  );
  return (
    <>
      <div className="reply-notifications">
        <button
          className="icon-button"
          aria-label={'Friends and messages' + (count ? ', ' + count + ' new' : '')}
          aria-expanded={open}
          aria-controls="inbox-panel"
          onClick={() => setOpen(!open)}
        >
          <ChatsCircle size={22} />
          {count > 0 && <span className="notification-count">{count}</span>}
        </button>
      </div>
      {open &&
        createPortal(
          <>
            <button
              className="notifications-scrim"
              aria-label="Close friends and messages"
              onClick={() => setOpen(false)}
            />
            <section
              id="inbox-panel"
              className="notifications-panel inbox-panel"
              aria-label="Friends and messages"
            >
              <div className="section-heading">
                <h2>Friends & messages</h2>
                <button className="text-button" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
              {!inbox && result.loading ? (
                <Loading />
              ) : result.error ? (
                <ErrorState message={result.error} retry={result.reload} />
              ) : (
                inbox && (
                  <>
                    <h3>Friend requests</h3>
                    {inbox.requests.length ? (
                      inbox.requests.map((u) =>
                        requestRow(
                          u,
                          <>
                            <button
                              className="button primary small"
                              disabled={busy === u.id}
                              onClick={() => respond(u, 'accept')}
                            >
                              Accept
                            </button>
                            <button
                              className="text-button"
                              disabled={busy === u.id}
                              onClick={() => respond(u, 'remove')}
                            >
                              Decline
                            </button>
                          </>,
                        ),
                      )
                    ) : (
                      <p className="muted">No new friend requests.</p>
                    )}
                    {inbox.sent.length > 0 && (
                      <>
                        <h3>Sent requests</h3>
                        {inbox.sent.map((u) =>
                          requestRow(
                            u,
                            <button
                              className="text-button"
                              disabled={busy === u.id}
                              onClick={() => respond(u, 'remove')}
                            >
                              Cancel
                            </button>,
                          ),
                        )}
                      </>
                    )}
                    <h3>Messages</h3>
                    {inbox.conversations.length ? (
                      inbox.conversations.map((c) => (
                        <button
                          key={c.id}
                          className={'inbox-row' + (c.unread ? ' unread' : '')}
                          onClick={() => {
                            setOpen(false);
                            setPerson(c);
                          }}
                        >
                          <Avatar user={c} />
                          <span className="inbox-copy">
                            <strong>{c.name}</strong>
                            <small>
                              {c.last
                                ? (c.last.mine ? 'You: ' : '') + c.last.body
                                : 'No messages yet. Say hello.'}
                            </small>
                          </span>
                          {c.unread > 0 && (
                            <span className="inbox-unread" aria-label={c.unread + ' unread'}>
                              {c.unread}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="muted">
                        Accepted friends appear here. <Link href="/members">Find people</Link>
                      </p>
                    )}
                  </>
                )
              )}
            </section>
          </>,
          document.body,
        )}
      {person && (
        <Conversation
          person={person}
          close={() => {
            setPerson(null);
            result.reload();
          }}
        />
      )}
    </>
  );
}
export function ReplyNotifications() {
  const { version } = useTechCare();
  const { tick, open, setOpen } = useTopbarPanel();
  const result = useData<{ notifications: Notification[]; alerts: Alert[] }>(
    'notifications',
    version + tick,
  );
  // Comment replies and other alerts (decisions, friends, item messages) share one list.
  const items = [
    ...(result.data?.notifications || []).map((n) => ({
      key: 'reply-' + n.id,
      seen: n.seen,
      created: n.created,
      href: '/discussion/' + n.post_id + '?page=' + n.page + '&root=' + n.root_id + '#comments',
      content: (
        <>
          <strong>{n.name}</strong> replied in <span>{n.title}</span>
        </>
      ),
    })),
    ...(result.data?.alerts || []).map((a) => ({
      key: 'alert-' + a.id,
      seen: a.seen,
      created: a.created,
      href: a.link,
      content: <>{a.text}</>,
    })),
  ].sort((a, b) => b.created - a.created);
  const unread = items.filter((n) => !n.seen).length;
  return (
    <>
      <div className="reply-notifications">
        <button
          className="icon-button"
          aria-label={'Notifications' + (unread ? ', ' + unread + ' unread' : '')}
          aria-expanded={open}
          aria-controls="reply-notifications-panel"
          onClick={() => setOpen(!open)}
        >
          <Bell size={22} />
          {unread > 0 && <span className="notification-count">{unread}</span>}
        </button>
      </div>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <button
              className="notifications-scrim"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            />
            <section
              id="reply-notifications-panel"
              className="notifications-panel"
              aria-label="Notifications"
            >
              <div className="section-heading">
                <h2>Notifications</h2>
                <button className="text-button" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
              {result.loading ? (
                <Loading />
              ) : result.error ? (
                <ErrorState message={result.error} retry={result.reload} />
              ) : items.length ? (
                <>
                  <Form
                    submit="Mark all as read"
                    onSubmit={async () => {
                      await api('notifications', {});
                      result.reload();
                    }}
                  >
                    <span className="form-hint">
                      Replies, review decisions, friends, and item messages appear here.
                    </span>
                  </Form>
                  {items.map((n) =>
                    n.href ? (
                      <Link
                        key={n.key}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className={n.seen ? '' : 'unread'}
                      >
                        {n.content}
                      </Link>
                    ) : (
                      <p key={n.key} className={'notification-item' + (n.seen ? '' : ' unread')}>
                        {n.content}
                      </p>
                    ),
                  )}
                </>
              ) : (
                <p>
                  Nothing new. We’ll let you know about replies, review decisions, and friend
                  activity.
                </p>
              )}
            </section>
          </>,
          document.body,
        )}
    </>
  );
}

export function ItemInquiries() {
  const { version } = useTechCare();
  const result = useData<{
    inquiries: {
      id: number;
      body: string;
      report_id: number;
      name: string;
      item: string;
      response: string;
      canReply: number;
    }[];
  }>('item-inquiries', version);
  return (
    <details className="item-inquiries">
      <summary>Private item messages</summary>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.reload} />
      ) : result.data?.inquiries.length ? (
        result.data.inquiries.map((i) => (
          <article key={i.id}>
            <h3>
              #{i.report_id} · {i.item}
            </h3>
            <p>{i.body}</p>
            {i.response && (
              <blockquote>
                <strong>Reply from the reporter or team</strong>
                <p>{i.response}</p>
              </blockquote>
            )}
            {!!i.canReply && (
              <Form
                submit="Send private reply"
                onSubmit={async (values) => {
                  await api('item-inquiries/reply', { ...values, id: i.id });
                  result.reload();
                }}
              >
                <TextArea
                  label="Private reply"
                  name="response"
                  min={3}
                  max={1000}
                  value={i.response}
                />
              </Form>
            )}
            <small>From {i.name} · Visible only to the sender, reporter, and project team.</small>
          </article>
        ))
      ) : (
        <p>No messages about your items yet.</p>
      )}
    </details>
  );
}

export function Conversation({ person, close }: { person: User; close: () => void }) {
  const { user, version, notify, refresh } = useTechCare(),
    [before, setBefore] = useState<number | null>(null),
    [report, setReport] = useState<Message | null>(null),
    [reportNotice, setReportNotice] = useState(''),
    [accessError, setAccessError] = useState('');
  const result = useData<{ messages: Message[]; hasMore: boolean }>(
    `messages?user=${person.id}${before ? `&before=${before}` : ''}`,
    version,
  );
  // Recheck friendship on focus and periodically while a conversation is open.
  useEffect(() => {
    const controller = new AbortController();
    async function checkAccess() {
      try {
        await api(`messages/access?user=${person.id}`, undefined, controller.signal);
      } catch (error) {
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          setAccessError(error.message);
          setReport(null);
          setReportNotice('');
        }
      }
    }
    const timer = setInterval(checkAccess, 15000);
    window.addEventListener('focus', checkAccess);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', checkAccess);
      controller.abort();
    };
  }, [person.id]);
  return (
    <Modal
      title={`Message ${person.name}`}
      description="Messages are available only while you are accepted friends. This is not a real-time chat."
      onClose={close}
      wide
    >
      {reportNotice && <Success>{reportNotice}</Success>}
      {accessError ? (
        <div className="error-message" role="alert">
          {accessError}
        </div>
      ) : result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.reload} />
      ) : (
        <>
          <div className="message-history">
            {result.data?.hasMore && (
              <button
                className="text-button"
                onClick={() => setBefore(result.data!.messages[0].id)}
              >
                Earlier messages
              </button>
            )}
            {before && (
              <button className="text-button" onClick={() => setBefore(null)}>
                Latest messages
              </button>
            )}
            {result.data?.messages.length ? (
              result.data.messages.map((m) => (
                <div
                  className={`message ${m.sender === user?.id ? 'sent' : 'received'}`}
                  key={m.id}
                >
                  <p>{m.body}</p>
                  <small>{date(m.created)}</small>
                  {m.sender !== user?.id && (
                    <button
                      className="icon-button"
                      aria-label="Report this message"
                      onClick={() => setReport(m)}
                    >
                      <Flag size={14} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <Empty title="Say hello">A helpful conversation starts here.</Empty>
            )}
          </div>
          <Form
            submit="Send message"
            reset
            onSubmit={async (values) => {
              await api('messages', { ...values, user_id: person.id });
              setBefore(null);
              result.reload();
            }}
          >
            <TextArea
              label="New message"
              name="body"
              min={1}
              max={1000}
              placeholder="Write your message…"
            />
          </Form>
        </>
      )}
      <button
        className="text-button danger"
        onClick={async () => {
          try {
            await api('block', { user_id: person.id, action: 'block' });
            refresh();
            close();
            notify('Member blocked. Messaging and friendship access have been revoked.');
          } catch (e) {
            notify((e as Error).message);
          }
        }}
      >
        <Prohibit size={16} /> Block member
      </button>
      {report && (
        <div className="report-form">
          <h3>Report this message</h3>
          <p>Staff will see only the reported message and your reason.</p>
          <Form
            submit="Send report"
            onSubmit={async (values) => {
              const r = await api<Result>('message-report', { ...values, message_id: report.id });
              setReport(null);
              setReportNotice(r.message!);
            }}
          >
            <TextArea label="Reason for reporting" name="reason" min={10} max={500} />
          </Form>
          <button className="text-button" onClick={() => setReport(null)}>
            Cancel report
          </button>
        </div>
      )}
    </Modal>
  );
}
