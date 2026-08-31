# HubSpot E-commerce Project

A modern e-commerce storefront built with HubSpot CMS React and Square payments, with serverless functions hosted on Cloudflare Workers.

## 📁 Project Structure

```
hsecommerce-project/
├── hubspot-theme/      # HubSpot CMS React Theme + App
│   ├── src/
│   │   ├── theme/      # CMS Theme
│   │   │   └── rainy-day-merch/
│   │   │       ├── components/      # Shared React components
│   │   │       ├── modules/         # CMS editable modules
│   │   │       └── templates/       # Page templates
│   │   └── app/        # HubSpot App (API authentication)
│   │       └── app-hsmeta.json
│   ├── hsproject.json
│   └── package.json
│
├── workers/            # Cloudflare Worker (the API) — see workers/README.md
│   ├── src/            # Router, Square, HubSpot, auth
│   ├── test/           # Unit tests (npm test, no credentials needed)
│   └── wrangler.toml   # Worker config; secrets set via `wrangler secret put`
│
├── api/                # LEGACY Vercel functions — delete after cutover
├── vercel.json         # LEGACY Vercel configuration — delete after cutover
├── package.json        # Project dependencies & scripts
├── keep-alive.js       # Local keep-alive script
└── .env                # Local environment variables (not tracked)
```

## 🚀 Quick Start

### 1. HubSpot Theme Setup

```bash
cd hubspot-theme

# Install dependencies
npm install

# Upload to HubSpot
hs project upload

# Preview site
hs project open
```

### 2. Vercel API Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Add your credentials to .env:
# - SQUARE_ACCESS_TOKEN
# - SQUARE_LOCATION_ID
# - SQUARE_APPLICATION_ID
# - HUBSPOT_ACCESS_TOKEN

# Deploy to Vercel
vercel

# Keep functions warm (optional)
npm run keep-alive
```

## 🔑 Required Credentials

### Square Developer Account
1. Go to https://developer.squareup.com/apps
2. Create a new application
3. Get your credentials from the "Credentials" tab:
   - Access Token (Sandbox or Production)
   - Application ID
   - Location ID

### HubSpot Authentication
**Option 1: Personal Access Key (Recommended)**
1. Go to HubSpot → Development → Keys → Personal Access Key
2. Generate a new key (if needed)
3. Select required scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
4. Copy the Access Token

**Option 2: HubSpot App (New Platform) ✅ Recommended**
1. Upload project: `cd hubspot-theme && hs project upload` (includes both theme and app)
2. Get static token: `hs project open` → Find "Rainy Day Merch API" app → Auth tab → Copy token
3. Install app in your HubSpot account (one-time)
4. Add token to Vercel as `HUBSPOT_ACCESS_TOKEN`

## 🛠 Tech Stack

### Frontend (HubSpot Theme)
- **HubSpot CMS React** - Content management and hosting
- **React** - Component library
- **Tailwind CSS** (CDN) - Styling
- **Square Web Payments SDK** - Client-side payment tokenization

### Backend (Cloudflare Worker)
- **Cloudflare Workers** - API endpoints, no cold starts
- **Square Connect API** - Product catalog & payment processing
- **HubSpot CRM API** - Order logging
- **jose** - Session tokens for magic-link auth

## 📚 Documentation

- [Square Setup Guide](./hubspot-theme/SQUARE_SETUP_GUIDE.md) - Detailed Square integration guide
- [HubSpot Project README](./hubspot-theme/README.md) - Theme development guide
- [Marketer Handoff Guide](./MARKETER_HANDOFF_GUIDE.md) - Day-to-day guide for non-developers (copy, banners, inventory, emails)

## 🔒 Security Notes

- **Never commit `.env` files** - These are gitignored
- **Square Access Tokens** are only stored in Vercel environment variables
- **All payment processing happens server-side** via Vercel functions
- **Client-side only receives payment tokens** (not sensitive card data)

## 📝 Development Workflow

1.  **Branching Strategy:**
    *   `mom`: **Production** branch. Only merge here when ready to go live.
    *   `dev`: **Development** branch. All daily production and new features happen here.

2.  **Theme Development:**
    *   Checkout the `dev` branch: `git checkout dev`
    *   Edit components in `hubspot-theme/src/theme/rainy-day-merch/`
    *   Upload to **Test Portal**: `hs project upload --portal=test-account` (see below)
    *   Preview: `hs project open --portal=test-account`

3.  **API Development:**
    *   Edit functions in `api/`
    *   Test locally: `vercel dev`
    *   Deploy to **Preview**: `git push origin dev` (Vercel automatically deploys dev branch to preview)
    *   Deploy to **Production**: Merge `dev` into `mom` and `git push origin mom`

## 🌐 CI/CD & Environments

We use a two-portal and two-branch system to keep production safe.

| Environment | Git Branch | HubSpot Portal | Square Env | Vercel URL |
| :--- | :--- | :--- | :--- | :--- |
| **Production** | `mom` | Main Portal | Production | `rainydaymerchandise.com` |
| **Sandbox/Dev** | `dev` | Dev Test Account | Sandbox | Vercel Preview URL |

### The API host lives in one place

The theme reaches the API at `https://api.rainydaymerchandise.com/api`, declared
in `hubspot-theme/src/theme/rainy-day-merch/utils/config.js`. Import
`API_BASE_URL` from there rather than writing a URL literal.

