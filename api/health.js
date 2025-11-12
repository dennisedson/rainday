/**
 * Health Check Endpoint
 * Simple endpoint to verify API is working
 * 
 * GET /api/health
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.SQUARE_ENVIRONMENT || 'not-set',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
}

