# Storefront API — Cloudflare Worker

The backend for the Rainy Day Merchandise HubSpot storefront. Replaces the
Vercel functions in `../api`.

## Why Cloudflare

Vercel's Hobby plan does not permit commercial use, and this is a real store
taking real payments. Cloudflare's free tier allows commercial use and gives
100,000 requests/day, which this store will not approach.

Two things came for free with the move:

- **No cold starts**, so the `keep-alive` script and its cron — which existed
  only to keep Vercel warm — are no longer needed.
- **A custom domain**, `api.rainydaymerchandise.com`, so the next platform move
  is a DNS change instead of a nine-file edit and a theme deploy.

## Layout

```
src/
  index.js     Router + CORS. Replaces the rewrite table in ../vercel.json.
  lib.js       CORS, JSON responses, Web Crypto replacements for node:crypto.
  square.js    Catalog reads, order calculation, payments.
  hubspot.js   Deals, category sync, favorites.
  auth.js      Magic-link auth (jose instead of jsonwebtoken).
test/          Unit tests for the crypto and CORS helpers.
```

Behaviour is a faithful port. The differences are structural: `env` instead of
`process.env`, `Request`/`Response` instead of `(req, res)`, Web Crypto instead
of `node:crypto`, and direct REST calls instead of `@hubspot/api-client` — that
SDK alone would have exceeded the Worker bundle limit. Only six CRM operations
were ever used.

## Setup

```bash
cd workers
npm install
npx wrangler login
```

### Secrets

`wrangler.toml` holds only non-secret vars. Everything below is a secret and
must be set with `wrangler secret put NAME` (it prompts, so the value never
lands in shell history or the repo):

```bash
npx wrangler secret put SQUARE_PRODUCTION_ACCESS_TOKEN
npx wrangler secret put SQUARE_PRODUCTION_LOCATION_ID
npx wrangler secret put SQUARE_SANDBOX_ACCESS_TOKEN
npx wrangler secret put SQUARE_SANDBOX_LOCATION_ID
npx wrangler secret put HUBSPOT_ACCESS_TOKEN
npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
```

Pull the current values from Vercel *before* tearing that project down:

```bash
cd .. && npx vercel link && npx vercel env pull .env.production.local --environment=production
```

> **`JWT_SECRET` must carry over unchanged.** It signs customer sessions. A new
> value silently logs out every signed-in customer, and the old one cannot be
> recovered once the Vercel project is deleted.

### Hostname

Currently the Worker is reached at its generated hostname:

```
https://hsecommerce-api.<account-subdomain>.workers.dev
```

No DNS changes were needed for this. `rainydaymerchandise.com` stays on GoDaddy
nameservers and the storefront and email records are untouched.

**Later: move to `api.rainydaymerchandise.com`.** A platform hostname is the
same coupling that made leaving Vercel a nine-file change, so this is worth
doing once the Worker has proven itself. A Workers custom domain requires the
zone to be on Cloudflare DNS, which means changing nameservers at GoDaddy — the
whole zone moves, not just `api`. Before flipping, set the two apex `A` records,
`www`, and `_domainconnect` to **DNS only**; they point at HubSpot, which
manages its own certificate and breaks when proxied. Then add the custom domain
under **Workers & Pages → hsecommerce-api → Settings → Domains & Routes**, and
change `utils/config.js` plus the inline script in `base.hubl.html`.

## HubSpot portal setup

A fresh portal needs both the right scopes and eight custom properties. Miss
the properties and HubSpot rejects the writes with a 400.

### Two different HubSpot credentials

Each portal needs **two**, and they are not interchangeable. Mixing them up
produces confusing failures, because each one works perfectly for the other's
job's neighbour.

| | Looks like | Used by | Stored in |
| :--- | :--- | :--- | :--- |
| CLI personal access key | `CiRuYTEt...` (~107 chars) | `hs project upload` | GitHub secret `HUBSPOT_PERSONAL_ACCESS_KEY` |
| Private app token | `pat-na1-<uuid>` (44 chars) | the Worker's CRM calls | Cloudflare secret `HUBSPOT_ACCESS_TOKEN` |

The CLI key carries `developer.projects.write` and friends; the private app token
carries `crm.objects.*`. Neither set covers the other. A private app token in CI
fails the theme upload; a CLI key in the Worker fails every CRM call.

### Access key scopes

| Scope | Needed for |
| :--- | :--- |
| `crm.objects.contacts.read` | contact search, session lookup |
| `crm.objects.contacts.write` | contact create, magic-link token, favorites |
| `crm.objects.deals.write` | deal creation on checkout |
| `crm.objects.deals.read` | not called directly; pairs with write |
| `crm.schemas.contacts.write` | only to create the properties below via API |
| `crm.schemas.deals.write` | same |

