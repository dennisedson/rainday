# Cron Job Setup for Keep-Alive

This document explains how to set up automated keep-alive pings for your Vercel API functions.

## Option 1: Vercel Cron Jobs (Pro Plan - Recommended)

If you have Vercel Pro ($20/month), you can use built-in cron jobs.

### Setup

1. **Already configured** - The cron job is already set up in `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/keep-alive",
         "schedule": "*/5 * * * *"
       }
     ]
   }
   ```

2. **Deploy** - Just deploy and it will run automatically:
   ```bash
   vercel --prod
   ```

3. **Monitor** - Check cron job runs in Vercel Dashboard:
   - Go to your project → Settings → Cron Jobs
   - View execution logs

### Schedule Format

The schedule uses cron syntax: `*/5 * * * *` means "every 5 minutes"

Common schedules:
- `*/5 * * * *` - Every 5 minutes (recommended)
- `*/10 * * * *` - Every 10 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours

## Option 2: External Cron Service (Free Tier)

For free tier, use an external cron service to call the endpoint.

### Setup with cron-job.org (Free)

1. **Sign up** at [cron-job.org](https://cron-job.org) (free)

2. **Create a cron job**:
   - **Title**: Vercel Keep-Alive
   - **URL**: `https://hsecommerce-api.vercel.app/api/cron/keep-alive`
   - **Schedule**: Every 5 minutes (`*/5 * * * *`)
   - **Request Method**: GET
   - **Save**

3. **Optional: Add security**:
   - Set `CRON_SECRET` environment variable in Vercel
   - Add `?secret=YOUR_SECRET` to the URL

### Setup with UptimeRobot (Free)

1. **Sign up** at [UptimeRobot](https://uptimerobot.com) (free)

2. **Add New Monitor**:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Vercel Keep-Alive
   - **URL**: `https://hsecommerce-api.vercel.app/api/cron/keep-alive`
   - **Monitoring Interval**: 5 minutes
   - **Save**

### Setup with EasyCron (Free)

1. **Sign up** at [EasyCron](https://www.easycron.com) (free)

2. **Create Cron Job**:
   - **URL**: `https://hsecommerce-api.vercel.app/api/cron/keep-alive`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **HTTP Method**: GET
   - **Save**

## Option 3: GitHub Actions (Free)

If your code is in GitHub, you can use GitHub Actions:

1. **Create `.github/workflows/keep-alive.yml`**:
   ```yaml
   name: Keep Vercel Functions Warm
   
   on:
     schedule:
       - cron: '*/5 * * * *'  # Every 5 minutes
     workflow_dispatch:  # Allow manual trigger
   
   jobs:
     ping:
       runs-on: ubuntu-latest
       steps:
         - name: Ping Keep-Alive Endpoint
           run: |
             curl -s "https://hsecommerce-api.vercel.app/api/cron/keep-alive"
   ```

2. **Commit and push** - GitHub will run it automatically

## Security (Optional)

To secure the cron endpoint, set a secret:

1. **Add environment variable in Vercel**:
   ```bash
   vercel env add CRON_SECRET
   # Enter a random secret when prompted
   ```

2. **Update cron URL**:
   ```
   https://hsecommerce-api.vercel.app/api/cron/keep-alive?secret=YOUR_SECRET
   ```

## Testing

Test the endpoint manually:

```bash
curl https://hsecommerce-api.vercel.app/api/cron/keep-alive
```

Expected response:
```json
{
  "timestamp": "2025-11-12T16:00:00.000Z",
  "total": 3,
  "successful": 3,
  "failed": 0,
  "results": [
    { "endpoint": "Health", "success": true, "status": "ok" },
    { "endpoint": "Categories", "success": true, "status": "ok" },
    { "endpoint": "Products", "success": true, "status": "ok" }
  ]
}
```

## Monitoring

Check if cron jobs are running:

1. **Vercel Dashboard** (Pro plan):
   - Project → Settings → Cron Jobs
   - View execution history and logs

2. **External Services**:
   - Check execution logs in your cron service dashboard
   - Set up email alerts for failures

3. **Manual Check**:
   ```bash
   curl https://hsecommerce-api.vercel.app/api/cron/keep-alive
   ```

## Troubleshooting

**Cron job not running:**
- Check Vercel deployment logs
- Verify cron schedule syntax
- Check if Pro plan is required (for Vercel Cron Jobs)

**404 errors:**
- Ensure endpoint is deployed: `/api/cron/keep-alive`
- Check Vercel function logs

**Functions still going inactive:**
- Reduce interval (e.g., every 3 minutes instead of 5)
- Ping more endpoints in the cron job
- Consider upgrading to Vercel Pro for better reliability

