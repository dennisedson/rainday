/**
 * Test Deployment Endpoint
 * Simple endpoint to verify functions are being deployed correctly
 * 
 * GET /api/test-deployment
 */

export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    deployment: 'working',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'production',
    vercelUrl: process.env.VERCEL_URL || 'not-set',
  });
}

