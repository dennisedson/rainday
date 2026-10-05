import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmailAddress } from '../src/email-address.js';

test('ordinary addresses pass', () => {
  for (const email of [
    'dennis@dennisedson.com',
    'rainydaymerchandise@gmail.com',
    'pat.buyer+shop@example.co.uk',
    'owner@small.studio',
    '  Pat@Example.COM  ',
  ]) {
    assert.equal(isValidEmailAddress(email), true, email);
  }
});

test('a domain that does not end in a real top-level domain fails', () => {
  for (const email of ['dennis@dennisedson.cpm', 'pat@gmail.con', 'pat@example.comm']) {
    assert.equal(isValidEmailAddress(email), false, email);
  }
});

test('addresses with the wrong shape fail', () => {
  for (const email of [
    '',
    'dennis',
    'dennis@',
    '@dennisedson.com',
    'dennis@dennisedson',
    'dennis@@dennisedson.com',
    'den nis@dennisedson.com',
    '"dennis"@dennisedson.com',
    'dennis@dennisedson..com',
    'dennis@.dennisedson.com',
    'dennis@dennisedson.com.',
  ]) {
    assert.equal(isValidEmailAddress(email), false, JSON.stringify(email));
  }
});

test('anything that is not a string fails rather than throwing', () => {
  for (const value of [undefined, null, 42, ['pat@example.com'], { email: 'pat@example.com' }]) {
    assert.equal(isValidEmailAddress(value), false, JSON.stringify(value));
  }
});
