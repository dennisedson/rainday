import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderItems, formatShippingAddress } from '../src/hubspot.js';

test('order items render one readable line each', () => {
  const lineItems = [
    { name: 'Charm bracelets', quantity: '2', total_money: { amount: 2400 } },
    { name: 'Small earrings', quantity: '1', total_money: { amount: 500 } },
  ];
  assert.equal(formatOrderItems(lineItems),
    'Charm bracelets x2 - $24.00\nSmall earrings x1 - $5.00');
});

test('order items handle an empty or missing list', () => {
  assert.equal(formatOrderItems([]), '');
  assert.equal(formatOrderItems(undefined), '');
});

test('an item with no total renders as $0.00 rather than undefined', () => {
  assert.equal(formatOrderItems([{ name: 'Mystery', quantity: '1' }]), 'Mystery x1 - $0.00');
});

test('shipping address renders as a mailing label', () => {
  const recipient = {
    display_name: 'Dennis Edson',
    phone_number: '6467894233',
    address: {
      address_line_1: '20 S Cedar St',
      locality: 'Beacon',
      administrative_district_level_1: 'NY',
      postal_code: '12508',
    },
  };
  assert.equal(formatShippingAddress(recipient),
    'Dennis Edson\n20 S Cedar St\nBeacon, NY 12508\n6467894233');
});

test('shipping address omits missing parts without leaving stray punctuation', () => {
  assert.equal(formatShippingAddress({
    display_name: 'Jane', address: { address_line_1: '1 Main St' },
  }), 'Jane\n1 Main St');
});

test('a missing recipient renders empty', () => {
  assert.equal(formatShippingAddress(undefined), '');
  assert.equal(formatShippingAddress({}), '');
});
