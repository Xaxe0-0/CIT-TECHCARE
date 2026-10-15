'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Image as ImageIcon } from '@phosphor-icons/react';
import { useTechCare } from '@/context/techcare-context';
import { Badge, Empty, Field, Form, PASSWORD_RULE, date } from '../ui/ui';
import { api } from '@/services/api';
import type { OwnReport, Post, Result } from '@shared/types';

const tones: Record<string, string> = { published: 'green', pending: 'gold' };

function DeleteButton({
  label,
  path,
  id,
  done,
}: {
  label: string;
  path: string;
  id: number;
  done: () => void;
}) {
  const { notify } = useTechCare();
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className="text-button danger" onClick={() => setOpen(true)}>
        Delete
      </button>
    );
  return (
    <Form
      submit={'Delete ' + label}
      onSubmit={async () => {
        const r = await api<Result>(path, { id });
        notify(r.message!);
        done();
      }}
    >
      <p>Delete this {label}? This cannot be undone.</p>
      <button type="button" className="text-button" onClick={() => setOpen(false)}>
        Keep it
      </button>
    </Form>
  );
}

function ReviewNote({ status, note }: { status: string; note?: string }) {
  return status === 'rejected' ? (
    <p className="review-note">
      <strong>Not approved.</strong>{' '}
      {note
        ? 'Moderator note: ' + note
        : 'Edit it to address the community guidelines, then resubmit.'}
    </p>
  ) : null;
}

export function MyQuestion({ post: p, changed }: { post: Post; changed: () => void }) {
  return (
    <div className="own-question">
      <div>
        <h3>{p.title}</h3>
        <small>{date(p.created)}</small>
        {p.photo && (
          <a className="action-link" href={p.photo} target="_blank" rel="noopener noreferrer">
            <ImageIcon size={18} aria-hidden="true" /> View attached photo
          </a>
        )}
        <ReviewNote status={p.status} note={p.review_note} />
        <div className="own-actions">
          {p.status === 'published' ? (
            <Link className="text-button" href={'/discussion/' + p.id}>
              View
            </Link>
          ) : (
            <Link className="text-button" href={'/discussion/ask?edit=' + p.id}>
              {p.status === 'rejected' ? 'Edit & resubmit' : 'Edit'}
            </Link>
          )}
          <DeleteButton label="question" path="posts/delete" id={p.id} done={changed} />
        </div>
      </div>
      <Badge tone={tones[p.status] || ''}>{p.status}</Badge>
    </div>
  );
}

export function MyReports({ reports, changed }: { reports: OwnReport[]; changed: () => void }) {
  return (
    <section className="panel">
      <h2>My Lost & Found reports</h2>
      {reports.length ? (
        reports.map((r) => (
          <div className="own-question" key={r.id}>
            <div>
              <h3>
                {r.kind === 'found' ? 'Found' : 'Lost'}: {r.item}
              </h3>
              <small>
                Report #{r.id} · {date(r.created)}
              </small>
              <ReviewNote status={r.status} note={r.review_note} />
              {!!r.returned && r.claim_note && (
                <p className="review-note">
                  <strong>Return record (private):</strong> {r.claim_note}
                </p>
              )}
              <div className="own-actions">
                {['pending', 'rejected'].includes(r.status) && (
                  <Link className="text-button" href={'/lostfound/new?edit=' + r.id}>
                    {r.status === 'rejected' ? 'Edit & resubmit' : 'Edit'}
                  </Link>
                )}
                <DeleteButton label="report" path="lost-found/delete" id={r.id} done={changed} />
              </div>
            </div>
            <Badge tone={r.returned ? 'green' : tones[r.status] || ''}>
              {r.returned ? 'returned' : r.status}
            </Badge>
          </div>
        ))
      ) : (
        <Empty title="No reports yet">Items you report in Lost & Found appear here.</Empty>
      )}
    </section>
  );
}

export function AccountSettings() {
  const { user, setUser, notify, classroom } = useTechCare();
  const [emailStep, setEmailStep] = useState<'request' | 'confirm'>('request');
  const [demoCode, setDemoCode] = useState('');
  return (
    <section className="panel account-settings">
      <h2>Account settings</h2>
      <details>
        <summary>Change password</summary>
        <Form
          submit="Change password"
          reset
          onSubmit={async (values) => {
            const r = await api<Result>('account/password', values);
            notify(r.message!);
          }}
        >
          <Field
            label="Current password"
            name="current"
            type="password"
            max={128}
            autoComplete="current-password"
          />
          <Field
            label="New password"
            hint={PASSWORD_RULE}
            name="password"
            type="password"
            min={12}
            max={128}
            autoComplete="new-password"
          />
          <p className="form-hint">Your other devices will be signed out.</p>
        </Form>
      </details>
      <details>
        <summary>Change email</summary>
        <p className="form-hint">Current email: {user?.email}</p>
        {emailStep === 'request' ? (
          <Form
            key="request"
            submit="Send confirmation code"
            onSubmit={async (values) => {
              const r = await api<Result>('account/email', values);
              setDemoCode(r.development_code || '');
              setEmailStep('confirm');
              notify(r.message!);
            }}
          >
            <Field
              label="New email address"
              name="email"
              type="email"
              max={160}
              autoComplete="email"
            />
            <Field
              label="Current password"
              name="password"
              type="password"
              max={128}
              autoComplete="current-password"
            />
          </Form>
        ) : (
          <Form
            key="confirm"
            submit="Confirm new email"
            onSubmit={async (values) => {
              const r = await api<Result>('account/email/verify', values);
              setUser(r.user!);
              setEmailStep('request');
              setDemoCode('');
              notify(r.message!);
            }}
          >
            {classroom && demoCode && <p className="demo-note">Demo code: {demoCode}</p>}
            <Field
              label="Six-digit code from the new address"
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              min={6}
              max={6}
              autoComplete="one-time-code"
            />
            <button type="button" className="text-button" onClick={() => setEmailStep('request')}>
              Use a different address
            </button>
          </Form>
        )}
      </details>
      <p className="form-hint">
        To close your account, ask a TechCare administrator. They remove your email, profile,
        connections, and private messages; your public questions and comments stay, credited to
        “Deleted member”.
      </p>
    </section>
  );
}
