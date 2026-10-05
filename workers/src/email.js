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

import { addressLines, formatOrderSummary, orderSummaryRows } from './hubspot.js';

const RESEND_API = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'noreply@rainydaymerchandise.com';
const SHOP_URL = 'https://www.rainydaymerchandise.com';
// HubSpot serves the logo resized: 192px is sharp at the 96px it's shown at,
// and 11 KB instead of the 380 KB original.
const LOGO_URL = 'https://www.rainydaymerchandise.com/hs-fs/hubfs/rainydaylogo1.png?width=192&name=rainydaylogo1.png';
const SHOP_TIME_ZONE = 'America/Chicago';

// Matches the storefront: its beige ground, a white card, the logo's gold for
// dividers and the small heading, and the brand orange for the one button.
// The orange and gold are a shade darker than on the site so text on and in
// them passes contrast. Emails can't rely on stylesheets, so every style is
// inline and the layout is tables.
const COLOR = {
  ground: '#FAF7F2',
  card: '#FFFFFF',
  ink: '#2B2622',
  soft: '#6B615A',
  rule: '#EADFCF',
  gold: '#9A6B1F',
  button: '#C64A19',
};
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gmail and Apple Mail turn anything that looks like an address or a phone
 * number into a blue link. An invisible joiner between digits breaks the match
 * without changing what the customer reads.
 */
function unlinkable(value) {
  return escapeHtml(value).replace(/(\d)(?=\d)/g, '$1&zwnj;');
}

function money(cents) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

/** Only an https link is put in front of the customer. */
function safeReceiptUrl(url) {
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

/** Customers often type their name in lowercase; "dennis" reads as "Dennis". */
function displayFirstName(firstName) {
  const name = String(firstName ?? '').trim();
  return name ? name[0].toUpperCase() + name.slice(1) : '';
}

/** The day the order was placed, in the shop's time zone. */
function orderDate(createdAt) {
  const date = createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: SHOP_TIME_ZONE,
  });
}

function textStyle({ size = 15, color = COLOR.ink, weight = 400, family = SANS } = {}) {
  return `font-family:${family};font-size:${size}px;line-height:1.55;color:${color};font-weight:${weight};`;
}

/** One row of the order table: a label on the left, an amount on the right. */
function moneyRow(label, cents, { note = '', muted = false, total = false } = {}) {
  const color = muted ? COLOR.soft : COLOR.ink;
  const weight = total ? 600 : 400;
  const size = total ? 17 : 15;
  const cell = total ? 'padding:16px 0 0;' : `padding:12px 0;border-bottom:1px solid ${COLOR.rule};`;
  return `<tr>
<td style="${cell}${textStyle({ size, color, weight })}">${escapeHtml(label)}${note}</td>
<td align="right" style="${cell}${textStyle({ size, color, weight })}white-space:nowrap;">${money(cents)}</td>
</tr>`;
}

/**
 * Subject, HTML and plain-text bodies for the confirmation. Pure, so it is
 * tested without Resend. The order number is the reference id, the same one
 * the HubSpot deal is named after and the account page's order history shows.
 */
export function buildOrderConfirmationEmail({ order, payment, firstName, replyTo }) {
  const orderNumber = order?.reference_id ?? order?.id ?? '';
  const name = displayFirstName(firstName);
  const placedOn = orderDate(order?.created_at);
  const rows = orderSummaryRows(order);
  const address = addressLines(order?.fulfillments?.[0]?.shipment_details?.recipient);
  const receiptUrl = safeReceiptUrl(payment?.receipt_url);
  const subject = `Your Rainy Day Merchandise order ${orderNumber}`.trim();
  const shipsNote = "You'll get another email with a tracking number once it ships.";

  const text = [
    `Hi ${name || 'there'},`,
    `Thanks for your order! ${shipsNote}`,
    orderNumber && `Order ${orderNumber}${placedOn ? ` (${placedOn})` : ''}`,
    formatOrderSummary(order),
    address.length > 0 && `Shipping to:\n${address.join('\n')}`,
    receiptUrl && `Your Square receipt: ${receiptUrl}`,
    replyTo && 'Questions about your order? Just reply to this email.',
    `Rainy Day Merchandise\n${SHOP_URL}`,
  ].filter(Boolean).join('\n\n');

  const preheader = [orderNumber && `Order ${orderNumber}`, rows.items.length > 0 && money(rows.totalCents)]
    .filter(Boolean).join(' · ');

  const orderTable = rows.items.length === 0 ? '' : `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-collapse:collapse;border-top:1px solid ${COLOR.rule};">
${rows.items.map((item) => moneyRow(item.name, item.cents, {
    note: `<span style="color:${COLOR.soft};"> &times; ${escapeHtml(item.quantity)}</span>`,
  })).join('\n')}
${rows.charges.map((charge) => moneyRow(charge.name, charge.cents, { muted: true })).join('\n')}
${rows.taxCents > 0 ? moneyRow('Tax', rows.taxCents, { muted: true }) : ''}
${moneyRow('Total', rows.totalCents, { total: true })}
</table>`;

  const shippingBlock = address.length === 0 ? '' : `
<p style="margin:32px 0 6px;${textStyle({ size: 12, color: COLOR.gold, weight: 600 })}letter-spacing:1.5px;text-transform:uppercase;">Shipping to</p>
<p style="margin:0;${textStyle()}">${address.map(unlinkable).join('<br>')}</p>`;

  const receiptButton = !receiptUrl ? '' : `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;">
<tr><td style="background:${COLOR.button};border-radius:6px;">
<a href="${escapeHtml(receiptUrl)}" style="display:inline-block;padding:13px 24px;${textStyle({ color: '#FFFFFF', weight: 600 })}text-decoration:none;">View your receipt</a>
</td></tr>
</table>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&amp;family=Inter:wght@400;600&amp;display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${COLOR.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.ground};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td align="center" style="padding-bottom:20px;">
<a href="${SHOP_URL}"><img src="${escapeHtml(LOGO_URL)}" width="96" height="96" alt="Rainy Day Merchandise" style="display:block;border:0;width:96px;height:96px;"></a>
</td></tr>
<tr><td style="background:${COLOR.card};border-radius:8px;padding:36px 32px;">
<p style="margin:0 0 8px;${textStyle({ size: 12, color: COLOR.gold, weight: 600 })}letter-spacing:1.5px;text-transform:uppercase;">Order confirmed</p>
<h1 style="margin:0 0 12px;${textStyle({ size: 26, weight: 600, family: SERIF })}line-height:1.25;">Thanks for your order${name ? `, ${escapeHtml(name)}` : ''}!</h1>
<p style="margin:0;${textStyle({ color: COLOR.soft })}">${shipsNote}</p>
${orderNumber ? `<p style="margin:20px 0 0;${textStyle({ size: 14, color: COLOR.soft })}">Order <strong style="color:${COLOR.ink};">${escapeHtml(orderNumber)}</strong>${placedOn ? ` &middot; ${escapeHtml(placedOn)}` : ''}</p>` : ''}
${orderTable}
${shippingBlock}
${receiptButton}
${replyTo ? `<p style="margin:28px 0 0;${textStyle({ size: 14, color: COLOR.soft })}">Questions about your order? Just reply to this email.</p>` : ''}
</td></tr>
<tr><td align="center" style="padding:24px 8px 8px;${textStyle({ size: 13, color: COLOR.soft })}">
Rainy Day Merchandise &middot; <a href="${SHOP_URL}" style="color:${COLOR.soft};">rainydaymerchandise.com</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

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
