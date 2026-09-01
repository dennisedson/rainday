import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderTaxes, shouldApplyKansasTax } from '../src/pricing.js';

const env = { SQUARE_KS_TAX_ID_PRODUCTION: 'PROD_TAX', SQUARE_KS_TAX_ID_SANDBOX: 'SANDBOX_TAX' };
const prodCfg = { isProd: true };
const sandboxCfg = { isProd: false };

test('Kansas is taxed regardless of case or padding', () => {
  for (const s of ['KS', 'ks', 'Ks', ' KS ', '  ks']) {
    assert.equal(shouldApplyKansasTax(s), true, `expected ${JSON.stringify(s)} to be taxed`);
  }
});

test('the full state name is taxed too', () => {
  for (const s of ['Kansas', 'kansas', ' KANSAS ']) {
    assert.equal(shouldApplyKansasTax(s), true, `expected ${JSON.stringify(s)} to be taxed`);
  }
});

test('other states are not taxed', () => {
  for (const s of ['NY', 'CA', 'MO', '']) {
    assert.equal(shouldApplyKansasTax(s), false, `expected ${JSON.stringify(s)} not to be taxed`);
  }
});

test('near-misses for the state name are not taxed', () => {
  for (const s of ['K', 'KA', 'Kans', 'Arkansas']) {
    assert.equal(shouldApplyKansasTax(s), false, `expected ${JSON.stringify(s)} not to be taxed`);
  }
});

test('a missing state is not taxed', () => {
  assert.equal(shouldApplyKansasTax(undefined), false);
  assert.equal(shouldApplyKansasTax(null), false);
});

test('buildOrderTaxes selects the production tax id for a production cfg', () => {
  assert.deepEqual(buildOrderTaxes(env, prodCfg, 'KS'),
    [{ catalog_object_id: 'PROD_TAX', scope: 'ORDER' }]);
});

test('buildOrderTaxes selects the sandbox tax id for a sandbox cfg', () => {
  assert.deepEqual(buildOrderTaxes(env, sandboxCfg, 'KS'),
    [{ catalog_object_id: 'SANDBOX_TAX', scope: 'ORDER' }]);
});

test('buildOrderTaxes attaches nothing out of state', () => {
  assert.deepEqual(buildOrderTaxes(env, prodCfg, 'NY'), []);
  assert.deepEqual(buildOrderTaxes(env, sandboxCfg, 'NY'), []);
});

test('buildOrderTaxes attaches nothing when the selected environment has no id configured', () => {
  assert.deepEqual(buildOrderTaxes({ SQUARE_KS_TAX_ID_SANDBOX: 'SANDBOX_TAX' }, prodCfg, 'KS'), []);
  assert.deepEqual(buildOrderTaxes({ SQUARE_KS_TAX_ID_PRODUCTION: 'PROD_TAX' }, sandboxCfg, 'KS'), []);
  assert.deepEqual(buildOrderTaxes({}, prodCfg, 'KS'), []);
});
