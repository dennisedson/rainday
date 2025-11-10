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
    
    // Build category map: ID -> { name, image }
    const categoryMap = {};
    (data.objects || [])
      .filter(obj => obj.type === 'CATEGORY')
      .forEach(category => {
        const categoryData = category.category_data;
        categoryMap[category.id] = {
          name: categoryData?.name || 'Uncategorized',
          image: categoryData?.image_ids?.[0] || null, // Get first category image
        };
      });
    
    console.log('Category Map:', categoryMap);
    
    // Filter for ITEM objects and transform to our format
    const products = (data.objects || [])
      .filter(obj => obj.type === 'ITEM')
      .map(item => {
        const itemData = item.item_data;
        const variation = itemData.variations?.[0];
        const price = variation?.item_variation_data?.price_money?.amount || 0;
        
        // Get category name and image from reporting_category ID
        const categoryId = itemData.reporting_category?.id;
        const categoryInfo = categoryId ? categoryMap[categoryId] : null;
        const categoryName = categoryInfo?.name || 'Uncategorized';
        const categoryImage = categoryInfo?.image || null;
        
        return {
          id: item.id,
          name: itemData.name || 'Untitled Product',
          description: itemData.description || '',
          category: categoryName,
          categoryImage: categoryImage,
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

