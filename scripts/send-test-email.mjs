// Sends one test email with the TECHCARE_SMTP_* settings: npm run test:email -- you@example.com
import nextEnv from '@next/env';
import { fileURLToPath } from 'node:url';

nextEnv.loadEnvConfig(fileURLToPath(new URL('../', import.meta.url)), true);
const to = process.argv[2];
if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
  console.error('Usage: npm run test:email -- you@example.com');
  process.exit(1);
}
if (!process.env.TECHCARE_SMTP_HOST || !process.env.TECHCARE_SMTP_FROM) {
  console.error('Set TECHCARE_SMTP_HOST and TECHCARE_SMTP_FROM in .env.local first.');
  process.exit(1);
}
const { sendMail } = await import('../backend/src/services/mail.mjs');
try {
  await sendMail(
    to,
    'TechCare test email',
    'This test confirms TechCare can send verification codes.',
    false,
  );
  console.log(
    `Sent to ${to} through ${process.env.TECHCARE_SMTP_HOST}:${process.env.TECHCARE_SMTP_PORT || 587}. Check the inbox and spam folder.`,
  );
} catch {
  console.error(
    'Sending failed; the reason is logged above. Check host, port, user, and password.',
  );
  process.exitCode = 1;
}
