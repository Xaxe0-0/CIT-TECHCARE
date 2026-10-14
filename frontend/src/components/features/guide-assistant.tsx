'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  SquaresFour,
  ChatCircleDots,
  BookOpen,
  X,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { getGuideReply, type GuideReply } from '@/utils/guide-assistant';
import { useData } from '@/hooks/use-data';
import { useTechCare } from '@/context/techcare-context';
import type { Guide } from '@shared/types';
import { helpSuggestions } from '@/utils/assistant-knowledge';
import { isFilipino } from '@shared/language.mjs';

type Message = { id: number; role: 'user' | 'assistant'; reply: GuideReply };
// Small models sometimes add markdown despite instructions; show plain text.
const tidy = (text: string) =>
  text
    .replace(/\*\*|__|`/g, '')
    .replace(/^#+\s*/gm, '')
    .trim();
const welcome: Message = {
  id: 0,
  role: 'assistant',
  reply: {
    text: 'Find your way around TechCare or get help with a device. Choose a topic or ask below.',
    choices: helpSuggestions,
  },
};

export function GuideAssistant({ onAsk }: { onAsk: () => void }) {
  const { version, user } = useTechCare();
  const [activated, setActivated] = useState(false);
  const library = useData<{ guides: Guide[] }>(activated ? 'guides' : null, version);
  const guides = library.data?.guides || [];
  const settings = useData<{ assistantAI: boolean }>(activated ? 'settings' : null);
  const aiEnabled = !!settings.data?.assistantAI;
  const streaming = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => streaming.current?.abort(), []);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);
  const topic = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    const messages = log.current?.querySelectorAll<HTMLElement>('.assistant-message');
    const latest = messages?.[messages.length - 1];
    // Keep the beginning of long guide replies visible so no steps are skipped.
    if (open && log.current && latest) log.current.scrollTop = Math.max(0, latest.offsetTop - 16);
  }, [messages, open]);

  function close() {
    streaming.current?.abort();
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus());
  }
  const update = (id: number, reply: GuideReply) =>
    setMessages((previous) => previous.map((m) => (m.id === id ? { ...m, reply } : m)));
  // Questions the built-in help cannot answer go to the server's local AI, streamed token by token.
  async function askAI(id: number, text: string, builtIn: GuideReply) {
    const controller = new AbortController();
    streaming.current = controller;
    setBusy(true);
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TechCare-Request': '1' },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error('unavailable');
      const kind = response.headers.get('X-TechCare-Answer');
      // A non-tech question gets a plain note from the server, not an AI answer or Discussion link.
      if (kind === 'off-topic') {
        update(id, { text: await response.text(), choices: helpSuggestions });
        return;
      }
      const source = kind === 'verified' ? 'verified' : 'generated';
      const filipino = isFilipino(text);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        // Hold back a reply that may be the decline word until it is clearly an answer.
        if (!'ESCALATE'.startsWith(answer.trim().toUpperCase()))
          update(id, { text: tidy(answer), source, filipino, pending: true });
      }
      const say = (english: string, tagalog: string) => (filipino ? tagalog : english);
      update(
        id,
        !/ESCALATE/.test(answer) && answer.trim()
          ? {
              text: tidy(answer),
              source,
              filipino,
              link: {
                href: '/discussion',
                label: say(
                  'Still stuck? Ask in Discussion',
                  'Hindi pa rin ayos? Magtanong sa Discussion',
                ),
              },
            }
          : // A matching guide beats sending the person away.
            builtIn.guide
            ? { ...builtIn, fallback: false }
            : {
                text: say(
                  'I can’t answer that one reliably. You can ask here in Discussion: describe your device and what you already tried, and the community can help.',
                  'Hindi ako sigurado sa tamang sagot diyan. Puwede kang magtanong sa Discussion: ilarawan ang device mo at ang mga nasubukan mo na, at tutulong ang community.',
                ),
                link: {
                  href: '/discussion',
                  label: say('Ask in Discussion', 'Magtanong sa Discussion'),
                },
              },
      );
    } catch {
      if (!controller.signal.aborted) update(id, builtIn);
    } finally {
      if (streaming.current === controller) {
        streaming.current = null;
        setBusy(false);
      }
    }
  }
  function send(value: string, contextTopic?: string) {
    const text = value.trim().slice(0, 400);
    if (!text || busy) return;
    const question: Message = { id: ++sequence.current, role: 'user', reply: { text } };
    const builtIn = getGuideReply(text, contextTopic ?? topic.current, guides, user);
    const ai = builtIn.fallback && aiEnabled;
    const answer: Message = {
      id: ++sequence.current,
      role: 'assistant',
      reply: ai ? { text: '', pending: true } : builtIn,
    };
    topic.current = answer.reply.topic;
    setMessages((previous) => [...previous, question, answer].slice(-41));
    if (ai) void askAI(answer.id, text, builtIn);
    setDraft('');
    input.current?.focus();
  }

  return (
    <div className="guide-assistant">
      {open && (
        <section
          id="guide-assistant-panel"
          className="assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="guide-assistant-title"
          aria-describedby="guide-assistant-description"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className="assistant-header">
            <span className="assistant-symbol">
              <ChatCircleDots size={25} weight="regular" />
            </span>
            <div>
              <h2 id="guide-assistant-title">TechCare assistant</h2>
              <p id="guide-assistant-description">A little guidance, right here.</p>
            </div>
            <button
              className="assistant-icon"
              type="button"
              onClick={close}
              aria-label="Close guide assistant"
            >
              <X size={21} />
            </button>
          </div>
          <div className="assistant-source">
            <BookOpen size={15} />{' '}
            {aiEnabled
              ? 'TechCare help · Local AI on this server · No paid AI service'
              : 'Built-in TechCare help · No AI service'}
          </div>
          <div
            ref={log}
            className="assistant-messages"
            role="log"
            aria-label="Guide assistant conversation"
            aria-live="polite"
            aria-relevant="additions"
            tabIndex={0}
          >
            {messages.map(({ id, role, reply }) => (
              <div
                key={id}
                className={`assistant-message ${role}${id === 0 ? ' assistant-welcome' : ''}`}
              >
                {id === 0 ? (
                  <h3>How can we help?</h3>
                ) : (
                  <span className="assistant-speaker">{role === 'user' ? 'You' : 'TechCare'}</span>
                )}
                {reply.pending && !reply.text ? (
                  <p className="assistant-thinking" role="status">
                    <span className="sr-only">TechCare is thinking</span>
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                  </p>
                ) : (
                  <p className={reply.source ? 'assistant-answer' : undefined}>{reply.text}</p>
                )}
                {reply.source && !reply.pending && (
                  <small className="assistant-answer-source">
                    {reply.source === 'verified'
                      ? reply.filipino
                        ? 'Verified na TechCare fix'
                        : 'Verified TechCare fix'
                      : reply.filipino
                        ? 'Sagot ng AI, nasa English para eksakto ang mga hakbang. Tiyaking tugma ito sa device mo.'
                        : 'AI-generated answer. Check that the steps match your device.'}
                  </small>
                )}
                {reply.steps && (
                  <ol>
                    {reply.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                )}
                {reply.guide && (
                  <>
                    <h3>{reply.guide.title}</h3>
                    <ol>
                      {reply.guide.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <Link href="/guides" className="action-link" onClick={close}>
                      <BookOpen size={18} aria-hidden="true" /> Source: Troubleshooting Guides
                    </Link>
                  </>
                )}
                {reply.choices && (
                  <div className="assistant-choices">
                    {reply.choices.map((choice) => (
                      <button type="button" key={choice} onClick={() => send(choice, reply.topic)}>
                        {choice}
                      </button>
                    ))}
                  </div>
                )}
                {reply.link && (
                  <Link href={reply.link.href} className="action-link" onClick={close}>
                    <SquaresFour size={18} aria-hidden="true" /> {reply.link.label}
                  </Link>
                )}
              </div>
            ))}
            {messages.length === 1 && guides.length > 0 && (
              <details className="assistant-guide-list">
                <summary>
                  <BookOpen size={18} aria-hidden="true" /> Troubleshooting guides
                </summary>
                <div className="assistant-topics" aria-label="Suggested help topics">
                  {guides.slice(0, 4).map((guide) => (
                    <button type="button" key={guide.id} onClick={() => send(guide.title)}>
                      {guide.title}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
          >
            <label className="sr-only" htmlFor="assistant-question">
              Your question
            </label>
            <input
              ref={input}
              id="assistant-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                aiEnabled ? 'Ask about TechCare or a tech problem…' : 'Ask about TechCare…'
              }
              maxLength={400}
              autoComplete="off"
            />
            <button type="submit" disabled={!draft.trim() || busy} aria-label="Send question">
              <ArrowUp size={21} weight="bold" />
            </button>
          </form>
          <p className="assistant-privacy">
            Chat stays in this tab until you refresh. Skip personal details.
          </p>
          <div className="assistant-footer">
            <button
              className="action-link"
              type="button"
              onClick={() => {
                close();
                onAsk();
              }}
            >
              <ChatCircleDots size={18} aria-hidden="true" /> Ask the community
            </button>
            <button
              type="button"
              onClick={() => {
                streaming.current?.abort();
                setMessages([welcome]);
                topic.current = undefined;
                setDraft('');
                input.current?.focus();
              }}
            >
              <ArrowCounterClockwise size={14} /> Clear chat
            </button>
          </div>
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        className="assistant-launcher"
        aria-expanded={open}
        aria-controls={open ? 'guide-assistant-panel' : undefined}
        aria-label={open ? 'Close guide assistant' : 'Open guide assistant'}
        onClick={() => {
          if (open) close();
          else {
            setActivated(true);
            setOpen(true);
          }
        }}
      >
        {open ? <X size={25} /> : <ChatCircleDots size={24} weight="regular" />}
        <span>Need a hand?</span>
      </button>
    </div>
  );
}
