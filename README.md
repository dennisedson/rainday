# HubSpot E-commerce Project

A modern e-commerce storefront built with HubSpot CMS React and Square payments, with serverless functions hosted on Vercel.

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
├── api/                # Vercel Serverless Functions
│   ├── auth/           # Authentication endpoints
│   ├── cron/           # Background jobs
│   └── ...             # Core API endpoints
├── vercel.json         # Vercel configuration
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

### Backend (Vercel API)
- **Vercel Serverless Functions** - API endpoints
- **Square Connect API** - Product catalog & payment processing
- **HubSpot CRM API** - Order logging

## 📚 Documentation

- [Square Setup Guide](./hubspot-theme/SQUARE_SETUP_GUIDE.md) - Detailed Square integration guide
- [HubSpot Project README](./hubspot-theme/README.md) - Theme development guide

## 🔒 Security Notes

- **Never commit `.env` files** - These are gitignored
- **Square Access Tokens** are only stored in Vercel environment variables
- **All payment processing happens server-side** via Vercel functions
- **Client-side only receives payment tokens** (not sensitive card data)

## 📝 Development Workflow

1. **Theme Development:**
   - Edit components in `hubspot-theme/src/theme/rainy-day-merch/`
   - Upload changes: `hs project upload`
   - Preview: `hs project open`

2. **API Development:**
   - Edit functions in `api/`
   - Test locally: `vercel dev`
   - Deploy: `vercel --prod`

3. **Deployment:**
   - Theme → HubSpot (via `hs project upload`)
   - API → Vercel (via `vercel` CLI)

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

