// Shared Postgres client. All services/workers import this instead of
// creating their own pools, so pool sizing and query logging stay centralized.
const { Pool } = require('pg');
const config = require('../config');
const { logger } = require('../logger');

const pool = new Pool({
  connectionString: config.postgres.connectionString,
  max: config.postgres.poolMax,
});

pool.on('error', (err) => {
  logger.error({ err }, 'unexpected postgres pool error');
});

/**
 * Run a query with basic timing/error logging. Always prefer parameterized
 * queries ($1, $2, ...) — never string-interpolate values.
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    logger.debug({ text, durationMs: Date.now() - start, rows: result.rowCount }, 'pg query');
    return result;
  } catch (err) {
    logger.error({ err, text }, 'pg query failed');
    throw err;
  }
}

/**
 * Run multiple statements inside a single transaction. `fn` receives a
 * client with the same `.query` signature as pg's client.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
