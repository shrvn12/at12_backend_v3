// Simple, dependency-light migration runner.
//   node migrations/migrate.js
const fs = require('fs');
const path = require('path');
const { pool, withTransaction } = require('../common/db');
const { logger } = require('../common/logger');

const MIGRATIONS_DIR = __dirname;

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations() {
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  return new Set(rows.map((r) => r.name));
}

async function run() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info({ file }, 'migration already applied, skipping');
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    logger.info({ file }, 'applying migration');

    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });

    logger.info({ file }, 'migration applied');
  }

  logger.info('all migrations up to date');
  await pool.end();
}

run().catch((err) => {
  logger.error({ err }, 'migration failed');
  process.exit(1);
});
