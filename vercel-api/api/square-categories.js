/**
 * Square Categories API Endpoint
 * Fetches all categories from Square Catalog
 * 
 * GET /api/square-categories
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
  
  // Select credentials based on environment
  const SQUARE_ACCESS_TOKEN = isProduction 
    ? process.env.SQUARE_PRODUCTION_ACCESS_TOKEN 
    : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;

  // Select API base URL based on environment
  const SQUARE_API_BASE = isProduction
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

  if (!SQUARE_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Square credentials not configured' });
  }

  try {
    // Fetch categories from Square Catalog
    const response = await fetch(`${SQUARE_API_BASE}/v2/catalog/list?types=CATEGORY`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Square API Error:', errorData);
      return res.status(response.status).json({
        error: 'Failed to fetch categories from Square',
        details: errorData.errors || errorData,
      });
    }

    const data = await response.json();

    // Extract and format categories
    const categories = (data.objects || [])
      .filter(obj => obj.type === 'CATEGORY' && obj.category_data)
      .map(category => ({
        id: category.id,
        name: category.category_data.name,
        // Create URL-friendly slug from name
        slug: category.category_data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    return res.status(200).json({
      categories,
      count: categories.length,
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

