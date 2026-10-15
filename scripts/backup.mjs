// Backs up TechCare: a full MySQL dump plus the uploaded files, into a dated folder.
//
//   npm run backup
//
// Settings (in .env.local):
//   TECHCARE_BACKUP_DIR       where backups go (default: a TechCare-Backups folder next to the project)
//   TECHCARE_BACKUP_COPY_DIR  optional second location for redundancy, e.g. a OneDrive folder so a
//                             copy also reaches the cloud
//   TECHCARE_BACKUP_KEEP      how many backups to keep in each location (default 14)
//   TECHCARE_MYSQLDUMP        path to mysqldump if it is not XAMPP's or on PATH
//
// Restore (stop TechCare first):
//   mysql -u root < <backup>/techcare.sql        recreates the database from the dump
//   copy <backup>/media/* into data/media/       puts uploaded files back
import nextEnv from '@next/env';
import { execFile } from 'node:child_process';
import { existsSync, createWriteStream } from 'node:fs';
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
nextEnv.loadEnvConfig(root, true);
const env = process.env;
const name = env.TECHCARE_DB_NAME;
if (!env.TECHCARE_DB_HOST || !name || !env.TECHCARE_DB_USER) {
  console.error(
    'Set TECHCARE_DB_HOST, TECHCARE_DB_NAME, and TECHCARE_DB_USER in .env.local first.',
  );
  process.exit(1);
}
const keep = Math.max(1, Number(env.TECHCARE_BACKUP_KEEP) || 14);
const primary = resolve(root, env.TECHCARE_BACKUP_DIR || '../TechCare-Backups');
const copy = env.TECHCARE_BACKUP_COPY_DIR ? resolve(root, env.TECHCARE_BACKUP_COPY_DIR) : '';
const mysqldump =
  env.TECHCARE_MYSQLDUMP ||
  (existsSync('C:/xampp/mysql/bin/mysqldump.exe')
    ? 'C:/xampp/mysql/bin/mysqldump.exe'
    : 'mysqldump');
// Backup folders are named by local time so they sort oldest first: 2026-10-15_21-30-05.
const now = new Date(),
  two = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}_${two(now.getHours())}-${two(now.getMinutes())}-${two(now.getSeconds())}`;
const pattern = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;

async function dump(file) {
  const out = createWriteStream(file);
  const written = new Promise((done, fail) => {
    out.on('finish', done);
    out.on('error', fail);
  });
  await new Promise((done, fail) => {
    const child = execFile(
      mysqldump,
      [
        '--host=' + env.TECHCARE_DB_HOST,
        '--port=' + (env.TECHCARE_DB_PORT || 3306),
        '--user=' + env.TECHCARE_DB_USER,
        '--single-transaction',
        '--routines',
        '--triggers',
        '--databases',
        name,
      ],
      // The password goes through the environment, never the command line.
      { env: { ...env, MYSQL_PWD: env.TECHCARE_DB_PASSWORD || '' }, maxBuffer: 1 << 30 },
      (error, _stdout, stderr) => (error ? fail(new Error(stderr || error.message)) : done()),
    );
    child.stdout.pipe(out);
  });
  await written;
  if ((await stat(file)).size < 1000) throw new Error('The database dump is unexpectedly small.');
}

// Keep the newest `keep` dated folders; never touch anything else in the directory.
async function prune(dir) {
  const backups = (await readdir(dir)).filter((entry) => pattern.test(entry)).sort();
  for (const old of backups.slice(0, Math.max(0, backups.length - keep)))
    await rm(join(dir, old), { recursive: true, force: true });
}

try {
  const target = join(primary, stamp);
  await mkdir(target, { recursive: true });
  await dump(join(target, 'techcare.sql'));
  const media = resolve(root, env.TECHCARE_DATA_DIR || 'data', 'media');
  if (existsSync(media)) await cp(media, join(target, 'media'), { recursive: true });
  await prune(primary);
  console.log(`Backup saved to ${target}`);
  if (copy) {
    await mkdir(copy, { recursive: true });
    await cp(target, join(copy, stamp), { recursive: true });
    await prune(copy);
    console.log(`Second copy saved to ${join(copy, stamp)}`);
  }
} catch (error) {
  console.error('Backup failed:', error.message);
  process.exit(1);
}
