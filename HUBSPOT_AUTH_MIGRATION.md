# HubSpot Authentication Migration Guide

## Current Situation

HubSpot is moving away from **Legacy Apps** (Private Apps) and encouraging the new developer platform (2025.2). For server-side API calls from Vercel, we have two options:

## Option 1: Personal Access Key (Recommended for Server-Side)

**What it is:** A user-specific access key that provides authenticated access to HubSpot APIs.

**How to set it up:**
1. Go to HubSpot → Development → Keys → Personal Access Key
2. Generate a new key (if you don't have one)
3. Select required scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
4. Copy the key → Add to Vercel as `HUBSPOT_ACCESS_TOKEN`

**Pros:**
- ✅ Simple - no OAuth flow needed
- ✅ Perfect for server-side API calls
- ✅ User-specific (more secure than account-wide)
- ✅ Works immediately

**Cons:**
- ⚠️ Only one key per account
- ⚠️ Tied to your user account

## Option 2: HubSpot App with Static Auth (New Platform) ✅ RECOMMENDED

**What it is:** A HubSpot App created on the new platform (2025.2) with `private` distribution and `static` authentication.

**How to set it up:**
The app is already created in `hubspot-app/` directory:

```bash
cd hubspot-app
hs project upload
```

Then:
1. Get the static token: `hs project open` → Auth tab → Copy static token
2. Add to Vercel as `HUBSPOT_ACCESS_TOKEN`
3. Install the app in your HubSpot account (one-time)

**Configuration:**
- **Distribution:** `private` - Single account only
- **Auth:** `static` - No OAuth flow needed
- **Scopes:** Contacts & Deals read/write

**Pros:**
- ✅ Uses new platform (future-proof)
- ✅ Can be managed as code (version controlled)
- ✅ Better for team collaboration
- ✅ No OAuth complexity
- ✅ Single account restriction (secure)

**Cons:**
- ⚠️ Requires one-time app installation
- ⚠️ Slightly more setup than Personal Access Key

## Option 3: HubSpot App with OAuth (For Multi-Account)

If you need to support multiple HubSpot accounts, use OAuth:

```bash
hs project create \
  --project-base app \
  --distribution private \
  --auth oauth \
  --name "Your App Name" \
  --dest hubspot-app
```

Then implement OAuth flow in your backend.

## Recommendation

**For our use case (single account, server-side API calls):**
- Use **Personal Access Key** (Option 1) - simplest and works perfectly
- Or use **HubSpot App with Static Auth** (Option 2) - if you want to use the new platform

Both will work with our current code - just update the `HUBSPOT_ACCESS_TOKEN` in Vercel.

## Migration Steps

1. **Generate Personal Access Key** (or create HubSpot App)
2. **Update Vercel environment variable:**
   ```
   HUBSPOT_ACCESS_TOKEN=your_new_token_here
   ```
3. **Test the API endpoints** - they should work immediately
4. **No code changes needed** - our API already uses `process.env.HUBSPOT_ACCESS_TOKEN`

## Current Code Compatibility

Our current implementation in `vercel-api/api/favorites.js` and `vercel-api/api/create-deal.js` already uses:
```javascript
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
```

This works with:
- ✅ Personal Access Keys
- ✅ HubSpot App static tokens
- ✅ OAuth access tokens (if implementing OAuth flow)

**No code changes required** - just update the token source!

