// Redis is a cache only — the app must keep functioning (with reduced
// performance) if Redis is down. Every call here is wrapped so a Redis
// outage never throws up into calling code; it just misses.
const { createClient } = require('redis');
const config = require('../config');
const { logger } = require('../logger');

console.log('Connecting to Redis URL:', config.redis.url);

const client = createClient({
  url: config.redis.url || 'redis://127.0.0.1:6379',
  socket: {
    connectTimeout: 10000, // 10s: prevents false timeouts during Node event loop spikes
    keepAlive: 5000,       // Sends TCP pings to keep WSL/Docker connections alive
    reconnectStrategy: (retries) => Math.min(retries * 200, 3000), // Keep retrying indefinitely in background
  },
});

// Always register error listener to prevent uncaught process crashes
client.on('error', (err) => {
  logger.error({ err }, 'redis client error');
});

client.on('connect', () => {
  logger.info('Redis socket client.isOpen');
});

client.on('ready', () => {
  logger.info('Redis client ready');
});

// Self-executing top-level connection trigger
(async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
  } catch (err) {
    logger.error({ err }, 'redis initial connect failed, continuing without cache');
  }
})();

// Centralized key builders — never construct cache keys inline elsewhere.
const keys = {
  homeFeed: (userId) => `home_feed:${userId}`,
  playlist: (userId, playlist) => `playlist:${userId}:${playlist}`,
  profile: (userId) => `profile:${userId}`,
  song: (videoId) => `song:${videoId}`,
  search: (normalizedQuery) => `search:${normalizedQuery}`,
  topTracks: (userId) => `top_tracks:${userId}`,
};

async function get(key) {
  try {
    if (!client.isOpen) return null;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.warn({ err, key }, 'redis get failed, treating as cache miss');
    return null;
  }
}

async function set(key, value, ttlSeconds) {
  try {
    if (!client.isOpen) return;
    await client.set(key, JSON.stringify(value), ttlSeconds ? { EX: ttlSeconds } : undefined);
  } catch (err) {
    logger.warn({ err, key }, 'redis set failed, continuing without cache');
  }
}

async function del(key) {
  try {
    if (!client.isOpen) return;
    await client.del(key);
  } catch (err) {
    logger.warn({ err, key }, 'redis del failed');
  }
}

module.exports = { client, keys, get, set, del, ttl: config.redis.ttl };
