const test = require('node:test');
const assert = require('node:assert/strict');

// search-service connects to Redis at module load time (fire-and-forget,
// non-blocking) - safe to require in a unit test even with no Redis running,
// since shared/redis is written to fail soft.
const searchService = require('../common/search-service');

test('normalizeQuery trims and lowercases', () => {
  assert.equal(searchService.normalizeQuery('  Coldplay  '), 'coldplay');
});

test('normalizeQuery handles null/undefined/empty', () => {
  assert.equal(searchService.normalizeQuery(null), '');
  assert.equal(searchService.normalizeQuery(undefined), '');
  assert.equal(searchService.normalizeQuery(''), '');
});

test('normalizeQuery is idempotent', () => {
  const once = searchService.normalizeQuery('Arctic Monkeys');
  const twice = searchService.normalizeQuery(once);
  assert.equal(once, twice);
});
