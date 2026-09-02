# Rollback: Cloudflare cutover

The storefront reaches its API through one constant. Rolling back means
pointing that constant back at Vercel and uploading the theme. It does **not**
require touching Cloudflare, reverting commits, or a Vercel redeploy.

**Rollback point:** tag `prod-pre-cloudflare-20260901` (`e5a6dbb`)

## Fast path — about two minutes

```bash
cd ~/Development/rainday
git checkout prod-pre-cloudflare-20260901 -- \
  hubspot-theme/src/theme/rainy-day-merch/utils/config.js \
  hubspot-theme/src/theme/rainy-day-merch/templates/layouts/base.hubl.html

cd hubspot-theme && hs project upload --account=<production account id>
```

That restores the two files that name the API host and republishes the theme.
Traffic returns to Vercel as soon as the upload completes.

Verify:

```bash
curl -s https://hsecommerce-api.vercel.app/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://www.rainydaymerchandise.com
```

Then load the store and confirm the network tab shows requests going to
`hsecommerce-api.vercel.app` rather than `*.workers.dev`.

## What makes this work

`utils/config.js` picks the API host from the hostname the page is served on.
The Worker is not wired into anything else — no DNS points at it, and the
storefront runs on HubSpot. So the theme is the only thing that decides which
backend serves the store, and a theme upload is the whole switch.

The Worker keeps running after a rollback. That is fine; it just stops
receiving traffic.

## The one thing that would break this

**Do not delete the Vercel project.** Rollback works only while
`hsecommerce-api.vercel.app` is still serving. Keep it until the Worker has
handled real traffic for at least a few days, then delete it along with `api/`,
`vercel.json`, and the two `keep-alive` scripts.

Also keep `.env.production.local` recoverable (`vercel env pull`) until then —
`JWT_SECRET` signs customer sessions and cannot be regenerated without logging
everyone out.

## If the Worker itself is the problem

To roll back a bad Worker version without changing the storefront:

```bash
cd workers
npx wrangler deployments list --env=""
npx wrangler rollback [version-id] --env=""
```

## Full revert of the merge

Only if you want the commits gone rather than the traffic moved:

```bash
git checkout mom
git revert -m 1 <merge-commit-sha>
git push origin mom
cd hubspot-theme && hs project upload --account=<production account id>
```

The theme upload is still required — reverting the commit does not republish
the theme by itself.
