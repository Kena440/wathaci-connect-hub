import test from 'node:test';
import assert from 'node:assert';

test('should run basic tests', () => {
  assert.strictEqual(1 + 1, 2);
});

test('should handle string operations', () => {
  assert.ok('hello world'.includes('world'));
});
