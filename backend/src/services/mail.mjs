import nodemailer from 'nodemailer';
import { join } from 'node:path';
import { Problem } from '../middleware/auth.mjs';

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// The favicon travels inside the email (cid), so it shows without hosting or remote images.
const logo = {
  filename: 'techcare.png',
  // Same lookup as the favicon route; bundling makes import.meta.url unreliable here.
  path: join(
    process.env.TECHCARE_PROJECT_ROOT || process.cwd(),
    'frontend',
    'public',
    'static',
    'techcare-icon.png',
  ),
  cid: 'techcare-logo',
};

// Branded email for a one-time code: centred logo, short message, and the code in large type.
// The plain-text part keeps the same wording for mail apps that block HTML.
// action: optional { href, label } button, e.g. a link that opens the verify page already filled in.
export function codeEmail({ subject, heading, intro, code, label, note, action }) {
  const long = code.length > 8;
  // Email apps block scripts, so there is no copy button: the code selects as one piece with a
  // single tap or double-click, and the action button skips copying altogether.
  const button = action
    ? `<tr><td align="center" style="padding:22px 32px 0;"><a href="${escape(action.href)}" style="display:inline-block;background:#0a68fc;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">${escape(action.label)}</a></td></tr>
<tr><td align="center" style="padding:10px 32px 0;font-size:12px;line-height:1.5;color:#8a8780;">The button opens TechCare with your email and code already filled in.</td></tr>`
    : '';
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#eef4ff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4ff;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#141413;">
<tr><td style="height:8px;background-color:#0a68fc;background-image:linear-gradient(90deg,#0a68fc,#00cacc);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:32px 32px 6px;"><img src="cid:${logo.cid}" width="64" height="64" alt="TechCare" style="display:block;border:0;outline:none;"></td></tr>
<tr><td align="center" style="padding:0 32px;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Tech<span style="color:#00797b;">Care</span></td></tr>
<tr><td align="center" style="padding:26px 32px 8px;font-size:21px;font-weight:700;">${escape(heading)}</td></tr>
<tr><td align="center" style="padding:0 32px 22px;font-size:15px;line-height:1.6;color:#3d3d3a;">${escape(intro)}</td></tr>
<tr><td align="center" style="padding:0 28px;">
<div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#65635d;padding-bottom:8px;">${escape(label)}</div>
<div style="background:#edf3ff;border:2px dashed #0a68fc;border-radius:16px;padding:${long ? '18px 14px' : '22px 8px 22px 22px'};font-family:'Courier New',Consolas,monospace;font-weight:800;color:#0a68fc;user-select:all;-webkit-user-select:all;${long ? 'font-size:18px;letter-spacing:1px;word-break:break-all;' : 'font-size:52px;letter-spacing:14px;line-height:1;'}">${escape(code)}</div>
<div style="padding-top:8px;font-size:12px;color:#8a8780;">Tap or double-click the ${long ? 'token' : 'code'} to select it, then copy.</div>
</td></tr>
${button}
<tr><td align="center" style="padding:16px 32px 0;font-size:14px;color:#3d3d3a;">Expires in <strong>15 minutes</strong>.</td></tr>
<tr><td align="center" style="padding:24px 32px 30px;font-size:12px;line-height:1.6;color:#8a8780;">${escape(note)} Never share this ${long ? 'token' : 'code'}: TechCare staff will never ask for it.</td></tr>
</table>
<div style="padding-top:16px;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#8a8780;">TechCare &middot; A community service learning project</div>
</td></tr></table>
</body></html>`;
  return {
    subject,
    html,
    text: `${intro} Your ${long ? 'token' : 'code'} is ${code}. It expires in 15 minutes.${action ? ` ${action.label}: ${action.href}` : ''} ${note}`,
  };
}

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

// message: { subject, text, html? } — HTML messages carry the embedded logo.
export async function sendMail(to, message, demo) {
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
    await transport.sendMail({
      from: process.env.TECHCARE_SMTP_FROM,
      to,
      ...message,
      ...(message.html ? { attachments: [logo] } : {}),
    });
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