Schema scopes alone will let you create properties while every CRM object call
returns 403 — the failure looks like a broken integration rather than a missing
scope, so check both.

### Custom properties

| Object | Property | Type |
| :--- | :--- | :--- |
| contacts | `magic_link_token` | string / text |
| contacts | `magic_link_expires` | string / **text** |
| contacts | `favorite_products` | string / textarea |
| deals | `payment_id` | string / text |
| deals | `order_id` | string / text |
| deals | `order_items` | string / textarea |
| deals | `shipping_address` | string / textarea |
| deals | `square_receipt_url` | string / text |

`magic_link_expires` must be **text, not datetime**. The code writes
`expiresAt.toISOString()` and reads it back with `new Date()`; HubSpot datetime
properties return epoch milliseconds through the API, which parses to 1970 and
makes every magic link look expired.

`createOrderDeal` also hardcodes pipeline `default` and stage
`appointmentscheduled`. Both are HubSpot defaults, but confirm they exist.

### Order notification

No confirmation email is sent by this code. Two things cover it:

- **The customer** gets Square's own payment receipt, sent automatically to the
  buyer email in production. Sandbox does not send email — that is a Square
  behaviour, not a defect. Confirm receipts are enabled in the Square Dashboard.
- **The shop owner** is notified by HubSpot. Deals are created with
  `hubspot_owner_id` set, and HubSpot notifies an owner when a deal is assigned
  to them. Sales Hub Starter also supports a pipeline-stage automation that
  emails on entry to the first stage. Either works; both are configured in
  HubSpot, not here.

The notification only has to say a sale happened. The detail lives on the
records: `order_items`, `shipping_address`, and `square_receipt_url` on the
deal, and the customer's address and phone on the associated contact.

Deals are created server-side in `process-payment` via `ctx.waitUntil()`, so a
closed browser cannot lose one and a HubSpot outage cannot fail a charge that
already succeeded. Failures are logged; look for `[Order]` in `wrangler tail`.

Set `HUBSPOT_OWNER_ID` per environment in `wrangler.toml`. If it is unset the
deal is still created, just unassigned — and nobody is notified.

## Inventory and out-of-stock

Out-of-stock only works for items with **inventory tracking enabled in Square**
(Items → the item → Manage stock). Untracked items are always purchasable —
that is deliberate, so enabling this feature cannot take a whole catalog
offline.

Stock resolves three ways:

- **0** — out of stock. Add to Cart is disabled and the product shows "Out of
  Stock". The product stays visible and can still be favourited.
- **a number** — tracked count, the sale is gated on it.
- **unknown** — Square is not tracking this variation, so it stays purchasable.

Stock is enforced at payment, not only in the storefront. `process-payment`
re-checks the cart against live counts before creating the Square order and
returns 409 if anything is short, so a cached page or a direct API call cannot
buy the last unit twice. Nothing is charged and no order is created when that
happens.

The check is deliberately permissive: an untracked variation, an unreachable
Inventory API, or a variation missing from the catalog all allow the sale.
Blocking every checkout because Square is unreachable is worse than a rare
oversell.

If the Square Inventory API is unavailable the Worker treats stock as unknown
rather than marking everything sold out. That fails toward selling rather than
toward an empty-looking store; a sustained outage could oversell.

## Sales tax

Kansas buyers are charged Kansas sales tax. Buyers in other states are charged
nothing, because sales tax is only owed elsewhere once an economic nexus
threshold is crossed there — commonly $100,000 in gross revenue or 200
transactions annually in that state.

**The rate lives in Square.** It is a catalog tax object; edit its percentage in
the Square Dashboard under Items & Orders → Settings → Sales taxes. No deploy
needed. Use the real combined state-plus-local rate for the shop's location, not
the 6.5% Kansas state rate on its own.

**The condition lives in code** — `shouldApplyKansasTax()` in
`src/pricing.js` — because who owes tax is a legal rule, not a setting. When
the shop approaches a nexus threshold in another state, that function becomes a
list of states rather than a single check.

An unrecognised or missing state is treated as out-of-state and not taxed. That
undercharges rather than charging tax that was never owed.

## Shipping

A flat fee applied to every order. **The amount is the price of a catalog item
called `Shipping`.**

Once that item exists and `SQUARE_SHIPPING_VARIATION_ID_PRODUCTION` (or
`_SANDBOX`) points at it, **changing its price in Square Items needs no
deploy** — the Worker reads the price at request time. **Creating the item
for the first time is not deploy-free**: the Worker only reads the price it's
told to read, so `SQUARE_SHIPPING_VARIATION_ID_PRODUCTION` must be set to the
new item's variation id in `wrangler.toml` and the Worker redeployed before a
new `Shipping` item does anything. Until then it just sits in the catalog —
priced, but not charged to anyone.

