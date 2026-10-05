# HubSpot E-commerce Project

The Rainy Day Merchandise storefront: a HubSpot CMS React theme with Square payments, backed by an API on Cloudflare Workers.

## 🌐 Environments

Two branches, two of everything else.

| | Production | Staging |
| :--- | :--- | :--- |
| Git branch | `mom` | `dev` |
| Site | https://www.rainydaymerchandise.com | https://51953677.hs-sites.com |
| HubSpot portal | `50683682` | `51953677` (test portal) |
| Square | Production | Sandbox |
| Worker | `hsecommerce-api` | `hsecommerce-api-sandbox` |
| Worker URL | https://hsecommerce-api.dennis-544.workers.dev/api | https://hsecommerce-api-sandbox.dennis-544.workers.dev/api |

Staging takes orders against Square sandbox, so no money moves. Pay with
Square's sandbox test card `4111 1111 1111 1111`, any future expiry date, and
any CVV and ZIP. Staging sends email only if the sandbox Worker has its own
`RESEND_API_KEY` (see `workers/README.md`).

HubSpot preview URLs from the test portal also count as staging: any hostname
that isn't a production domain gets the sandbox Worker (see "Which backend the
theme talks to" below).

## 📁 Project Structure

```
rainday/
├── hubspot-theme/          # HubSpot CMS React theme + app
│   ├── hsproject.json
│   └── src/
│       ├── app/            # HubSpot app (API authentication)
│       └── theme/rainy-day-merch/
│           ├── components/ # islands/, modules/, shared/
│           ├── templates/  # HubL page templates
│           ├── utils/      # client helpers; config.js picks the API host
│           └── styles/
│
├── workers/                # Cloudflare Worker (the API), see workers/README.md
│   ├── src/                # Router, Square, HubSpot, auth, email
│   ├── test/               # Unit tests (npm test, no credentials needed)
│   └── wrangler.toml       # Worker config; secrets set via `wrangler secret put`
│
├── docs/                   # Owner handbook, owner setup guide, design specs and plans
├── scripts/                # One-off setup (HubSpot custom properties)
├── .github/workflows/      # CI: tests on every PR, deploys on push to dev or mom
│
├── api/, vercel.json       # LEGACY Vercel API, unused since the 1 Sep 2026 cutover
├── package.json            # LEGACY: scripts run the Vercel API (vercel dev, vercel --prod)
└── keep-alive.js, keep-alive.sh  # LEGACY: kept Vercel warm; Workers don't need it
```

## 🚀 Quick Start

### The API (Cloudflare Worker)

```bash
cd workers
npm install
npm test        # unit tests, no network or credentials needed
npm run dev     # wrangler dev, a local Worker
```

Secrets, deploys and smoke tests are in `workers/README.md`.

### The theme

```bash
cd hubspot-theme/src/theme/rainy-day-merch
npm install
npm run start   # local HubSpot dev server
```

To try a theme change on the test portal before merging:

```bash
cd hubspot-theme
hs project upload --account=51953677
```

> **Never run a bare `hs project upload`.** It uploads to whichever account is
> the CLI's default, and on at least one machine that's production. On
> 2 October 2026 a bare upload put `dev`'s theme on the live site a day before
> the Worker changes it depended on, which broke order history and favorites
> until the merge. Production gets the theme from CI when a change merges to
> `mom`. If the test portal isn't in your CLI config yet, add it with
> `hs account auth`.

## 🔑 Required Credentials

### Square
1. Go to https://developer.squareup.com/apps.
2. Open the application, then its **Credentials** tab.
3. Copy the access token, application ID and location ID, for sandbox and production separately.

### HubSpot
Each portal needs **two** HubSpot credentials, and they aren't
interchangeable: a CLI personal access key for `hs project upload` (stored as a
GitHub secret), and a private app token for the Worker's CRM calls (stored as a
Cloudflare secret). `workers/README.md` explains how to tell them apart and
which scopes each needs.

### Resend
One Resend API key sends both sign-in links and order confirmation emails. It's
a Cloudflare secret on each Worker. Give sandbox its own sending-only key rather
than a copy of production's.

