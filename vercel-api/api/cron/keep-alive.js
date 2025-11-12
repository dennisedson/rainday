/**
 * Keep-Alive Cron Job Endpoint
 * This endpoint pings multiple API endpoints to keep functions warm
 * 
 * Can be triggered by:
 * 1. Vercel Cron Jobs (Pro plan) - configured in vercel.json
 * 2. External cron services (free) - cron-job.org, UptimeRobot, etc.
 * 
 * GET /api/cron/keep-alive
 */

const API_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'https://hsecommerce-api.vercel.app';

async function pingEndpoint(name, url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vercel-Keep-Alive-Cron/1.0',
      },
    });

    if (response.ok) {
      try {
        const data = await response.json();
        return { success: true, name, status: data.status || 'ok' };
      } catch {
        return { success: true, name, status: response.status };
      }
    } else {
      return { success: false, name, status: response.status };
    }
  } catch (error) {
    return { success: false, name, error: error.message };
  }
}

export default async function handler(req, res) {
  // Optional: Add a secret token for security
  const CRON_SECRET = process.env.CRON_SECRET;
  if (CRON_SECRET && req.query.secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Keep-Alive Cron Job Started`);

  const endpoints = [
    { name: 'Health', url: `${API_URL}/api/health` },
    { name: 'Categories', url: `${API_URL}/api/square-categories` },
    { name: 'Products', url: `${API_URL}/api/square-products` },
  ];

  const results = await Promise.all(
    endpoints.map(endpoint => pingEndpoint(endpoint.name, endpoint.url))
  );

  const successCount = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);

  const response = {
    timestamp,
    total: endpoints.length,
    successful: successCount,
    failed: failed.length,
    results: results.map(r => ({
      endpoint: r.name,
      success: r.success,
      status: r.status || r.error,
    })),
  };

  // Log results
  console.log(`[${timestamp}] Keep-Alive Results:`, JSON.stringify(response, null, 2));

  // Return 200 even if some failed (cron services will retry on non-200)
  return res.status(200).json(response);
}

