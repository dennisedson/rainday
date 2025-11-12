#!/bin/bash

# Keep-Alive Script for Vercel API
# Pings the health endpoint every 5 minutes to keep functions warm
#
# Usage:
#   chmod +x keep-alive.sh
#   ./keep-alive.sh
#
# Or run in background:
#   nohup ./keep-alive.sh > keep-alive.log 2>&1 &

API_URL="${API_URL:-https://hsecommerce-api.vercel.app}"
INTERVAL_MINUTES="${INTERVAL_MINUTES:-5}"
INTERVAL_SECONDS=$((INTERVAL_MINUTES * 60))

echo "🚀 Keep-Alive Script Started"
echo "📡 API URL: $API_URL"
echo "⏰ Interval: $INTERVAL_MINUTES minutes"
echo "🔄 Pinging every $INTERVAL_MINUTES minutes to keep functions warm..."
echo ""

while true; do
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  if curl -s -f "${API_URL}/api/health" > /dev/null; then
    echo "✅ [$TIMESTAMP] Health check OK"
  else
    echo "❌ [$TIMESTAMP] Health check failed"
  fi
  
  sleep "$INTERVAL_SECONDS"
done

