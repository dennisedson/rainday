/**
 * Square Product API Endpoint (Single Product)
 * Fetches a single product by ID from Square Catalog API
 * 
 * GET /api/square-product?id=PRODUCT_ID
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

  // Get product ID from query parameters
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
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
    // Fetch specific product from Square Catalog API
    const response = await fetch(`${SQUARE_API_BASE}/v2/catalog/object/${id}?include_related_objects=true`, {
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
      
      if (response.status === 404) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      return res.status(response.status).json({ 
        error: 'Failed to fetch product from Square', 
        details: errorData 
      });
    }

    const data = await response.json();
    const item = data.object;
    
    // Verify it's an ITEM type
    if (!item || item.type !== 'ITEM') {
      return res.status(404).json({ error: 'Product not found or invalid type' });
    }

    // Extract related objects (images, categories, etc.)
    const relatedObjects = data.related_objects || [];
    const imageObjects = relatedObjects.filter(obj => obj.type === 'IMAGE');
    
    // Get all image URLs
    const images = imageObjects.map(imgObj => {
      return imgObj.image_data?.url || DEFAULT_PRODUCT_IMAGE;
    });
    
    // If no images found, use default
    if (images.length === 0) {
      images.push(DEFAULT_PRODUCT_IMAGE);
    }

    const itemData = item.item_data;
    const variations = itemData.variations || [];
    
    // Get primary variation for default pricing
    const primaryVariation = variations[0];
    const primaryPrice = primaryVariation?.item_variation_data?.price_money?.amount || 0;
    
    // Transform variations to our format
    const transformedVariations = variations.map(variation => {
      const variationData = variation.item_variation_data;
      return {
        id: variation.id,
        name: variationData?.name || 'Default',
        sku: variationData?.sku || null,
        price: (variationData?.price_money?.amount || 0) / 100,
        available: !variationData?.track_inventory || (variationData?.inventory_alert_type !== 'LOW_QUANTITY'),
      };
    });

    // Build the product object
    const product = {
      id: item.id,
      name: itemData.name || 'Untitled Product',
      description: itemData.description || '',
      category: itemData.category_id || 'uncategorized',
      price: primaryPrice / 100, // Convert cents to dollars
      images: images,
      mainImage: images[0],
      galleryImages: images.slice(1, 4), // Get up to 3 additional gallery images
      available: !itemData.is_deleted && itemData.available_online,
      variations: transformedVariations,
      // Additional metadata
      productType: itemData.product_type || null,
      taxable: itemData.taxable || false,
    };

    return res.status(200).json({
      product,
      success: true,
    });

  } catch (error) {
    console.error('Error fetching Square product:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

