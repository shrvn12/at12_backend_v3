const test = require('node:test');
const assert = require('node:assert/strict');
const { requireQuery, requireParams } = require('../dashboard/middlewares/validateQuery');

function mockReqRes({ query = {}, params = {} } = {}) {
  const req = { query, params };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  return { req, res, next, wasNextCalled: () => nextCalled };
}

test('requireQuery calls next() when all params present', () => {
  const { req, res, next, wasNextCalled } = mockReqRes({ query: { query: 'daft punk' } });
  requireQuery(['query'])(req, res, next);
  assert.equal(wasNextCalled(), true);
  assert.equal(res.statusCode, null);
});

test('requireQuery returns 400 when a param is missing', () => {
  const { req, res, next, wasNextCalled } = mockReqRes({ query: {} });
  requireQuery(['query'])(req, res, next);
  assert.equal(wasNextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /query/);
});

test('requireQuery lists every missing param', () => {
  const { req, res } = mockReqRes({ query: {} });
  requireQuery(['id', 'type'])(req, res, () => {});
  assert.match(res.body.message, /id/);
  assert.match(res.body.message, /type/);
});

test('requireParams behaves the same for route params', () => {
  const { req, res, next, wasNextCalled } = mockReqRes({ params: { id: 'abc123' } });
  requireParams(['id'])(req, res, next);
  assert.equal(wasNextCalled(), true);
});
