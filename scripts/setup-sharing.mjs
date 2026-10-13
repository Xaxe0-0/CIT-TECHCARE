// Prepares .env.production.local for sharing this computer's TechCare online through a
// Cloudflare Tunnel: public HTTPS origin, secure cookies, emailed codes, a JWT secret, and a
// least-privilege database user. Run by setup option 3; an existing file is never overwritten.
import nextEnv from '@next/env';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = new URL('../.env.production.local', import.meta.url);
nextEnv.loadEnvConfig(root, true);
const env = process.env;
const publicUrl = new URL(
  process.argv[2] || env.TECHCARE_PUBLIC_URL || 'https://technologycares.tech',
);

if (existsSync(target)) {
  console.log('Using the existing .env.production.local.');
} else {
  if (!['127.0.0.1', 'localhost', '::1'].includes(env.TECHCARE_DB_HOST)) {
    console.error(
      'Sharing from this computer expects MySQL on this computer (TECHCARE_DB_HOST=127.0.0.1).',
    );
    process.exit(1);
  }
  const mysql = await import('mysql2/promise');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.TECHCARE_DB_HOST,
      port: Number(env.TECHCARE_DB_PORT || 3306),
      user: env.TECHCARE_DB_USER,
      password: env.TECHCARE_DB_PASSWORD || '',
    });
  } catch (error) {
    console.error(
      `Could not connect to MySQL (${error.code || error.message}). Start it and try again.`,
    );
    process.exit(1);
  }
  // The public site gets its own account that can read and write rows but not change the schema.
  const password = randomBytes(24).toString('base64url');
  const name = env.TECHCARE_DB_NAME;
  if (!/^[A-Za-z0-9_]{1,64}$/.test(name)) throw new Error('Unexpected TECHCARE_DB_NAME.');
  for (const host of ['localhost', '127.0.0.1', '::1']) {
    await connection.query('CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?', [
      'techcare_app',
      host,
      password,
    ]);
    await connection.query('ALTER USER ?@? IDENTIFIED BY ?', ['techcare_app', host, password]);
    await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${name}\`.* TO ?@?`, [
      'techcare_app',
      host,
    ]);
  }
  await connection.end();
  const b2 = ['BUCKET', 'ENDPOINT', 'REGION', 'KEY_ID', 'APPLICATION_KEY'];
  const hasB2 = b2.every((key) => env[`TECHCARE_B2_${key}`]);
  await writeFile(
    target,
    [
      '# Created by setup option 3 for sharing online. Loaded only by the production server.',
      '# Keep private: it holds secrets. Settings not listed here come from .env.local.',
      `TECHCARE_ORIGIN=${publicUrl.origin}`,
      'TECHCARE_SECURE_COOKIES=1',
      'TECHCARE_DEV_VERIFY=0',
      `TECHCARE_JWT_SECRET=${randomBytes(32).toString('hex')}`,
      'TECHCARE_DB_USER=techcare_app',
      `TECHCARE_DB_PASSWORD=${password}`,
      // Without B2 details, uploads stay in this computer's data folder.
      ...(hasB2
        ? [
            '# Uploads are stored in a private Backblaze B2 bucket.',
            ...b2.map((key) => `TECHCARE_B2_${key}=${env[`TECHCARE_B2_${key}`]}`),
          ]
        : [
            '# Uploads stay in the data folder on this computer. To use Backblaze B2 instead, set',
            '# TECHCARE_LOCAL_STORAGE=0 and add the TECHCARE_B2_* settings.',
            'TECHCARE_LOCAL_STORAGE=1',
          ]),
      '',
    ].join('\n'),
  );
  console.log('Created .env.production.local and the techcare_app database user.');
  if (!hasB2)
    console.log('Uploads will be stored on this computer (no Backblaze B2 settings found).');
}
nextEnv.loadEnvConfig(root, false, { info() {}, error: console.error }, true);
const missing = [
  ...(process.env.TECHCARE_LOCAL_STORAGE === '1'
    ? []
    : ['BUCKET', 'ENDPOINT', 'REGION', 'KEY_ID', 'APPLICATION_KEY'].map(
        (key) => `TECHCARE_B2_${key}`,
      )),
  'TECHCARE_SMTP_HOST',
  'TECHCARE_SMTP_FROM',
].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `Sharing needs these settings in .env.production.local or .env.local: ${missing.join(', ')}.`,
  );
  process.exit(1);
}
console.log(`Ready to share at ${new URL(process.env.TECHCARE_ORIGIN).origin}`);
