// Mount in every HTTP service: app.use('/health', require('../common/health'));
const express = require('express');
const { pool } = require('../db');
const { client: redisClient } = require('../redis');

const router = express.Router();

router.get('/', async (req, res) => {
  const checks = {};

  try {
    await pool.query('SELECT 1');
    checks.postgres = 'ok';
  } catch (err) {
    checks.postgres = 'unavailable';
  }

  checks.redis = redisClient.isOpen ? 'ok' : 'unavailable'; // degraded, not fatal

  const healthy = checks.postgres === 'ok'; // redis being down is non-fatal by design
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks });
});

module.exports = router;
