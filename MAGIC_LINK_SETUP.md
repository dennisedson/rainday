# Magic Link Authentication Setup Guide

## Overview

Magic link authentication allows users to sign in without passwords. Users enter their email, receive a magic link, and click it to sign in.

## HubSpot CRM Setup

### 1. Create Custom Contact Properties

In HubSpot CRM, create these custom contact properties:

1. **magic_link_token** (Text, Single-line text)
   - Internal name: `magic_link_token`
   - Label: "Magic Link Token"
   - Description: "Temporary token for passwordless login"

2. **magic_link_expires** (Date, Date picker with time)
   - Internal name: `magic_link_expires`
   - Label: "Magic Link Expires"
   - Description: "Expiration date and time for magic link token"
   - **Important:** Must include time (not just date) since links expire after 15 minutes

### Steps to Create Properties:

1. Go to HubSpot → Settings → Properties → Contact properties
2. Click "Create property"
3. Fill in the details above
4. Save the property

## Vercel Environment Variables

Add these to your Vercel environment variables:

```bash
# Magic Link Authentication
JWT_SECRET=3930488cc87cbae6ef3bce7b36fd3d082bcd5bc70f803f1676998202446962a2
MAGIC_LINK_SECRET=6cd82de2f78d96e80b6399e31e9d4c3d2bb7f43275cbdef06a8490bea6868476
BASE_URL=https://www.rainydaymerchandise.com
```

**Note:** `BASE_URL` must include `https://` (full URL) since it's used to construct magic link URLs.

## Email Service Setup (Optional)

Currently, magic links are logged to console in development. For production, integrate an email service:

### Option 1: Resend (Recommended - Free tier available)

1. Sign up at https://resend.com
2. Get API key
3. Add to Vercel: `RESEND_API_KEY=your_key`
4. Uncomment email code in `vercel-api/api/auth/magic-link.js`

### Option 2: HubSpot Transactional Email

Use HubSpot's transactional email API (requires HubSpot account).

### Option 3: SendGrid, Mailgun, etc.

Any email service with an API can be integrated.

## Testing

### Development Mode

In development (`NODE_ENV=development`), the API returns the magic link in the response for testing:

```json
{
  "success": true,
  "message": "If an account exists with this email, a magic link has been sent.",
  "magicLink": "https://www.rainydaymerchandise.com/auth/verify?token=..."
}
```

### Production Mode

In production, users receive the magic link via email only.

## User Flow

1. User visits `/login`
2. Enters email address
3. Clicks "Send magic link"
4. Receives email with magic link
5. Clicks link → Redirected to `/account`
6. Session token stored in localStorage
7. Header shows "Account" icon instead of "Sign In"

## Security Features

- ✅ Magic links expire after 15 minutes
- ✅ Single-use tokens (cleared after verification)
- ✅ JWT tokens expire after 30 days
- ✅ Secure token generation (crypto.randomBytes)
- ✅ HTTPS-only in production

## Troubleshooting

### "Magic link properties not configured"

Make sure you've created the custom properties in HubSpot CRM (see above).

### Magic link not working

1. Check Vercel logs for errors
2. Verify `JWT_SECRET` and `MAGIC_LINK_SECRET` are set
3. Check that `BASE_URL` matches your domain
4. Verify HubSpot custom properties exist

### Email not sending

- In development, check console logs for the magic link
- In production, verify email service API key is configured
- Check email service logs/dashboard

## Next Steps

1. ✅ Create HubSpot custom properties
2. ✅ Add Vercel environment variables
3. ✅ Deploy Vercel API
4. ✅ Upload HubSpot theme
5. ⏳ Set up email service (optional for production)
6. ⏳ Test magic link flow

