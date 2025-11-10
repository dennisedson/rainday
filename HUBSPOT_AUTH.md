# HubSpot Authentication Methods

## Current Implementation: Private App (Recommended for CMS Themes)

We're using **HubSpot Private Apps** for server-side API authentication, which is the correct approach for:
- CMS themes making server-side API calls
- Vercel serverless functions
- Direct CRM API access

### Setup:
1. HubSpot Settings → Integrations → Private Apps
2. Create private app with scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.write`
3. Copy access token → Add to Vercel environment variables as `HUBSPOT_ACCESS_TOKEN`

### Why This Works:
- ✅ Simple server-side authentication
- ✅ No OAuth flow needed
- ✅ Perfect for CMS themes
- ✅ Still supported by HubSpot

## New Developer Platform (2025.2) - For HubSpot Apps

The new platform (`hs project create`) is for building **HubSpot Apps** (extensions, cards, etc.), not CMS themes.

### When to Use:
- Building HubSpot App extensions
- Creating app cards for CRM records
- Building custom workflow actions
- Creating marketplace apps

### Not Needed For:
- ❌ CMS themes (what we're building)
- ❌ Server-side API calls from external services
- ❌ Simple CRM integrations

## Our Use Case

**What we're building:**
- HubSpot CMS Theme (React components)
- Server-side API endpoints (Vercel)
- CRM integration (favorites, deals)

**Current approach:**
- ✅ Private App token for server-side auth
- ✅ HubSpot tracking code for visitor identification
- ✅ Direct CRM API calls

**This is correct and doesn't need to change.**

## Future Considerations

If we later want to build HubSpot App features (like a favorites card on contact records), we would:
1. Create a HubSpot App using `hs project create`
2. Set up OAuth authentication
3. Build app features (cards, etc.)
4. Keep the CMS theme separate

But for now, our Private App approach is perfect for our needs.

