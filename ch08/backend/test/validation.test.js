const assert = require('node:assert/strict');
const test = require('node:test');
const { parseRegistration, parseRatingScore, parseRole } = require('../utils/validation');

test('registration trims identity fields and always leaves role assignment to the server', () => {
  const result = parseRegistration({
    userName: '  alice  ',
    email: ' ALICE@example.com ',
    password: 'a-strong-password',
    confirmPassword: 'a-strong-password',
    role: 'admin',
  });

  assert.equal(result.error, undefined);
  assert.deepEqual(result.data, {
    userName: 'alice',
    email: 'alice@example.com',
    password: 'a-strong-password',
  });
});

test('registration rejects missing fields, invalid email, weak passwords, and mismatched confirmation', () => {
  assert.match(parseRegistration({}).error, /required/i);
  assert.match(parseRegistration({
    userName: 'alice', email: 'not-an-email', password: 'a-strong-password',
  }).error, /email/i);
  assert.match(parseRegistration({
    userName: 'alice', email: 'alice@example.com', password: 'short',
  }).error, /8 characters/i);
  assert.match(parseRegistration({
    userName: 'alice', email: 'alice@example.com', password: 'a-strong-password', confirmPassword: 'different',
  }).error, /match/i);
});

test('rating scores must be integer values from 1 through 5', () => {
  for (let score = 1; score <= 5; score += 1) {
    assert.equal(parseRatingScore(score), score);
  }
  for (const score of [0, 6, 2.5, '5', null]) {
    assert.equal(parseRatingScore(score), null);
  }
});

test('role updates accept only user and admin', () => {
  assert.equal(parseRole('user'), 'user');
  assert.equal(parseRole('admin'), 'admin');
  assert.equal(parseRole('guest'), null);
  assert.equal(parseRole('Admin'), null);
});
