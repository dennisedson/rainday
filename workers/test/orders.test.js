import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderSummary, formatShippingAddress } from '../src/hubspot.js';
import { toOrderList } from '../src/orders.js';

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

// --- order history --------------------------------------------------------
//
// The same deals, read back for the account page.

function deal(id, properties = {}) {
  return { id, properties: { createdate: '2026-08-01T12:00:00Z', ...properties } };
}

test('a deal becomes the order the account page renders', () => {
  const [order] = toOrderList([
    deal('501', {
      order_id: 'ORD-1',
      amount: '30.88',
      order_items: 'Charm bracelets x2 - $24.00\nShipping - $5.00\nTotal - $30.88',
      shipping_address: 'Dani\n123 Main St\nWichita, KS 67202',
      square_receipt_url: 'https://squareup.com/receipt/preview/abc',
    }),
  ]);

  assert.deepEqual(order, {
    id: '501',
    orderId: 'ORD-1',
    placedAt: '2026-08-01T12:00:00Z',
    total: '$30.88',
    items: ['Charm bracelets x2 - $24.00', 'Shipping - $5.00', 'Total - $30.88'],
    shippingAddress: 'Dani\n123 Main St\nWichita, KS 67202',
    receiptUrl: 'https://squareup.com/receipt/preview/abc',
  });
});

test('a whole-dime total keeps both decimal places', () => {
  // createOrderDeal writes (cents / 100).toString(), so $30.90 is stored "30.9".
  const [order] = toOrderList([deal('501', { amount: '30.9' })]);
  assert.equal(order.total, '$30.90');
});

test('a deal with no amount reads as $0.00 rather than $NaN', () => {
  const [order] = toOrderList([deal('501', {})]);
  assert.equal(order.total, '$0.00');
});

test('a missing receipt url is null, so the UI can omit the link', () => {
  const [order] = toOrderList([deal('501', { amount: '5.00' })]);
  assert.equal(order.receiptUrl, null);
});

test('an order with no item summary yields no item lines', () => {
  const [order] = toOrderList([deal('501', { order_items: '' })]);
  assert.deepEqual(order.items, []);
});

test('orders are newest first', () => {
  const orders = toOrderList([
    deal('1', { createdate: '2026-01-01T00:00:00Z', order_id: 'oldest' }),
    deal('2', { createdate: '2026-08-01T00:00:00Z', order_id: 'newest' }),
    deal('3', { createdate: '2026-04-01T00:00:00Z', order_id: 'middle' }),
  ]);
  assert.deepEqual(orders.map((o) => o.orderId), ['newest', 'middle', 'oldest']);
});

test('the list is capped at 50 so one customer cannot page the account view forever', () => {
  const deals = Array.from({ length: 51 }, (_, i) =>
    deal(String(i), { createdate: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z` })
  );
  assert.equal(toOrderList(deals).length, 50);
});

test('a deal missing createdate sorts last instead of throwing', () => {
  const orders = toOrderList([
    deal('1', { createdate: undefined, order_id: 'undated' }),
    deal('2', { createdate: '2026-08-01T00:00:00Z', order_id: 'dated' }),
  ]);
  assert.deepEqual(orders.map((o) => o.orderId), ['dated', 'undated']);
});
