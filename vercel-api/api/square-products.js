/**
 * Square Products API Endpoint
 * Fetches products from Square Catalog API
 * 
 * GET /api/square-products
 */

// Default placeholder image for products without images
const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&auto=format&fit=crop&q=80';

export default async function handler(req, res) {
  // Set CORS headers to allow requests from HubSpot domains
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
    // Fetch products from Square Catalog API
    const response = await fetch(`${SQUARE_API_BASE}/v2/catalog/list`, {
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
        error: 'Failed to fetch products from Square', 
        details: errorData 
      });
    }

    const data = await response.json();
    
    // Filter for ITEM objects and transform to our format
    const products = (data.objects || [])
      .filter(obj => obj.type === 'ITEM')
      .map(item => {
        const itemData = item.item_data;
        const variation = itemData.variations?.[0];
        const price = variation?.item_variation_data?.price_money?.amount || 0;
        
        return {
          id: item.id,
          name: itemData.name || 'Untitled Product',
          description: itemData.description || '',
          category: itemData.category_id || 'uncategorized',
          price: price / 100, // Convert cents to dollars
          image: itemData.image_ids?.[0] || DEFAULT_PRODUCT_IMAGE, // Use placeholder if no image
          available: !itemData.is_deleted && itemData.available_online,
          variations: itemData.variations || [],
        };
      });

    return res.status(200).json({
      products,
      count: products.length,
    });

  } catch (error) {
    console.error('Error fetching Square products:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

