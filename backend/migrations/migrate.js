'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const MIGRATIONS_DIR = __dirname;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const log = (msg, color = 'reset') => {
  process.stdout.write(`${colors[color]}${msg}${colors.reset}\n`);
};

const sha = (content) =>
  crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    VARCHAR(255) PRIMARY KEY,
      checksum   VARCHAR(64),
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Backfill the column in case an older migrate.js created the table without it.
  await client.query(`
    ALTER TABLE schema_migrations
      ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.query(
    'SELECT version, checksum FROM schema_migrations ORDER BY version'
  );
  const map = new Map();
  result.rows.forEach((r) => map.set(r.version, r.checksum));
  return map;
};

const listMigrationFiles = () =>
  fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort();

const verifyChecksums = (appliedMap, files) => {
  const mismatches = [];
  for (const file of files) {
    const version = file.replace('.sql', '');
    if (!appliedMap.has(version)) continue;
    const recorded = appliedMap.get(version);
    if (!recorded) continue; // legacy migration without checksum — skip
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const current = sha(sql);
    if (recorded !== current) {
      mismatches.push({ version, recorded, current });
    }
  }
  return mismatches;
};

const applyMigration = async (client, file) => {
  const version = file.replace('.sql', '');
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  const checksum = sha(sql);

  const start = Date.now();
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO schema_migrations (version, checksum)
       VALUES ($1, $2)
       ON CONFLICT (version) DO UPDATE SET checksum = EXCLUDED.checksum`,
      [version, checksum]
    );
    await client.query('COMMIT');
    log(`    ✓ ${file} (${Date.now() - start}ms)`, 'green');
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`${file} failed: ${err.message}`);
  }
};

const run = async () => {
  if (!process.env.DATABASE_URL) {
    log('DATABASE_URL not set', 'red');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const files = listMigrationFiles();
    const applied = await getAppliedMigrations(client);

    const mismatches = verifyChecksums(applied, files);
    if (mismatches.length > 0) {
      log('Checksum mismatch — applied migrations have been modified:', 'red');
      mismatches.forEach((m) =>
        log(`  ✗ ${m.version}: ${m.recorded.slice(0, 8)} → ${m.current.slice(0, 8)}`, 'red'));
      log('\nMigrations are immutable once applied.', 'yellow');
      log('To change schema, add a NEW migration (e.g. 014_fix_xyz.sql).', 'yellow');
      process.exit(1);
    }

    const pending = files.filter((f) => !applied.has(f.replace('.sql', '')));

    if (pending.length === 0) {
      log(`Schema up to date (${applied.size} migration(s) applied)`, 'green');
      return;
    }

    log(`Applying ${pending.length} migration(s):`, 'yellow');
    for (const file of pending) {
      log(`  → ${file}`, 'cyan');
      // eslint-disable-next-line no-await-in-loop
      await applyMigration(client, file);
    }

    log(`\nApplied ${pending.length} migration(s) successfully.`, 'green');
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  run().catch((err) => {
    log(`\nMigration error: ${err.message}`, 'red');
    if (err.stack) log(err.stack, 'dim');
    process.exit(1);
  });
}

module.exports = { run };
