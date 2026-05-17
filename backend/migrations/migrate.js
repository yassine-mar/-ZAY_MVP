'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const log = (msg) => process.stdout.write(`[migrate] ${msg}\n`);

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.query('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(result.rows.map((r) => r.version));
};

const getMigrationFiles = () => {
  const migrationsDir = path.join(__dirname);
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort();
};

const runMigrations = async () => {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();

    let count = 0;
    for (const file of files) {
      const version = file.replace('.sql', '');
      if (applied.has(version)) {
        continue;
      }

      log(`Applying: ${file}`);
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        count += 1;
        log(`  → applied`);
      } catch (err) {
        await client.query('ROLLBACK');
        log(`  → FAILED: ${err.message}`);
        throw err;
      }
    }

    if (count === 0) {
      log('No pending migrations');
    } else {
      log(`Applied ${count} migration(s)`);
    }
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      log(`Migration failed: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { runMigrations };
