'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTechCare } from '@/context/techcare-context';
import { Form, Modal, StarRating, TextArea } from '../ui/ui';
import { api } from '@/services/api';
import type { Result } from '@shared/types';

// Browsers do not allow custom dialogs while a tab closes, so this asks when the pointer heads
// for the tab bar or close button (exit intent). It needs a mouse, so it does not appear on touch.
const MIN_VISIT_MS = 30_000;
const QUIET_DAYS = 30;
const SESSION_KEY = 'techcare-exit-feedback-shown';
const QUIET_KEY = 'techcare-exit-feedback';

function shouldAsk() {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    const last = Number(localStorage.getItem(QUIET_KEY) || 0);
    return Date.now() - last > QUIET_DAYS * 86_400_000;
  } catch {
    return false;
  }
}
function remember(forDays: boolean) {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
    if (forDays) localStorage.setItem(QUIET_KEY, String(Date.now()));
  } catch {
    /* Storage can be blocked; the prompt then simply may appear again. */
  }
}

export function ExitFeedback() {
  const { notify } = useTechCare();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  useEffect(() => {
    const arrived = Date.now();
    const leaving = (event: MouseEvent) => {
      // Leaving the window through its top edge, toward the tabs or the close button.
      if (event.relatedTarget || event.clientY > 0) return;
      if (Date.now() - arrived < MIN_VISIT_MS || !shouldAsk()) return;
      if (pathname === '/feedback' || document.querySelector('[role="dialog"]')) return;
      remember(false);
      setOpen(true);
    };
    document.addEventListener('mouseout', leaving);
    return () => document.removeEventListener('mouseout', leaving);
  }, [pathname]);
  if (!open) return null;
  const close = () => {
    remember(true);
    setOpen(false);
  };
  return (
    <Modal
      title="Before you go…"
      description="How was TechCare today? Your rating goes privately to the project team."
      onClose={close}
    >
      <Form
        submit="Send rating"
        submitDisabled={!rating}
        cancel={{ label: 'Not now', onClick: close }}
        onSubmit={async (values) => {
          const r = await api<Result>('feedback', { rating, message: values.message });
          close();
          notify(r.message!);
        }}
      >
        <StarRating value={rating} onChange={setRating} legend="Rate your visit" size={34} />
        <TextArea
          label="Anything we could do better?"
          name="message"
          min={10}
          max={1000}
          required={false}
          placeholder="A sentence or two helps the team improve."
        />
      </Form>
    </Modal>
  );
}
