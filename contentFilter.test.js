const test = require('node:test');
const assert = require('node:assert');
const { shouldFlag } = require('../src/utils/contentFilter');

test('shouldFlag flags known bad keywords', () => {
  assert.strictEqual(shouldFlag('You are stupid'), true);
  assert.strictEqual(shouldFlag('this is spam'), true);
});

test('shouldFlag does not flag normal messages', () => {
  assert.strictEqual(shouldFlag('Great work on the sprint!'), false);
});
