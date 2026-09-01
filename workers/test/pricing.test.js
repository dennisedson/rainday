import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderTaxes, shouldApplyKansasTax } from '../src/pricing.js';

const env = { SQUARE_KS_TAX_ID: 'TAX123' };

test('Kansas is taxed regardless of case or padding', () => {
  for (const s of ['KS', 'ks', 'Ks', ' KS ', '  ks']) {
    assert.equal(shouldApplyKansasTax(s), true, `expected ${JSON.stringify(s)} to be taxed`);
  }
});

test('other states are not taxed', () => {
  for (const s of ['NY', 'CA', 'MO', 'KANSAS', 'K', '']) {
    assert.equal(shouldApplyKansasTax(s), false, `expected ${JSON.stringify(s)} not to be taxed`);
  }
});

test('a missing state is not taxed', () => {
  assert.equal(shouldApplyKansasTax(undefined), false);
  assert.equal(shouldApplyKansasTax(null), false);
});

test('buildOrderTaxes attaches the configured tax for Kansas', () => {
  assert.deepEqual(buildOrderTaxes(env, 'KS'),
    [{ catalog_object_id: 'TAX123', scope: 'ORDER' }]);
});

test('buildOrderTaxes attaches nothing out of state', () => {
  assert.deepEqual(buildOrderTaxes(env, 'NY'), []);
});

test('buildOrderTaxes attaches nothing when no tax is configured', () => {
  assert.deepEqual(buildOrderTaxes({}, 'KS'), []);
});
