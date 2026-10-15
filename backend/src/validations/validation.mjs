import { Problem } from '../middleware/auth.mjs';
import { Resolver } from 'node:dns/promises';
export const categories = [
  'General',
  'Hardware',
  'Operating system',
  'Connectivity',
  'Online safety',
];
export function text(value, label, min, max) {
  if (typeof value !== 'string') throw new Problem(`${label} is required.`);
  const v = value.trim();
  if (v.length < min || v.length > max)
    throw new Problem(`${label} must be ${min} to ${max} characters.`);
  return v;
}
export function choice(value, choices, label) {
  if (!choices.includes(value)) throw new Problem(`Choose a valid ${label}.`);
  return value;
}
export function id(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new Problem('Invalid record.');
  return n;
}
export function email(value) {
  const v = text(value, 'Email', 3, 160).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw new Problem('Enter a valid email address.');
  return v;
}
const resolver = new Resolver({ timeout: 3000, tries: 2 });
// Rejects addresses whose domain cannot receive mail: no MX record (made-up domains such as
// "dsadasdasd.com") or a "null MX" that refuses all mail. A DNS outage lets the address
// through, so sign-up never depends on the lookup; the emailed code still has to arrive.
export async function deliverable(email) {
  const domain = email.slice(email.lastIndexOf('@') + 1);
  try {
    const records = await resolver.resolveMx(domain);
    if (records.some((record) => record.exchange && record.exchange !== '.')) return email;
  } catch (error) {
    if (!['ENOTFOUND', 'ENODATA'].includes(error.code)) return email;
  }
  throw new Problem('This email address cannot receive mail. Check it for typos.');
}
// New or changed passwords. Sign-in keeps using password() so older passwords still work.
export function newPassword(value) {
  const v = password(value);
  const missing = [
    [/[a-z]/, 'a lowercase letter'],
    [/[A-Z]/, 'an uppercase letter'],
    [/[0-9]/, 'a number'],
    [/[^A-Za-z0-9]/, 'a symbol such as ! or -'],
  ]
    .filter(([pattern]) => !pattern.test(v))
    .map(([, label]) => label);
  if (missing.length)
    throw new Problem(
      `Make your password stronger: add ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`,
    );
  return v;
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128)
    throw new Problem('Use a password of 12 to 128 characters.');
  return value;
}
export function httpsURL(value) {
  const v = text(value, 'Link', 8, 1000);
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) throw 0;
  } catch {
    throw new Problem('Enter a direct HTTPS link without embedded credentials.');
  }
  return v;
}
export function page(url) {
  const n = Number(url.searchParams.get('page') || 1);
  if (!Number.isInteger(n) || n < 1 || n > 100000) throw new Problem('Invalid page.');
  // offset is inlined into SQL: mysql2 binds numbers as DOUBLE, which MySQL 8.0.22+ rejects for OFFSET.
  return { number: n, offset: (n - 1) * 20 };
}
export function publicDescription(value) {
  const v = text(value, 'Public description', 10, 500);
  if (
    /[^\s@]+@[^\s@]+\.[^\s@]+|(?:\+?\d[\s()-]*){10,}|(?:password|serial\s*(?:number|no\.?))\s*[:=]/i.test(
      v,
    )
  )
    throw new Problem(
      'Remove contact details, passwords, and serial numbers from the public description.',
    );
  return v;
}
