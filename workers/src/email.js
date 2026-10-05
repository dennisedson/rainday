/**
 * Customer order confirmation, sent through Resend.
 *
 * Square does not email a receipt for payments taken through the Payments API;
 * only its hosted Checkout API does. Without this the customer gets nothing
 * after paying (confirmed by a test order on 2026-10-02).
 *
 * The body reuses the deal's order summary and mailing label, so the email the
 * customer reads and the deal the shop owner reads always show the same
 * numbers.
 */

import { formatOrderSummary, formatShippingAddress } from './hubspot.js';

const RESEND_API = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'noreply@rainydaymerchandise.com';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function linesToHtml(text) {
  return text.split('\n').map(escapeHtml).join('<br>');
}

/** Only an https link is put in front of the customer. */
function safeReceiptUrl(url) {
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

/**
 * Subject and bodies for the confirmation. Pure, so it is tested without
 * Resend. The order number is the reference id, the same one the HubSpot deal
 * is named after and the account page's order history shows.
 */
export function buildOrderConfirmationEmail({ order, payment, firstName, replyTo }) {
  const orderNumber = order?.reference_id ?? order?.id ?? '';
  const greeting = `Hi ${firstName || 'there'},`;
  const summary = formatOrderSummary(order);
  const address = formatShippingAddress(order?.fulfillments?.[0]?.shipment_details?.recipient);
  const receiptUrl = safeReceiptUrl(payment?.receipt_url);
  const subject = `Your Rainy Day Merchandise order ${orderNumber}`.trim();

  const text = [
    greeting,
    'Thanks for your order. Here is what you bought.',
    orderNumber && `Order ${orderNumber}`,
    summary,
    address && `Shipping to:\n${address}`,
    receiptUrl && `Your Square receipt: ${receiptUrl}`,
    replyTo && 'Questions about your order? Just reply to this email.',
    'Rainy Day Merchandise',
  ].filter(Boolean).join('\n\n');

  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    '<p>Thanks for your order. Here is what you bought.</p>',
    orderNumber && `<p><strong>Order ${escapeHtml(orderNumber)}</strong></p>`,
    summary && `<p>${linesToHtml(summary)}</p>`,
    address && `<p><strong>Shipping to:</strong><br>${linesToHtml(address)}</p>`,
    receiptUrl && `<p><a href="${escapeHtml(receiptUrl)}">View your Square receipt</a></p>`,
    replyTo && '<p>Questions about your order? Just reply to this email.</p>',
    '<p>Rainy Day Merchandise</p>',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

/**
 * Sends the confirmation. Returns false when it is deliberately skipped — no
 * Resend key on this Worker, or no usable address — and throws when Resend
 * rejects it, so the caller can log a real failure.
 *
 * `to` must be a single address: it comes from the request body, and an array
 * there would turn one paid order into a bulk send.
 *
 * The idempotency key is the payment id. A retried process-payment request
 * gets the same Square payment back, and must not email the customer twice.
 */
export async function sendOrderConfirmationEmail(env, { to, order, payment, firstName }) {
  if (!env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY is not set; order confirmation not sent');
    return false;
  }
  if (typeof to !== 'string' || !to.includes('@')) return false;

  const replyTo = env.ORDER_EMAIL_REPLY_TO || null;
  const { subject, html, text } = buildOrderConfirmationEmail({ order, payment, firstName, replyTo });

  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...(payment?.id ? { 'Idempotency-Key': `order-confirmation/${payment.id}` } : {}),
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) throw new Error(`Resend rejected the order email (${response.status})`);
  return true;
}
