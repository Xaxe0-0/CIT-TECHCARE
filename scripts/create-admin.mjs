import nextEnv from '@next/env';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { passwordHash } from '../backend/src/middleware/auth.mjs';
import {
  run,
  now,
  closeDatabases,
  closeMySQLPool,
  assertDatabaseReady,
} from '../backend/src/config/db.mjs';
import { email, newPassword, text, username } from '../backend/src/validations/validation.mjs';
nextEnv.loadEnvConfig(process.cwd());
if (process.env.NODE_ENV === 'production' || process.env.TECHCARE_DB_DRIVER === 'mysql')
  await assertDatabaseReady();
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const input = createInterface({ input: process.stdin, output, terminal: true });
try {
  const name = username(await input.question('Administrator username (shown publicly): '));
  const fullName = text(await input.question('Administrator full name: '), 'Full name', 2, 80);
  const address = email(await input.question('Administrator email: '));
  process.stdout.write(
    'Password (12+ characters with uppercase, lowercase, a number and a symbol; hidden): ',
  );
  muted = true;
  const pw = newPassword(await input.question(''));
  muted = false;
  process.stdout.write('\n');
  await run(
    "INSERT INTO users(name,full_name,email,hash,role,verified,created) VALUES(?,?,?,?,'admin',1,?)",
    name,
    fullName,
    address,
    passwordHash(pw),
    now(),
  );
  console.log('Administrator created. Sign in through the application.');
} catch {
  console.error('Administrator could not be created. Check the input and existing account.');
  process.exitCode = 1;
} finally {
  muted = false;
  input.close();
  closeDatabases();
  await closeMySQLPool();
}
