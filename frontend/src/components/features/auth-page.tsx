'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Field, Form, PASSWORD_RULE, Success } from '../ui/ui';
import { api } from '@/services/api';
import { useData } from '@/hooks/use-data';
import { useTechCare } from '@/context/techcare-context';
import { authPaths, type AuthMode } from '@/utils/auth-pages';
import type { Result, FormValues } from '@shared/types';

// The server accepts one new verification code per minute.
const RESEND_SECONDS = 60;

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { setUser, notify, classroom, authDraft, updateAuthDraft } = useTechCare(),
    router = useRouter();
  const { email, code, token, message, sentAt } = authDraft;
  // Set when the server limits sign-ups to school email domains (TECHCARE_EMAIL_DOMAINS).
  const schoolDomains =
    useData<{ emailDomains?: string[] }>(mode === 'register' ? 'settings' : null).data
      ?.emailDomains || [];
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState('');
  const wait = Math.max(0, Math.ceil(RESEND_SECONDS - (now - sentAt) / 1000));
  useEffect(() => {
    if (!wait) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [wait]);
  // Uses the email field at the top of the form, so there is only one place to type it.
  async function resend(button: HTMLButtonElement) {
    const input = button.form?.elements.namedItem('email') as HTMLInputElement | null;
    if (!input?.reportValidity()) return;
    setResending(true);
    setResendError('');
    try {
      const r = await api<Result>('resend-verification', { email: input.value });
      updateAuthDraft({
        email: input.value,
        code: r.development_code || '',
        message: r.message!,
        sentAt: Date.now(),
      });
      setNow(Date.now());
    } catch (error) {
      setResendError((error as Error).message);
    } finally {
      setResending(false);
    }
  }
  const setEmail = (email: string) => updateAuthDraft({ email });
  const setCode = (code: string) => updateAuthDraft({ code });
  const setToken = (token: string) => updateAuthDraft({ token });
  const setMessage = (message: string) => updateAuthDraft({ message });
  const titles = {
    login: 'Welcome back',
    register: 'Join the TechCare community',
    verify: 'Verify Your Email',
    forgot: 'Forgot your password?',
    reset: 'Choose a new password',
  };
  function setMode(next: AuthMode) {
    router.push(authPaths[next]);
  }
  async function submit(values: FormValues) {
    if (values.email) setEmail(values.email);
    const route = {
      login: 'login',
      register: 'register',
      verify: 'verify',
      forgot: 'forgot-password',
      reset: 'reset-password',
    }[mode];
    const r = await api<Result>(route, values);
    if (mode === 'login') {
      setUser(r.user!);
      router.replace('/profile');
      notify('Welcome back. Your dashboard is ready.');
    }
    if (mode === 'register') {
      updateAuthDraft({ code: r.development_code || '', message: r.message!, sentAt: Date.now() });
      setNow(Date.now());
      setMode('verify');
    }
    if (mode === 'verify') {
      setMode('login');
      setCode('');
      setMessage(r.message!);
    }
    if (mode === 'forgot') {
      setMessage(r.message!);
      if (r.development_token) setToken(r.development_token);
    }
    if (mode === 'reset') {
      setUser(null);
      setMode('login');
      setToken('');
      setMessage(r.message!);
    }
  }
  return (
    <section className="inner-page auth-page" aria-labelledby="auth-title">
      <header className="page-heading">
        <div>
          <h1 id="auth-title">{titles[mode]}</h1>
          <p>
            {mode === 'register'
              ? 'A place to ask, learn, and lend a helping hand.'
              : mode === 'verify'
                ? 'Enter the six-digit code sent to your email.'
                : mode === 'login'
                  ? 'Sign in to pick up where you left off.'
                  : 'Securely recover access to your account.'}
          </p>
        </div>
      </header>
      {message && <Success>{message}</Success>}
      {classroom &&
        ((mode === 'verify' && code) || (['forgot', 'reset'].includes(mode) && token)) && (
          <div className="demo-note">
            {mode === 'verify' && code && <strong>Demo code: {code}</strong>}
            {['forgot', 'reset'].includes(mode) && token && (
              <>
                <br />
                Recovery token: <code className="break-token">{token}</code>
              </>
            )}
          </div>
        )}
      <Form
        key={mode}
        submit={
          {
            login: 'Sign In',
            register: 'Create Account',
            verify: 'Verify email',
            forgot: 'Send recovery instructions',
            reset: 'Reset password',
          }[mode]
        }
        onSubmit={submit}
      >
        {mode === 'register' && (
          <>
            <Field
              label="Full name"
              name="full_name"
              min={2}
              max={80}
              autoComplete="name"
              hint="Kept private: only you and TechCare administrators can see it."
            />
            <Field
              label="Username"
              name="name"
              min={3}
              max={20}
              pattern="[A-Za-z0-9_]{3,20}"
              autoComplete="username"
              placeholder="e.g. ana_reyes"
              hint="3 to 20 letters, numbers, or underscores, with no spaces. This is the only name other members see."
            />
          </>
        )}
        {mode !== 'reset' && (
          <Field
            label={
              mode === 'register' && schoolDomains.length ? 'School email address' : 'Email address'
            }
            name="email"
            type="email"
            max={160}
            value={email}
            autoComplete="email"
            placeholder={
              mode === 'register' && schoolDomains.length
                ? `yourname@${schoolDomains[0]}`
                : undefined
            }
            hint={
              mode === 'register' && schoolDomains.length
                ? `Only ${schoolDomains.map((domain) => '@' + domain).join(' or ')} addresses can join TechCare.`
                : undefined
            }
          />
        )}
        {['login', 'register', 'reset'].includes(mode) && (
          <Field
            label={mode === 'reset' ? 'New password' : 'Password'}
            hint={mode === 'login' ? undefined : PASSWORD_RULE}
            name="password"
            type="password"
            min={12}
            max={128}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        )}
        {mode === 'verify' && (
          <>
            <Field
              label="Six-digit code"
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              min={6}
              max={6}
              autoComplete="one-time-code"
            />
            <div className="resend-code">
              <button
                type="button"
                className="text-button"
                disabled={resending || wait > 0}
                onClick={(event) => void resend(event.currentTarget)}
              >
                {resending
                  ? 'Sending…'
                  : wait > 0
                    ? `Send a new code in ${wait}s`
                    : 'Send a new code'}
              </button>
              {resendError && (
                <div className="error-message" role="alert">
                  {resendError}
                </div>
              )}
            </div>
          </>
        )}
        {mode === 'reset' && (
          <Field
            label="Recovery token from your email"
            name="token"
            min={20}
            max={100}
            value={token}
          />
        )}
        {mode === 'register' && (
          <p className="form-hint">
            Your username appears with your public questions, comments, and replies. Please read our{' '}
            <Link href="/privacy">privacy and community guidelines</Link>.
          </p>
        )}
      </Form>
      <div className="auth-links">
        {mode === 'login' ? (
          <>
            <Link className="auth-link" href={authPaths.forgot} onClick={() => setMessage('')}>
              Forgot password?
            </Link>
            <Link className="auth-link" href={authPaths.verify} onClick={() => setMessage('')}>
              Verify a pending account
            </Link>
            <p>
              New here?{' '}
              <Link
                className="auth-link"
                href={authPaths.register}
                onClick={() => setMessage('')}
              >
                Create an account
              </Link>
            </p>
          </>
        ) : (
          <>
            {mode === 'forgot' && (
              <Link className="auth-link" href={authPaths.reset} onClick={() => setMessage('')}>
                Already have a token? Reset your password
              </Link>
            )}
            <p>
              {mode === 'register' ? 'Already have an account? ' : 'Remembered it? '}
              <Link className="auth-link" href={authPaths.login} onClick={() => setMessage('')}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
