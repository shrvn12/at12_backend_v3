// Dashboard -> Search Service -> Redis -> cache miss -> YouTube API -> cache -> return.
// Cache complete search responses exactly as the existing backend returns
// them. Search responses are never persisted to Postgres - only Redis.
const redis = require('../redis');

function normalizeQuery(query) {
  return String(query || '').trim().toLowerCase();
}

async function getCachedSearch(rawQuery) {
  return redis.get(redis.keys.search(normalizeQuery(rawQuery)));
}

async function cacheSearch(rawQuery, response) {
  return redis.set(redis.keys.search(normalizeQuery(rawQuery)), response, redis.ttl.search);
}

/**
 * Cache wrapper around autocomplete/search-suggestions. Separate cache
 * namespace from full search results so a prefix like "coldp" doesn't
 * collide with a completed search for the same string.
 */
async function getCachedAutocomplete(rawQuery) {
  return redis.get(`autocomplete:${normalizeQuery(rawQuery)}`);
}

async function cacheAutocomplete(rawQuery, suggestions) {
  return redis.set(`autocomplete:${normalizeQuery(rawQuery)}`, suggestions, redis.ttl.search);
}

module.exports = {
  normalizeQuery,
  getCachedSearch,
  cacheSearch,
  getCachedAutocomplete,
  cacheAutocomplete,
};
