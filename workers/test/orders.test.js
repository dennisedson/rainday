import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderSummary, formatShippingAddress } from '../src/hubspot.js';

test('the summary reconciles: lines, shipping, tax, total', () => {
  const order = {
    line_items: [
      { name: 'Charm bracelets', quantity: '2', gross_sales_money: { amount: 2400 },
        total_money: { amount: 2556 } },
    ],
    service_charges: [{ name: 'Shipping', amount_money: { amount: 500 } }],
    total_tax_money: { amount: 188 },
    total_money: { amount: 3088 },
  };
  assert.equal(formatOrderSummary(order),
    'Charm bracelets x2 - $24.00\nShipping - $5.00\nTax - $1.88\nTotal - $30.88');
});

test('several items each get their own pre-tax line', () => {
  const order = {
    line_items: [
      { name: 'Charm bracelets', quantity: '2', gross_sales_money: { amount: 2400 } },
      { name: 'Small earrings', quantity: '1', gross_sales_money: { amount: 500 } },
    ],
    total_money: { amount: 2900 },
  };
  assert.equal(formatOrderSummary(order),
    'Charm bracelets x2 - $24.00\nSmall earrings x1 - $5.00\nTotal - $29.00');
});

test('no tax means no tax line', () => {
  const order = {
    line_items: [{ name: 'Keychain', quantity: '1', gross_sales_money: { amount: 1000 } }],
    total_tax_money: { amount: 0 },
    total_money: { amount: 1000 },
  };
  assert.equal(formatOrderSummary(order), 'Keychain x1 - $10.00\nTotal - $10.00');
});

test('free shipping means no shipping line', () => {
  const order = {
    line_items: [{ name: 'Keychain', quantity: '1', gross_sales_money: { amount: 1000 } }],
    service_charges: [],
    total_money: { amount: 1000 },
  };
  assert.equal(formatOrderSummary(order), 'Keychain x1 - $10.00\nTotal - $10.00');
});

test('a line with no gross total renders $0.00, never undefined', () => {
  const order = {
    line_items: [{ name: 'Mystery', quantity: '1' }],
    total_money: { amount: 0 },
  };
  assert.equal(formatOrderSummary(order), 'Mystery x1 - $0.00\nTotal - $0.00');
});

test('an item with no name falls back to Item', () => {
  const order = {
    line_items: [{ quantity: '3', gross_sales_money: { amount: 900 } }],
    total_money: { amount: 900 },
  };
  assert.equal(formatOrderSummary(order), 'Item x3 - $9.00\nTotal - $9.00');
});

test('an empty or missing order renders empty', () => {
  assert.equal(formatOrderSummary(undefined), '');
  assert.equal(formatOrderSummary({}), '');
  assert.equal(formatOrderSummary({ line_items: [] }), '');
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
