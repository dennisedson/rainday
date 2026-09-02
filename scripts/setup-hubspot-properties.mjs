#!/usr/bin/env node
/**
 * Creates the custom HubSpot properties the storefront writes to.
 *
 * Idempotent: existing properties are reported and left alone, so it is safe
 * to re-run. Prints the portal it is about to touch and refuses to guess.
 *
 *   HUBSPOT_TOKEN=pat-na1-... node scripts/setup-hubspot-properties.mjs
 *   HUBSPOT_TOKEN=pat-na1-... node scripts/setup-hubspot-properties.mjs --expect-portal 51953677
 *
 * Needs a private app token with crm.schemas.contacts.write and
 * crm.schemas.deals.write. Those scopes are only required for this script —
 * the Worker itself never creates properties and does not need them.
 */

const TOKEN = process.env.HUBSPOT_TOKEN;
if (!TOKEN) {
  console.error('HUBSPOT_TOKEN is not set.\n\n  HUBSPOT_TOKEN=pat-na1-... node scripts/setup-hubspot-properties.mjs\n');
  process.exit(1);
}

const expectIdx = process.argv.indexOf('--expect-portal');
const expectPortal = expectIdx > -1 ? process.argv[expectIdx + 1] : null;

const PROPERTIES = {
  contacts: [
    {
      name: 'magic_link_token', label: 'Magic Link Token',
      type: 'string', fieldType: 'text', groupName: 'contactinformation',
      description: 'Single-use magic-link login token. Written on request, cleared on redemption.',
    },
    {
      // Deliberately text, not datetime: the code writes an ISO 8601 string and
      // reads it back with new Date(). HubSpot datetime properties return epoch
      // milliseconds through the API, which parses to 1970 and makes every link
      // look expired.
      name: 'magic_link_expires', label: 'Magic Link Expires',
      type: 'string', fieldType: 'text', groupName: 'contactinformation',
      description: 'ISO 8601 expiry for the magic-link token. Stored as text so it round-trips unchanged.',
    },
    {
      name: 'favorite_products', label: 'Favorite Products',
      type: 'string', fieldType: 'textarea', groupName: 'contactinformation',
      description: 'Comma-separated Square catalog product ids favorited by this contact.',
    },
  ],
  deals: [
    {
      name: 'order_items', label: 'Order Items',
      type: 'string', fieldType: 'textarea', groupName: 'dealinformation',
      description: 'What was ordered, one line each, plus shipping, tax and total.',
    },
    {
      name: 'shipping_address', label: 'Shipping Address',
      type: 'string', fieldType: 'textarea', groupName: 'dealinformation',
      description: 'Where THIS order shipped. A snapshot, so it stays true if the customer later moves.',
    },
    {
      name: 'square_receipt_url', label: 'Square Receipt URL',
      type: 'string', fieldType: 'text', groupName: 'dealinformation',
      description: "Direct link to the customer's Square receipt.",
    },
    {
      name: 'payment_id', label: 'Square Payment ID',
      type: 'string', fieldType: 'text', groupName: 'dealinformation',
      description: 'Square payment id for this order.',
    },
    {
      name: 'order_id', label: 'Square Order ID',
      type: 'string', fieldType: 'text', groupName: 'dealinformation',
      description: 'Square order reference for this deal.',
    },
  ],
};

async function hubspot(path, init = {}) {
  const response = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { ok: response.ok, status: response.status, body };
}

const scopeHint = (body) =>
  String(body?.message || '').includes('scopes')
    ? '  -> the token is missing a required scope; see the header of this file'
    : '';

// Never create properties in a portal nobody meant to touch.
const account = await hubspot('/account-info/v3/details');
if (!account.ok) {
  console.error(`Could not read the account: ${account.status} ${account.body?.message || ''}`);
  console.error(scopeHint(account.body));
  process.exit(1);
}
const portalId = String(account.body.portalId);
console.log(`Portal ${portalId} (${account.body.accountType})`);

if (expectPortal && expectPortal !== portalId) {
  console.error(`\nRefusing to continue: expected portal ${expectPortal}, this token belongs to ${portalId}.`);
  process.exit(1);
}
if (!expectPortal) {
  console.log('No --expect-portal given, so this is the portal that will be changed.\n');
}

let created = 0, existed = 0, failed = 0;

for (const [object, definitions] of Object.entries(PROPERTIES)) {
  const listing = await hubspot(`/crm/v3/properties/${object}`);
  if (!listing.ok) {
    console.error(`\n${object}: cannot list properties (${listing.status})`);
    console.error(scopeHint(listing.body));
    failed += definitions.length;
    continue;
  }
  const existing = new Set(listing.body.results.map((p) => p.name));

  console.log(`\n${object}`);
  for (const def of definitions) {
    if (existing.has(def.name)) {
      console.log(`  exists   ${def.name}`);
      existed++;
      continue;
    }
    const result = await hubspot(`/crm/v3/properties/${object}`, {
      method: 'POST',
      body: JSON.stringify(def),
    });
    if (result.ok) {
      console.log(`  created  ${def.name}  (${def.type}/${def.fieldType})`);
      created++;
    } else {
      console.log(`  FAILED   ${def.name}: ${result.status} ${result.body?.message || ''}`);
      console.log(scopeHint(result.body));
      failed++;
    }
  }
}

console.log(`\n${created} created, ${existed} already present, ${failed} failed.`);
process.exit(failed ? 1 : 0);
