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

async function pingEndpoint(name, url) {
  const timestamp = new Date().toISOString();
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Keep-Alive-Script/1.0',
      },
    });

    if (response.ok) {
      try {
        const data = await response.json();
        console.log(`✅ [${timestamp}] ${name} OK - Status: ${data.status || 'ok'}`);
      } catch {
        // If response isn't JSON, that's ok - just check status
        console.log(`✅ [${timestamp}] ${name} OK - Status: ${response.status}`);
      }
      return true;
    } else {
      console.error(`❌ [${timestamp}] ${name} failed - Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [${timestamp}] ${name} error:`, error.message);
    return false;
  }
}

async function pingAll() {
  const endpoints = [
    { name: 'Health', url: `${API_URL}/api/health` },
    { name: 'Categories', url: `${API_URL}/api/square-categories` },
  ];
  
  const results = await Promise.all(
    endpoints.map(endpoint => pingEndpoint(endpoint.name, endpoint.url))
  );
  
  const successCount = results.filter(r => r).length;
  console.log(`📊 [${new Date().toISOString()}] Pinged ${endpoints.length} endpoints: ${successCount} successful\n`);
}

// Ping immediately on start
pingAll();

// Then ping every interval
setInterval(() => {
  pingAll();
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

