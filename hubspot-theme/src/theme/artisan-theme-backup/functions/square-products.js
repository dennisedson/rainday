/**
 * Square Products Serverless Function
 * Fetches products from Square Catalog API
 * 
 * IMPORTANT: Square Access Token must be stored in HubSpot Secrets
 * Never expose the access token on the client side
 */

exports.main = async (context = {}, sendResponse) => {
  // Get Square credentials from HubSpot Secrets
  const SQUARE_ACCESS_TOKEN = process.env['SQUARE_ACCESS_TOKEN'];
  const SQUARE_LOCATION_ID = process.env['SQUARE_LOCATION_ID'];
  const SQUARE_ENVIRONMENT = process.env['SQUARE_ENVIRONMENT'] || 'sandbox'; // 'sandbox' or 'production'

  // Set Square API base URL based on environment
  const SQUARE_API_BASE = SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

  // Validate required credentials
  if (!SQUARE_ACCESS_TOKEN) {
    sendResponse({
      statusCode: 500,
      body: JSON.stringify({
        error: 'Square Access Token not configured. Please add SQUARE_ACCESS_TOKEN to HubSpot Secrets.',
      }),
    });
    return;
  }

  try {
    // Parse query parameters for filtering
    const { category, minPrice, maxPrice, search, limit = 100 } = context.params || {};

    // Build Square Catalog API request
    const catalogUrl = `${SQUARE_API_BASE}/v2/catalog/list`;
    const queryParams = new URLSearchParams({
      types: 'ITEM',
      limit: limit,
    });

    // Fetch products from Square Catalog API
    const response = await fetch(`${catalogUrl}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Square API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const items = data.objects || [];

    // Transform Square items to our product format
    const products = items
      .filter((item) => item.type === 'ITEM')
      .map((item) => {
        const itemData = item.item_data || {};
        const variations = itemData.variations || [];
        
        // Get the first variation for pricing (Square requires at least one variation)
        const primaryVariation = variations[0]?.item_variation_data || {};
        const priceMoney = primaryVariation.price_money || {};
        
        // Convert price from cents to dollars
        const price = priceMoney.amount ? priceMoney.amount / 100 : 0;
        
        // Get images
        const images = itemData.image_ids?.map((imageId) => {
          // Note: In a real implementation, you'd fetch image URLs from Square
          return `/api/square-image/${imageId}`;
        }) || [];

        return {
          id: item.id,
          name: itemData.name || 'Unnamed Product',
          description: itemData.description || '',
          category: itemData.category_id || 'uncategorized',
          price: price,
          originalPrice: null, // Can be set if item has a sale price
          images: images.length > 0 ? images : ['https://via.placeholder.com/400'],
          variations: variations.map((v) => ({
            id: v.id,
            name: v.item_variation_data?.name || 'Default',
            price: v.item_variation_data?.price_money?.amount / 100 || price,
            sku: v.item_variation_data?.sku || null,
          })),
          available: !itemData.is_deleted && variations.length > 0,
          rating: 4.5, // Demo data - integrate with reviews system later
          reviewCount: Math.floor(Math.random() * 100), // Demo data
          onSale: false, // Can be determined by comparing prices
          featured: false, // Can be set via custom attributes in Square
        };
      });

    // Apply client-side filters
    let filteredProducts = products;

    // Filter by category
    if (category) {
      filteredProducts = filteredProducts.filter((p) => p.category === category);
    }

    // Filter by price range
    if (minPrice !== undefined) {
      filteredProducts = filteredProducts.filter((p) => p.price >= parseFloat(minPrice));
    }
    if (maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter((p) => p.price <= parseFloat(maxPrice));
    }

    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      );
    }

    // Get unique categories for filtering UI
    const categories = [...new Set(products.map((p) => p.category))].filter(Boolean);

    // Send successful response
    sendResponse({
      statusCode: 200,
      body: JSON.stringify({
        products: filteredProducts,
        categories: categories,
        total: filteredProducts.length,
        cached: false,
      }),
    });
  } catch (error) {
    console.error('Error fetching Square products:', error);
    
    sendResponse({
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch products from Square',
        message: error.message,
      }),
    });
  }
};

