const test = require('node:test');
const assert = require('node:assert/strict');
const { sendSuccess, sendError } = require('../common/utils/respond');

function mockRes() {
  return {
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
}

test('sendSuccess defaults to 200 and wraps data', () => {
  const res = mockRes();
  sendSuccess(res, { foo: 'bar' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, data: { foo: 'bar' } });
});

test('sendSuccess honors a custom status code', () => {
  const res = mockRes();
  sendSuccess(res, { id: 1 }, 201);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
});

test('sendError wraps a message with success:false', () => {
  const res = mockRes();
  sendError(res, 404, 'Not found');
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: 'Not found' });
});
