# HubSpot App - Rainy Day Merch API

This HubSpot App provides server-side API authentication for the e-commerce integration.

## Setup

1. **Upload the app:**
   ```bash
   cd hubspot-app
   hs project upload
   ```

2. **Get the static token:**
   - Run `hs project open` to open the project in HubSpot
   - Go to the Auth tab
   - Copy the static token

3. **Add to Vercel:**
   - Add `HUBSPOT_ACCESS_TOKEN` environment variable
   - Use the static token from step 2

## Configuration

- **Distribution:** `private` - Single account only
- **Auth:** `static` - No OAuth flow needed
- **Scopes:**
  - `crm.objects.contacts.read`
  - `crm.objects.contacts.write`
  - `crm.objects.deals.read`
  - `crm.objects.deals.write`

## Why Static Auth?

- ✅ Simple - no OAuth flow needed
- ✅ Perfect for server-side API calls
- ✅ Single account restriction (secure)
- ✅ Works immediately after upload

See: https://developers.hubspot.com/docs/apps/developer-platform/build-apps/app-configuration#distribution

