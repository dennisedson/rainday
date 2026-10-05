import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleProcessPayment, isShippingItem } from '../src/square.js';

const itemWithVariation = (id) => ({ item_data: { name: 'Whatever', variations: [{ id }] } });
const itemNamed = (name) => ({ item_data: { name, variations: [{ id: 'SOME_OTHER_ID' }] } });

test('matches by variation id when configured', () => {
  assert.equal(isShippingItem(itemWithVariation('SHIP_VAR'), 'SHIP_VAR'), true);
});

test('a different variation id with no name match is not shipping', () => {
  assert.equal(isShippingItem(itemWithVariation('SHIP_VAR'), 'OTHER_VAR'), false);
});

test('matches by name even when no shipping variation id is configured', () => {
  assert.equal(isShippingItem(itemNamed('Shipping'), ''), true);
  assert.equal(isShippingItem(itemNamed('Shipping'), undefined), true);
});

test('the name match is case-insensitive and trims whitespace', () => {
  for (const name of ['shipping', 'SHIPPING', ' Shipping ', 'ShIpPiNg']) {
    assert.equal(isShippingItem(itemNamed(name), ''), true, `expected ${JSON.stringify(name)} to match`);
  }
});

test('a name that merely contains "shipping" does not match', () => {
  assert.equal(isShippingItem(itemNamed('Shipping Insurance'), ''), false);
  assert.equal(isShippingItem(itemNamed('Free Shipping'), ''), false);
});

test('an ordinary product matches neither check', () => {
  assert.equal(isShippingItem(itemNamed('Charm Bracelet'), 'SHIP_VAR'), false);
});

test('either check alone is sufficient - variation id matches even with a different name', () => {
  assert.equal(isShippingItem(itemWithVariation('SHIP_VAR'), 'SHIP_VAR'), true);
});

test('tolerates missing item_data or variations without throwing', () => {
  assert.equal(isShippingItem({}, 'SHIP_VAR'), false);
  assert.equal(isShippingItem({ item_data: {} }, 'SHIP_VAR'), false);
  assert.equal(isShippingItem({ item_data: { variations: [] } }, 'SHIP_VAR'), false);
});

test('payment with an address HubSpot would refuse is stopped before any call to Square', async () => {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response('{}', { status: 500 });
  };
  try {
    const request = new Request('https://example.com/api/process-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'cnon:card-nonce-ok',
        amount: 10,
        buyerEmail: 'dennis@dennisedson.cpm',
        cartItems: [{ variationId: 'VARIATION1234', name: 'Keychain', quantity: 1, price: 10 }],
      }),
    });
    const response = await handleProcessPayment(request, {
      SQUARE_ENVIRONMENT: 'sandbox', SQUARE_SANDBOX_ACCESS_TOKEN: 't', SQUARE_SANDBOX_LOCATION_ID: 'L1',
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /email address/i);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = real;
  }
});
