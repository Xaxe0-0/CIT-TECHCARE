'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChatCircleDots, ShieldCheck } from '@phosphor-icons/react';
import { categories } from '@/utils/content';
import type { Post, Result } from '@shared/types';
import { QuestionImage, QuestionPhoto } from '../common/question-photo';
import { useTechCare } from '@/context/techcare-context';
import { ErrorState, Field, Form, Loading, Select, TextArea } from '../ui/ui';
import { api } from '@/services/api';
import { useData } from '@/hooks/use-data';

export function AskQuestionPage() {
  const { user, ready, auth, refresh, notify } = useTechCare();
  const router = useRouter();
  const [photoBusy, setPhotoBusy] = useState(false);
  // ?edit=ID reopens the author's own pending or rejected question for resubmission.
  const editId = useSearchParams().get('edit');
  const existing = useData<{ item: Post }>(
    user && editId ? 'my-content?kind=post&id=' + encodeURIComponent(editId) : null,
  );
  const item = existing.data?.item;

  useEffect(() => {
    if (ready && !user) auth();
  }, [auth, ready, user]);

  if (!ready || !user || existing.loading) return <Loading />;
  if (existing.error) return <ErrorState message={existing.error} retry={existing.reload} />;

  return (
    <div className="ask-question-page">
      <Link className="community-link ask-question-back" href="/discussion">
        <ArrowLeft size={18} aria-hidden="true" /> Back to discussions
      </Link>
      <header className="ask-question-heading">
        <span className="community-eyebrow">Community discussion</span>
        <h1>{item ? 'Edit your question' : 'Ask a question'}</h1>
        <p>
          {item
            ? 'Update your question, then resubmit it. A moderator reviews it again before it appears publicly.'
            : 'Explain what happened and what you have already tried. A moderator will review your question before it appears publicly.'}
        </p>
        {item?.status === 'rejected' && item.review_note && (
          <p className="review-note">
            <strong>Moderator note:</strong> {item.review_note}
          </p>
        )}
      </header>
      <div className="ask-question-layout">
        <section className="ask-question-form" aria-label="New question">
          <Form
            key={item?.id ?? 'new'}
            submit={item ? 'Resubmit for review' : 'Submit for review'}
            submitDisabled={photoBusy}
            onSubmit={async (values) => {
              const result = await api<Result>('posts', item ? { ...values, id: item.id } : values);
              refresh();
              notify(result.message!);
              router.push('/profile');
            }}
          >
            <Field
              label="Question title"
              name="title"
              min={8}
              max={120}
              value={item?.title}
              placeholder="What do you need help with?"
            />
            <Select label="Topic" name="category" options={categories} value={item?.category} />
            <TextArea
              label="What happened?"
              name="body"
              min={20}
              max={2000}
              value={item?.body}
              placeholder="Include your device or app, what happened, and what you have tried."
            />
            {item?.photo && (
              <>
                <QuestionImage photo={item.photo} title={item.title} />
                <label className="checkbox-field">
                  <input type="checkbox" name="removePhoto" value="1" /> Remove the current photo
                  (adding a new photo also replaces it)
                </label>
              </>
            )}
            <QuestionPhoto onBusyChange={setPhotoBusy} />
            <p className="form-hint">
              Your display name, approved question, and attached photo will be public. Leave out
              passwords, contact details, faces, and other private information.
            </p>
          </Form>
        </section>
        <aside className="ask-question-notes" aria-labelledby="question-notes-title">
          <ChatCircleDots size={25} aria-hidden="true" />
          <h2 id="question-notes-title">Help others understand the issue</h2>
          <ul>
            <li>Name the device, app, or operating system.</li>
            <li>Include the exact error message when possible.</li>
            <li>Describe the steps you already tried.</li>
          </ul>
          <div>
            <ShieldCheck size={19} aria-hidden="true" />
            <p>Questions and photos are checked before publication.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
