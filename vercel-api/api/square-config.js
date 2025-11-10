/**
 * Square Config API Endpoint
 * Returns public Square configuration (Application ID)
 * 
 * GET /api/square-config
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Determine which environment to use
  const isProduction = process.env.SQUARE_ENVIRONMENT === 'production';
  
  // Select Application ID based on environment
  const SQUARE_APPLICATION_ID = isProduction 
    ? process.env.SQUARE_PRODUCTION_APPLICATION_ID 
    : process.env.SQUARE_SANDBOX_APPLICATION_ID;

  if (!SQUARE_APPLICATION_ID) {
    return res.status(500).json({ error: 'Square Application ID not configured' });
  }

  return res.status(200).json({
    applicationId: SQUARE_APPLICATION_ID,
    environment: isProduction ? 'production' : 'sandbox',
  });
}

