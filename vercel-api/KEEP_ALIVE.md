# Keep-Alive Script

This script pings the Vercel API health endpoint periodically to keep serverless functions warm and prevent them from going inactive (which causes 404 errors).

## Why?

Vercel's free tier may remove inactive functions after a period of inactivity. This script ensures functions stay active by pinging them every 5 minutes.

## Usage

### Option 1: Node.js Script (Recommended)

```bash
# Run in foreground
npm run keep-alive

# Or run directly
node keep-alive.js

# Run in background (macOS/Linux)
nohup npm run keep-alive > keep-alive.log 2>&1 &
```

### Option 2: Bash Script

```bash
# Run in foreground
./keep-alive.sh

# Run in background
nohup ./keep-alive.sh > keep-alive.log 2>&1 &
```

### Option 3: Using PM2 (Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start keep-alive script
pm2 start keep-alive.js --name "vercel-keep-alive"

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

### Option 4: Cron Job (macOS/Linux)

Add to crontab to run every 5 minutes:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path as needed)
*/5 * * * * curl -s https://hsecommerce-api.vercel.app/api/health > /dev/null
```

### Option 5: External Monitoring Service

Use a free service like:
- [UptimeRobot](https://uptimerobot.com) - Free monitoring, checks every 5 minutes
- [cron-job.org](https://cron-job.org) - Free cron jobs
- [EasyCron](https://www.easycron.com) - Free cron service

Set up a job to ping: `https://hsecommerce-api.vercel.app/api/health`

## Configuration

Set environment variables to customize:

```bash
# Change API URL (default: https://hsecommerce-api.vercel.app)
export API_URL=https://your-api-url.vercel.app

# Change interval (default: 5 minutes)
export INTERVAL_MINUTES=5

# Then run
npm run keep-alive
```

## Monitoring

The script logs each ping:
- ✅ Success: `Health check OK - Status: ok`
- ❌ Failure: `Health check failed` or `Health check error`

Check logs:
```bash
# If running in background with nohup
tail -f keep-alive.log

# If using PM2
pm2 logs vercel-keep-alive
```

## Stopping

```bash
# If running in foreground
Ctrl+C

# If running in background, find and kill process
ps aux | grep keep-alive
kill <PID>

# If using PM2
pm2 stop vercel-keep-alive
pm2 delete vercel-keep-alive
```

## Recommended Setup

For production, use **PM2** or an **external monitoring service**:

1. **PM2** - Best for running on your own server/VPS
2. **UptimeRobot** - Best for free external monitoring (no server needed)
3. **Cron job** - Best if you have a server that's always on

