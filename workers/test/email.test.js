import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderConfirmationEmail, sendOrderConfirmationEmail } from '../src/email.js';

const ORDER = {
  id: 'SQ_ORDER_1',
  reference_id: 'ORD-1700000000000',
  line_items: [
    { name: 'Charm bracelets', quantity: '2', gross_sales_money: { amount: 2400 } },
  ],
  service_charges: [{ name: 'Shipping', amount_money: { amount: 500 } }],
  total_tax_money: { amount: 188 },
  total_money: { amount: 3088 },
  fulfillments: [{
    shipment_details: {
      recipient: {
        display_name: 'Pat Buyer',
        address: {
          address_line_1: '1 Main St',
          locality: 'Wichita',
          administrative_district_level_1: 'KS',
          postal_code: '67202',
        },
      },
    },
  }],
};

const PAYMENT = { id: 'PAY_1', receipt_url: 'https://squareup.com/receipt/preview/PAY_1' };

/** Swaps in a fake fetch for one test and always restores the real one. */
async function withFetch(fake, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    return await fn();
  } finally {
    globalThis.fetch = real;
  }
}

function recordingFetch(response = new Response('{"id":"email_1"}', { status: 200 })) {
  const calls = [];
  const fake = async (url, init) => {
    calls.push({ url, init });
    return response;
  };
  return { calls, fake };
}

test('the subject carries the same order number as the HubSpot deal', () => {
  const { subject } = buildOrderConfirmationEmail({ order: ORDER, payment: PAYMENT });
  assert.equal(subject, 'Your Rainy Day Merchandise order ORD-1700000000000');
});

test('the text body has the reconciling summary, the address, and the receipt link', () => {
  const { text } = buildOrderConfirmationEmail({ order: ORDER, payment: PAYMENT, firstName: 'Pat' });
  assert.match(text, /^Hi Pat,/);
  assert.match(text, /Charm bracelets x2 - \$24\.00\nShipping - \$5\.00\nTax - \$1\.88\nTotal - \$30\.88/);
  assert.match(text, /1 Main St\nWichita, KS 67202/);
  assert.match(text, /https:\/\/squareup\.com\/receipt\/preview\/PAY_1/);
});

test('no first name falls back to a generic greeting', () => {
  const { text, html } = buildOrderConfirmationEmail({ order: ORDER, payment: PAYMENT });
  assert.match(text, /^Hi there,/);
  assert.match(html, /Hi there,/);
});

test('customer-entered text is escaped in the HTML body', () => {
  const order = {
    ...ORDER,
    line_items: [{ name: '<b>Mug</b>', quantity: '1', gross_sales_money: { amount: 1000 } }],
  };
  const { html } = buildOrderConfirmationEmail({
    order,
    payment: PAYMENT,
    firstName: '<script>alert(1)</script>',
  });
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<b>Mug<\/b>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;b&gt;Mug&lt;\/b&gt;/);
});

test('a missing receipt url leaves the receipt line out rather than linking nowhere', () => {
  const { text, html } = buildOrderConfirmationEmail({ order: ORDER, payment: {} });
  assert.doesNotMatch(text, /receipt/i);
  assert.doesNotMatch(html, /href=/);
});

test('a receipt url that is not https is not linked', () => {
  const { html } = buildOrderConfirmationEmail({
    order: ORDER,
    payment: { receipt_url: 'javascript:alert(1)' },
  });
  assert.doesNotMatch(html, /javascript:/);
});

test('an order with no shipment leaves the address section out', () => {
  const { text } = buildOrderConfirmationEmail({
    order: { ...ORDER, fulfillments: [] },
    payment: PAYMENT,
  });
  assert.doesNotMatch(text, /Shipping to/);
});

test('the reply invitation appears only when replies reach someone', () => {
  const withReply = buildOrderConfirmationEmail({
    order: ORDER, payment: PAYMENT, replyTo: 'rainydaymerchandise@gmail.com',
  });
  const without = buildOrderConfirmationEmail({ order: ORDER, payment: PAYMENT });
  assert.match(withReply.text, /Just reply to this email/);
  assert.doesNotMatch(without.text, /reply/i);
});

test('without a Resend key nothing is sent', async () => {
  const { calls, fake } = recordingFetch();
  const sent = await withFetch(fake, () =>
    sendOrderConfirmationEmail({}, { to: 'pat@example.com', order: ORDER, payment: PAYMENT }));
  assert.equal(sent, false);
  assert.equal(calls.length, 0);
});

test('without a recipient nothing is sent', async () => {
  const { calls, fake } = recordingFetch();
  const sent = await withFetch(fake, () =>
    sendOrderConfirmationEmail({ RESEND_API_KEY: 'k' }, { to: '', order: ORDER, payment: PAYMENT }));
  assert.equal(sent, false);
  assert.equal(calls.length, 0);
});

test('a list of recipients is refused, so one order cannot become a bulk send', async () => {
  const { calls, fake } = recordingFetch();
  const sent = await withFetch(fake, () =>
    sendOrderConfirmationEmail({ RESEND_API_KEY: 'k' },
      { to: ['a@example.com', 'b@example.com'], order: ORDER, payment: PAYMENT }));
  assert.equal(sent, false);
  assert.equal(calls.length, 0);
});

test('sends through Resend with the shop reply-to and a per-payment idempotency key', async () => {
  const env = {
    RESEND_API_KEY: 're_test',
    RESEND_FROM_EMAIL: 'noreply@rainydaymerchandise.com',
    ORDER_EMAIL_REPLY_TO: 'rainydaymerchandise@gmail.com',
  };
  const { calls, fake } = recordingFetch();
  const sent = await withFetch(fake, () =>
    sendOrderConfirmationEmail(env, { to: 'pat@example.com', order: ORDER, payment: PAYMENT }));

  assert.equal(sent, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test');
  assert.equal(calls[0].init.headers['Idempotency-Key'], 'order-confirmation/PAY_1');

  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.from, 'noreply@rainydaymerchandise.com');
  assert.equal(body.to, 'pat@example.com');
  assert.equal(body.reply_to, 'rainydaymerchandise@gmail.com');
  assert.equal(body.subject, 'Your Rainy Day Merchandise order ORD-1700000000000');
  assert.ok(body.html);
  assert.ok(body.text);
});

test('no reply-to configured means no reply_to field', async () => {
  const { calls, fake } = recordingFetch();
  await withFetch(fake, () =>
    sendOrderConfirmationEmail({ RESEND_API_KEY: 'k' }, { to: 'pat@example.com', order: ORDER, payment: PAYMENT }));
  const body = JSON.parse(calls[0].init.body);
  assert.equal('reply_to' in body, false);
  assert.equal(body.from, 'noreply@rainydaymerchandise.com');
});

test('a Resend rejection throws, so the caller logs it', async () => {
  const { fake } = recordingFetch(new Response('{"message":"invalid"}', { status: 422 }));
  await assert.rejects(
    withFetch(fake, () =>
      sendOrderConfirmationEmail({ RESEND_API_KEY: 'k' }, { to: 'pat@example.com', order: ORDER, payment: PAYMENT })),
    /422/
  );
});