## 🛠 Tech Stack

### Frontend (HubSpot Theme)
- **HubSpot CMS React** - Content management and hosting
- **React** - Component library
- **Tailwind CSS** (CDN) - Styling
- **Square Web Payments SDK** - Client-side payment tokenization

### Backend (Cloudflare Worker)
- **Cloudflare Workers** - API endpoints, no cold starts
- **Square Connect API** - Product catalog, stock, and payment processing
- **HubSpot CRM API** - Customers, orders (deals), favorites
- **Resend** - Sign-in links and order confirmation emails
- **jose** - Session tokens for magic-link auth

## 📚 Documentation

- [Worker README](./workers/README.md) - API setup, secrets, HubSpot portal setup, order notification, inventory, tax, shipping, deploys, smoke tests
- [Checkout Flow](./CHECKOUT_FLOW.md) - How the cart and checkout pages are built (November 2025)
- [Category Banner Guide](./CATEGORY_BANNER_GUIDE.md) - Editing the text on category banners
- [Rollback](./ROLLBACK.md) - Rolling back the Cloudflare cutover, or a bad Worker deploy
- [Owner handbook](./docs/running-rainy-day.html) - Day-to-day instructions for the shop owner: products, orders, refunds, the website. Shared with her as a published page
- [Owner setup guide](./docs/dani-setup-guide.html) - One-time HubSpot setup for the shop owner, including the new-order alert
- [Marketer Handoff Guide](./MARKETER_HANDOFF_GUIDE.md) - Older guide for non-developers (January 2026). It predates the Cloudflare move and still refers to Vercel; the owner handbook supersedes it

## 🔒 Security Notes

- **Never commit `.env` files.** They are gitignored.
- **Square, HubSpot and Resend secrets live in Cloudflare** as Worker secrets, set with `wrangler secret put`. The repo holds only non-secret settings in `wrangler.toml`.
- **All payment processing happens server-side** in the Worker. Square prices every order from the catalog; the browser's total is only compared, never charged.
- **The browser only handles Square payment tokens**, never card data.

## 📝 Development Workflow

1. Work on `dev`.
2. Push to `dev`. CI runs the tests, deploys the sandbox Worker if `workers/**` changed, and uploads the theme to the test portal if `hubspot-theme/**` changed.
3. Check the change on staging: https://51953677.hs-sites.com.
4. Open a pull request from `dev` to `mom`. Merging deploys production the same way.

Before assuming something is live, check `git log origin/mom..origin/dev`: a
fix that's only on `dev` is only on staging.

## ⚙️ CI/CD

`.github/workflows/ci.yml` runs the Worker tests and a bundle check on every
pull request, then on a push to `dev` or `mom` deploys whichever halves changed:

- `workers/**` changed → `wrangler deploy` (`--env sandbox` on `dev`), then
  polls `/api/health` until it reports the expected environment. A deploy that
  does not answer fails the run.
- `hubspot-theme/**` changed → `hs project upload` to that branch's portal.

Path filtering means a Worker-only change does not reupload the theme, and a
change spanning both deploys both.

**Deploying on merge is the point.** A merged fix cannot sit unreleased; a July
security fix once sat on `dev` for seven weeks because deploying was a separate
manual act.

> **Known issue (October 2026):** the theme upload to the test portal has
> failed on every `dev` push since 1 September, with "refresh token was
> malformed". The `HUBSPOT_PERSONAL_ACCESS_KEY` secret in the GitHub `sandbox`
> environment needs replacing with a fresh CLI personal access key from the
> test portal. Until then, staging runs the theme as of 1 September; the
> sandbox Worker deploys normally.

### Which backend the theme talks to

Chosen at runtime from the hostname, in
`hubspot-theme/src/theme/rainy-day-merch/utils/config.js`, so one build serves
both portals. Production domains get the production Worker; everything else
gets sandbox. Unknown hostnames default to **sandbox** on purpose — guessing
wrong that way shows the wrong catalog, while guessing wrong towards production
would take real card payments from a test page.

### Required GitHub secrets

