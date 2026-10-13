import nodemailer from 'nodemailer';
import { Problem } from '../middleware/auth.mjs';

export function assertMailConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!process.env.TECHCARE_SMTP_HOST || !process.env.TECHCARE_SMTP_FROM)
    throw new Error(
      'Production email verification requires TECHCARE_SMTP_HOST and TECHCARE_SMTP_FROM.',
    );
  const port = Number(process.env.TECHCARE_SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('TECHCARE_SMTP_PORT must be a valid TCP port.');
  if (Boolean(process.env.TECHCARE_SMTP_USER) !== Boolean(process.env.TECHCARE_SMTP_PASSWORD))
    throw new Error('Configure both TECHCARE_SMTP_USER and TECHCARE_SMTP_PASSWORD, or neither.');
}

export async function sendMail(to, subject, text, demo) {
  assertMailConfig();
  if (demo) return;
  if (!process.env.TECHCARE_SMTP_HOST || !process.env.TECHCARE_SMTP_FROM)
    throw new Problem('Email delivery is not configured. Please contact the project team.', 503);
  const port = Number(process.env.TECHCARE_SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.TECHCARE_SMTP_HOST,
    port,
    // Port 465 is TLS from the first byte; other ports must upgrade with STARTTLS.
    secure: port === 465,
    requireTLS: port !== 465,
    // Some providers (Titan) take about 15 seconds to send their greeting.
    connectionTimeout: 20000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    auth: process.env.TECHCARE_SMTP_USER
      ? { user: process.env.TECHCARE_SMTP_USER, pass: process.env.TECHCARE_SMTP_PASSWORD }
      : undefined,
  });
  try {
    await transport.sendMail({ from: process.env.TECHCARE_SMTP_FROM, to, subject, text });
  } catch (error) {
    // Operators need the reason (bad login, wrong port, unknown host); it never includes the password.
    console.error(
      'TechCare email delivery failed:',
      error?.code || error?.name,
      error?.response || '',
    );
    throw new Problem('Email could not be delivered. Please try again later.', 503);
  } finally {
    transport.close();
  }
}