It was previously hardcoded in nine files, which is why moving off Vercel needed
a nine-file edit. The one place that still repeats it is the inline script in
`templates/layouts/base.hubl.html`, which cannot import an ES module; keep the
two in step.

Using a custom domain rather than a platform hostname (`*.vercel.app`,
`*.workers.dev`) means the next backend move is a DNS change.

### ⚠️ Theme and API deploy separately

Pushing to `mom` deploys **only the API** — Vercel watches the branch, the
HubSpot theme does not. The theme ships when someone runs:

```bash
cd hubspot-theme && hs project upload
```

So a commit touching both halves is only half-live after a push. When a change
spans `api/` and `hubspot-theme/`, deploy both and verify both, or the deployed
API and the deployed theme will disagree about the contract between them.

Two failure modes this has actually caused:

- A fix merged to `dev` and never merged to `mom` stays undeployed indefinitely
  while looking done in the repo. Check `git log origin/mom..origin/dev` before
  assuming something is live.
- An API change that tightens what it accepts (for example requiring cart items
  to carry a catalog `variationId`) breaks checkout for anyone running the older
  theme until the theme upload lands.

Verify a production API deploy from the outside rather than trusting the
dashboard:

```bash
curl -s https://hsecommerce-api.vercel.app/api/health
```

### Vercel Setup:
In Vercel Project Settings, set these Environment Variables:
*   `HUBSPOT_ACCESS_TOKEN`: Set a specific value for **Production** (Real Portal) and **Preview/Development** (Dev Portal).
*   `SQUARE_ENVIRONMENT`: Set to `production` for Production and `sandbox` for Preview.
*   `BASE_URL`: Set to your live domain for Production and your preview/dev portal URL for Preview.

## 🎨 Design

Design based on provided Figma file with custom Tailwind configuration for:
- Primary orange color scheme (#FF6B35)
- Beige background tones (#FAF7F2)
- Playfair Display + Inter fonts
- Responsive grid layouts

## 📦 Features

- ✅ Product catalog from Square
- ✅ Shopping cart with localStorage persistence
- ✅ Secure checkout with Square Web Payments SDK
- ✅ Order tracking in HubSpot CRM (Deals)
- ✅ CMS-editable content (Hero, Text, Images, Product Showcases)
- ✅ Responsive design (mobile, tablet, desktop)

## 🤝 Contributing

This is a private e-commerce project. Contact the repository owner for access.

## 📄 License

Proprietary - All Rights Reserved

