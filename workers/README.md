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

### Custom domain

In the Cloudflare dashboard: **Workers & Pages → hsecommerce-api → Settings →
Domains & Routes → Add custom domain** → `api.rainydaymerchandise.com`.

If `rainydaymerchandise.com` is not on Cloudflare DNS, add a CNAME for `api`
pointing at the worker's `*.workers.dev` hostname at your current DNS provider.

## Deploy

```bash
npm test          # unit tests, no network or credentials needed
npm run deploy
npm run tail      # live logs
```

Verify from outside rather than trusting the dashboard:

```bash
curl -s https://api.rainydaymerchandise.com/api/health
# {"status":"ok","environment":"production","platform":"cloudflare-workers"}
```

The `platform` field distinguishes the Worker from the Vercel deployment, which
returns the same shape without it.

## Cutover order

The theme now points at `api.rainydaymerchandise.com`, which does not resolve
until step 2. Do not upload the theme before then.

1. `npm run deploy` — Worker live on `*.workers.dev`.
2. Add the custom domain; confirm `/api/health` answers on it.
3. Smoke-test against the Worker directly (see below).
4. `cd ../hubspot-theme && hs project upload` — storefront switches over.
5. Watch `npm run tail` and the store for a day.
6. Only then delete the Vercel project, and with it `../api`, `../vercel.json`,
   `../keep-alive.js` and `../api/cron/keep-alive.js`.

Keeping Vercel alive through steps 1–5 means rollback is a one-line revert of
`utils/config.js` plus a theme upload.

## Smoke tests

Read-only, no side effects:

```bash
BASE=https://api.rainydaymerchandise.com/api
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
  version. The `Cache-Control: s-maxage=300` header is what does the real work
  once the custom domain puts Cloudflare's edge cache in front.
- `ALLOWED_ORIGINS` in `wrangler.toml` replaces the old blanket
  `Access-Control-Allow-Origin: *`. If it is unset the Worker falls back to `*`,
  so a misconfiguration degrades rather than breaking the store. This is defence
  in depth only — CORS constrains browsers, not `curl`. What actually protects
  `/process-payment` is that the server prices the order from the catalog.