If no shipping item is configured, **shipping is free**. That makes the feature
safe to enable before a fee has been decided, and means a misconfiguration
undercharges rather than stranding a customer at checkout.

Square API 2024-12-18 has no catalog service-charge object, which is why the fee
lives on an item price and is applied as an ad-hoc order service charge. The
charge is `SUBTOTAL_PHASE` and `taxable: true` so it falls inside the taxed
subtotal — correct for Kansas, where shipping is taxable. Square rejects a
taxable charge in `TOTAL_PHASE`.

The shipping item is excluded from `/api/square-products` and
`/api/square-product` two ways: by variation id (the configured
`SQUARE_SHIPPING_VARIATION_ID_*`), and independently by name — any item
literally named `Shipping` (case-insensitive) is excluded even before the
variation id is configured. Without both checks the item appears in the
storefront as a purchasable product; `available_online: false` does not
persist through the Catalog API, and the variation-id check alone does
nothing for a `Shipping` item created before the id is set.

The variation id is per-account, same as the tax catalog id above and
accessToken/locationId in `squareConfig()` — production and sandbox
credentials must never cross, because a production-deployed Worker can be
flipped onto sandbox credentials per-request by a `sandbox-` prefixed
application id. `SQUARE_SHIPPING_VARIATION_ID_PRODUCTION` is left empty until
a real production `Shipping` item exists, which keeps production shipping
free rather than sending a sandbox-only catalog id to the production account.

There is no free-shipping threshold and no local-pickup option. Both are
straightforward to add and neither has been asked for.

### Why orders carry a fulfillment

The shipping address is attached to the order as a `SHIPMENT` fulfillment with
a recipient. Without it the address exists only as `billing_address` on the
payment, and the Square Dashboard's Orders tab shows no destination — which is
why the shop owner could not see where anything shipped.

## Deploy

```bash
npm test          # unit tests, no network or credentials needed
npm run deploy
npm run tail      # live logs
```

Verify from outside rather than trusting the dashboard:

```bash
curl -s https://hsecommerce-api.<account-subdomain>.workers.dev/api/health
# {"status":"ok","environment":"production","platform":"cloudflare-workers"}
```

The `platform` field distinguishes the Worker from the Vercel deployment, which
returns the same shape without it.

## Cutover order

`utils/config.js` still points at the Vercel deployment, which is what is live.
The theme is therefore safe to upload at any point before the switch.

1. `npm run deploy` — note the `*.workers.dev` URL it prints.
2. Smoke-test against that URL directly (see below). Nothing is switched yet.
3. Set `API_BASE_URL` to the Worker URL in `utils/config.js` **and** in the
   inline script in `templates/layouts/base.hubl.html`.
4. `cd ../hubspot-theme && hs project upload` — storefront switches over.
5. Watch `npm run tail` and the store for a day.
6. Only then delete the Vercel project, and with it `../api`, `../vercel.json`,
   `../keep-alive.js` and `../api/cron/keep-alive.js`.

Rollback at any point after step 4 is reverting those two lines and uploading
the theme again. Keep Vercel alive until step 6 so that rollback stays real.

## Smoke tests

Read-only, no side effects:

```bash
BASE=https://hsecommerce-api.<account-subdomain>.workers.dev/api
curl -s $BASE/health
curl -s $BASE/square-categories | head -c 200
curl -s $BASE/square-products | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["products"]), "products")'
curl -s "$BASE/favorites"        # anonymous: {"success":true,"favorites":[],"count":0}
```

Validation-only, creates no Square order and no charge:

```bash
curl -s -X POST $BASE/process-payment -H 'Content-Type: application/json' \
  -d '{"sourceId":"probe"}'      # {"error":"cartItems are required"}
```

A full checkout must be tested against Square **sandbox**, not production. Any
payment test against production creates a real charge.

## Notes

- The catalog cache is per-isolate with a 5-minute TTL, same as the Vercel
  version. The `Cache-Control: s-maxage=300` header only earns its keep once the
  Worker is on a custom domain — `workers.dev` hostnames are not part of a zone,
  so Cloudflare's edge cache does not sit in front of them. On `workers.dev` the
  in-memory cache is all you get. Fine at this traffic level, and one more
  reason to move to the custom domain eventually.
- `ALLOWED_ORIGINS` in `wrangler.toml` replaces the old blanket
  `Access-Control-Allow-Origin: *`. If it is unset the Worker falls back to `*`,
  so a misconfiguration degrades rather than breaking the store. This is defence
  in depth only — CORS constrains browsers, not `curl`. What actually protects
  `/process-payment` is that the server prices the order from the catalog.
