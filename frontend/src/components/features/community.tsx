'use client';
import { useState, useEffect } from 'react';
import { ChatCircleDots, SignIn, UserPlus, Users, LockKey } from '@phosphor-icons/react';
import { useTechCare } from '@/context/techcare-context';
import {
  Avatar,
  Badge,
  Empty,
  ErrorState,
  Loading,
  PageHeading,
  Pagination,
  Search,
} from '../ui/ui';
import { api } from '@/services/api';
import { useData } from '@/hooks/use-data';
import { Conversation } from './community-extras';
import type { User } from '@shared/types';

export { Discussion } from './discussion';
export function Members() {
  const { user, version, refresh, auth, notify } = useTechCare(),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [conversation, setConversation] = useState<User | null>(null),
    [busy, setBusy] = useState<number | null>(null),
    // The pressed action (e.g. 'follow', 'friend:accept'), so only that button shows a spinner.
    [pending, setPending] = useState('');
  const result = useData<{ members: User[]; hasMore: boolean }>(
    `members?q=${encodeURIComponent(query)}&page=${page}`,
    version,
  );
  async function action(path: string, u: User, mode?: string) {
    if (busy !== null) return;
    setBusy(u.id);
    setPending(mode ? `${path}:${mode}` : path);
    try {
      await api(path, { user_id: u.id, action: mode });
      refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  useEffect(() => {
    if (!user) setConversation(null);
  }, [user]);
  return (
    <>
      <PageHeading
        title="Your community, connected"
        description="Meet the people learning, sharing, and helping around you."
      />
      <Search
        value={query}
        placeholder="Find a community member…"
        onSearch={(q) => {
          setQuery(q);
          setPage(1);
        }}
      />
      <div className="callout compact">
        <Users size={21} />
        <p>
          Following keeps someone in your dashboard. Accepted friends can see private profiles and
          message each other.
        </p>
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState message={result.error} retry={result.reload} />
      ) : result.data?.members.length ? (
        <div className="member-grid">
          {result.data.members.map((u) => (
            <article className="member-card" key={u.id}>
              <div className="member-heading">
                <Avatar user={u} large />
                <div>
                  <h2>{u.name}</h2>
                  {u.role !== 'member' && (
                    <Badge tone="role">{u.role === 'admin' ? 'Administrator' : 'Moderator'}</Badge>
                  )}
                </div>
              </div>
              <p>
                {u.visibility === 'private' && u.friendship !== 'friends' && user?.id !== u.id ? (
                  <span>
                    <LockKey size={14} /> Private profile
                  </span>
                ) : (
                  u.bio || 'Part of the TechCare community.'
                )}
              </p>
              {user && u.id !== user.id ? (
                <div className="member-actions">
                  <button
                    disabled={busy === u.id}
                    className="button secondary small"
                    aria-pressed={!!u.following}
                    aria-busy={busy === u.id && pending === 'follow'}
                    onClick={() => action('follow', u)}
                  >
                    {u.following ? 'Unfollow' : 'Follow'}
                  </button>
                  {!u.blocked && (
                    <>
                      <button
                        disabled={busy === u.id}
                        // Inviting actions are primary; pending or undo actions stay secondary.
                        className={`button small ${['none', 'incoming'].includes(u.friendship || 'none') ? 'primary' : 'secondary'}`}
                        aria-busy={
                          busy === u.id &&
                          pending ===
                            `friend:${u.friendship === 'incoming' ? 'accept' : (u.friendship || 'none') === 'none' ? 'request' : 'remove'}`
                        }
                        onClick={() =>
                          action(
                            'friend',
                            u,
                            u.friendship === 'incoming'
                              ? 'accept'
                              : u.friendship === 'none'
                                ? 'request'
                                : 'remove',
                          )
                        }
                      >
                        <UserPlus size={16} />
                        {
                          {
                            none: 'Add friend',
                            incoming: 'Accept request',
                            outgoing: 'Cancel request',
                            friends: 'Remove friend',
                          }[u.friendship || 'none']
                        }
                      </button>
                      {u.friendship === 'incoming' && (
                        <button
                          className="button secondary small"
                          aria-busy={busy === u.id && pending === 'friend:remove'}
                          onClick={() => action('friend', u, 'remove')}
                        >
                          Decline
                        </button>
                      )}
                      {u.friendship === 'friends' && (
                        <button
                          className="button primary small member-message"
                          onClick={() => setConversation(u)}
                        >
                          <ChatCircleDots size={16} />
                          Message
                        </button>
                      )}
                    </>
                  )}
                  <button
                    disabled={busy === u.id}
                    className="member-block"
                    aria-busy={busy === u.id && pending.startsWith('block')}
                    onClick={() => action('block', u, u.blocked ? 'unblock' : 'block')}
                  >
                    {u.blocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              ) : !user ? (
                <button className="action-link" onClick={() => auth()}>
                  <SignIn size={18} aria-hidden="true" /> Sign in to connect
                </button>
              ) : (
                <Badge>Your profile</Badge>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No members found">
          {query ? 'Try a different name.' : 'Verified community members will appear here.'}
        </Empty>
      )}
      <Pagination page={page} hasMore={result.data?.hasMore || false} onPage={setPage} />
      {conversation && user && (
        <Conversation person={conversation} close={() => setConversation(null)} />
      )}
    </>
  );
}
