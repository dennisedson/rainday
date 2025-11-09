# HubSpot E-commerce Project

A modern e-commerce storefront built with HubSpot CMS React and Square payments, with serverless functions hosted on Vercel.

## 📁 Project Structure

```
hsecommerce-project/
├── hubspot-theme/      # HubSpot CMS React Theme
│   ├── src/
│   │   └── theme/
│   │       └── rainy-day-merch/
│   │           ├── components/      # Shared React components
│   │           ├── modules/         # CMS editable modules
│   │           ├── partials/        # Header, Footer
│   │           └── templates/       # Page templates
│   ├── hsproject.json
│   └── package.json
│
└── vercel-api/         # Vercel Serverless Functions
    ├── api/
    │   ├── square-products.js      # Fetch products from Square
    │   ├── process-payment.js      # Process Square payments
    │   └── create-deal.js          # Log orders in HubSpot CRM
    ├── vercel.json
    ├── package.json
    └── .env (not tracked - add your credentials)
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
cd vercel-api

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
```

## 🔑 Required Credentials

### Square Developer Account
1. Go to https://developer.squareup.com/apps
2. Create a new application
3. Get your credentials from the "Credentials" tab:
   - Access Token (Sandbox or Production)
   - Application ID
   - Location ID

### HubSpot Private App
1. Go to HubSpot Settings → Integrations → Private Apps
2. Create a private app with scopes:
   - `crm.objects.deals.write`
   - `crm.objects.deals.read`
3. Copy the Access Token

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
- [Vercel API README](./vercel-api/README.md) - API deployment instructions
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
   - Edit functions in `vercel-api/api/`
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