Set these per environment under **Settings → Environments** (`production` and
`sandbox`), not as repo-wide secrets, so the test portal's key can never deploy
to the live one:

| Secret | Notes |
| :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | Scope: *Edit Cloudflare Workers* |
| `CLOUDFLARE_ACCOUNT_ID` | |
| `HUBSPOT_ACCOUNT_ID` | `50683682` for production, `51953677` for sandbox |
| `HUBSPOT_PERSONAL_ACCESS_KEY` | A CLI personal access key, not a private app token. Differs per portal |

The Worker's own secrets (Square tokens, `JWT_SECRET`, HubSpot token, Resend
key) live in Cloudflare, not GitHub — `wrangler deploy` does not need them. Set
them per environment with `wrangler secret put NAME --env sandbox`.

Bootstrap them with the `gh` CLI rather than pasting into the web UI. Create the
two environments, then load a dotenv file into each:

```bash
gh api -X PUT repos/:owner/:repo/environments/sandbox
gh api -X PUT repos/:owner/:repo/environments/production

gh secret set -f .env.github.sandbox.local    --env sandbox
gh secret set -f .env.github.production.local --env production
```

Those two files are **gitignored and must stay that way** — they hold live
credentials. `.gitignore` covers them via `.env.*.local`; verify with
`git check-ignore .env.github.sandbox.local` before committing anything.

The CI HubSpot key needs CMS/content scopes on top of the four CRM scopes, since
it runs `hs project upload`. A key scoped only for the CRM calls will pass the
Worker jobs and fail the theme job.

Using GitHub *Environments* also lets you require a manual approval before any
`mom` deploy, which is worth turning on for production.

### The API host lives in one place

The API host is declared in
`hubspot-theme/src/theme/rainy-day-merch/utils/config.js`. Import `API_BASE_URL`
from there rather than writing a URL literal.

It was previously hardcoded in nine files, which is why moving off Vercel needed
a nine-file edit. The one place that still repeats it is the inline script in
`templates/layouts/base.hubl.html`, which cannot import an ES module; keep the
two in step.

A custom domain (`api.rainydaymerchandise.com`) would reduce this to a DNS
change, but it requires moving the whole zone to Cloudflare DNS. That is
deliberately deferred — see `workers/README.md`.

### Keeping the theme and the Worker in step

CI deploys both halves from the same commit, so they only drift apart when
something skips or breaks that path:

- **A manual upload.** `hs project upload` from a laptop ships whatever is
  checked out, whether or not the Worker it needs has been deployed. This is
  what happened on 2 October 2026.
- **A failed theme job.** The Worker deploys and the theme doesn't, as on
  staging since 1 September.
- **A fix that stays on `dev`.** It looks done in the repo but isn't live.

An API change that tightens what it accepts (for example requiring cart items
to carry a catalog `variationId`) breaks checkout for anyone running the older
theme until the theme upload lands, so ship both halves together.

Verify a deploy from the outside rather than trusting the dashboard:

```bash
curl -s https://hsecommerce-api.dennis-544.workers.dev/api/health
curl -s https://hsecommerce-api-sandbox.dennis-544.workers.dev/api/health
```

## 🎨 Design

Design based on provided Figma file with custom Tailwind configuration for:
- Primary orange color scheme (#FF6B35)
- Beige background tones (#FAF7F2)
- Playfair Display + Inter fonts
- Responsive grid layouts

## 📦 Features

- ✅ Product catalog, categories and photos from Square
- ✅ Stock enforced at purchase for items with tracking on
- ✅ Kansas sales tax and a flat shipping fee, both set in Square
- ✅ Shopping cart with localStorage persistence
- ✅ Secure checkout with Square Web Payments SDK, priced server-side
- ✅ Orders recorded as HubSpot deals, with a new-order alert to the owner
- ✅ Magic-link sign-in, order history, and saved favorites
- ✅ CMS-editable content (Hero, Text, Images, Product Showcases, cover photos)
- ✅ Responsive design (mobile, tablet, desktop)

## 🤝 Contributing

This is a private e-commerce project. Contact the repository owner for access.

## 📄 License

Proprietary - All Rights Reserved
