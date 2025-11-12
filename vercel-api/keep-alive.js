#!/usr/bin/env node

/**
 * Keep-Alive Script for Vercel API
 * Pings the health endpoint every 5 minutes to keep functions warm
 * 
 * Usage:
 *   node keep-alive.js
 * 
 * Or run continuously:
 *   node keep-alive.js &
 */

const API_URL = process.env.API_URL || 'https://hsecommerce-api.vercel.app';
const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES || '5', 10);
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

console.log(`🚀 Keep-Alive Script Started`);
console.log(`📡 API URL: ${API_URL}`);
console.log(`⏰ Interval: ${INTERVAL_MINUTES} minutes`);
console.log(`🔄 Pinging every ${INTERVAL_MINUTES} minutes to keep functions warm...\n`);

async function pingHealth() {
  const timestamp = new Date().toISOString();
  const url = `${API_URL}/api/health`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Keep-Alive-Script/1.0',
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ [${timestamp}] Health check OK - Status: ${data.status}, Environment: ${data.environment}`);
      return true;
    } else {
      console.error(`❌ [${timestamp}] Health check failed - Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [${timestamp}] Health check error:`, error.message);
    return false;
  }
}

// Ping immediately on start
pingHealth();

// Then ping every interval
setInterval(() => {
  pingHealth();
}, INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Keep-Alive Script Stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Keep-Alive Script Stopped');
  process.exit(0);
});

