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

A fresh portal needs both the right scopes and five custom properties. Miss the
properties and HubSpot rejects the writes with a 400 — and `create-deal`'s
failure is swallowed by the checkout island, so you get a "successful" checkout
with no deal and no visible reason.

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

`magic_link_expires` must be **text, not datetime**. The code writes
`expiresAt.toISOString()` and reads it back with `new Date()`; HubSpot datetime
properties return epoch milliseconds through the API, which parses to 1970 and
makes every magic link look expired.

`handleCreateDeal` also hardcodes pipeline `default` and stage
`appointmentscheduled`. Both are HubSpot defaults, but confirm they exist.

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
