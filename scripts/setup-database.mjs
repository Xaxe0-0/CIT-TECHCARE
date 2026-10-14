// Creates the configured MySQL/MariaDB database if needed and brings its schema up to date:
// a new, empty database gets backend/schema/mysql.sql; an existing one gets only the
// mysql-upgrade-N.sql files above its current version. Nothing is ever dropped or overwritten.
import nextEnv from '@next/env';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
nextEnv.loadEnvConfig(root, true);
const schemaDir = new URL('../backend/schema/', import.meta.url);
const env = process.env;
const name = env.TECHCARE_DB_NAME;
if (!env.TECHCARE_DB_HOST || !name || !env.TECHCARE_DB_USER) {
  console.error(
    'Set TECHCARE_DB_HOST, TECHCARE_DB_NAME, and TECHCARE_DB_USER in .env.local first.',
  );
  process.exit(1);
}
if (!/^[A-Za-z0-9_]{1,64}$/.test(name)) {
  console.error('TECHCARE_DB_NAME may contain only letters, numbers, and underscores.');
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
    ssl: env.TECHCARE_DB_SSL === '1' ? {} : undefined,
    // Needed to run the schema files; safe here because they are the project's own files.
    multipleStatements: true,
  });
} catch (error) {
  console.error(
    error.code === 'ECONNREFUSED'
      ? `MySQL is not running at ${env.TECHCARE_DB_HOST}:${env.TECHCARE_DB_PORT || 3306}. Start it (XAMPP: open the Control Panel and start MySQL), then run setup again.`
      : `Could not connect to MySQL: ${error.code || error.message}. Check the TECHCARE_DB_* settings in .env.local.`,
  );
  process.exit(1);
}
try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.query(`USE \`${name}\``);
  const schema = await readFile(new URL('mysql.sql', schemaDir), 'utf8');
  const latest = Number(schema.match(/migration version (\d+)/)[1]);
  const [tables] = await connection.query('SHOW TABLES');
  const [migrations] = await connection.query("SHOW TABLES LIKE 'migrations'");
  if (!migrations.length) {
    if (tables.length) {
      console.error(
        `Database "${name}" already has other tables. Use an empty database for TechCare (see docs/MIGRATION.md).`,
      );
      process.exit(1);
    }
    await connection.query(schema);
    console.log(`Created the TechCare schema (version ${latest}) in database "${name}".`);
  } else {
    const [[{ version }]] = await connection.query(
      'SELECT COALESCE(MAX(version), 0) AS version FROM migrations',
    );
    const upgrades = (await readdir(schemaDir))
      .map((file) => ({ file, version: Number(file.match(/^mysql-upgrade-(\d+)\.sql$/)?.[1]) }))
      .filter((upgrade) => upgrade.version > version)
      .sort((a, b) => a.version - b.version);
    for (const upgrade of upgrades) {
      await connection.query(await readFile(new URL(upgrade.file, schemaDir), 'utf8'));
      console.log(`Applied ${upgrade.file}.`);
    }
    console.log(
      upgrades.length
        ? `Database "${name}" is now at schema version ${latest}.`
        : `Database "${name}" is already at schema version ${version}.`,
    );
  }
} catch (error) {
  console.error(`Database setup failed: ${error.code || ''} ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
