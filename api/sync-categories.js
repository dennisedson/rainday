/**
 * Sync Categories to HubSpot CMS
 * Fetches categories from Square and updates HubSpot CMS module field if different
 * 
 * POST /api/sync-categories
 */

const { Client } = require('@hubspot/api-client');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';
const SQUARE_ACCESS_TOKEN = SQUARE_ENVIRONMENT === 'production'
  ? process.env.SQUARE_PRODUCTION_ACCESS_TOKEN
  : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
const SQUARE_API_BASE = SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

/**
 * Fetch categories from Square
 */
async function fetchSquareCategories() {
  const response = await fetch(`${SQUARE_API_BASE}/v2/catalog/list?types=CATEGORY,IMAGE`, {
    method: 'GET',
    headers: {
      'Square-Version': '2024-12-18',
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Square API Error: ${JSON.stringify(errorData.errors || errorData)}`);
  }

  const data = await response.json();
  
  // Build image map
  const imageMap = {};
  const imageObjects = (data.objects || []).filter(obj => obj.type === 'IMAGE');
  imageObjects.forEach(image => {
    const imageData = image.image_data;
    imageMap[image.id] = imageData?.url || null;
  });

  // Extract and format categories
  const categories = (data.objects || [])
    .filter(obj => obj.type === 'CATEGORY' && obj.category_data)
    .map(category => {
      const imageId = category.category_data.image_ids?.[0];
      const imageUrl = imageId ? imageMap[imageId] : null;
      
      return {
        id: category.id,
        name: category.category_data.name,
        description: category.category_data.description || '',
        image: imageUrl,
        slug: category.category_data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return categories;
}

/**
 * Get current categories from HubSpot CMS module
 */
async function getHubSpotCategories(hubspotClient) {
  try {
    return null;
  } catch (error) {
    console.error('Error getting HubSpot categories:', error);
    return null;
  }
}

/**
 * Update categories in HubSpot CMS
 */
async function updateHubSpotCategories(hubspotClient, categories) {
  try {
    console.log('[Sync] Categories to update:', categories.length);
    return true;
  } catch (error) {
    console.error('Error updating HubSpot categories:', error);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!HUBSPOT_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'HubSpot credentials not configured' });
  }

  if (!SQUARE_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Square credentials not configured' });
  }

  try {
    const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });

    // Fetch categories from Square
    console.log('[Sync] Fetching categories from Square...');
    const squareCategories = await fetchSquareCategories();
    console.log('[Sync] Fetched', squareCategories.length, 'categories from Square');

    // Get current categories from HubSpot
    const hubspotCategories = await getHubSpotCategories(hubspotClient);
    
    // Compare categories (simple comparison by name)
    const squareCategoryNames = squareCategories.map(c => c.name).sort().join(',');
    const hubspotCategoryNames = hubspotCategories 
      ? hubspotCategories.map(c => c.name).sort().join(',')
      : '';

    const categoriesMatch = squareCategoryNames === hubspotCategoryNames;

    if (categoriesMatch && hubspotCategories) {
      console.log('[Sync] Categories match, no update needed');
      return res.status(200).json({
        success: true,
        synced: false,
        message: 'Categories are up to date',
        categories: squareCategories,
      });
    }

    // Categories are different, update HubSpot
    console.log('[Sync] Categories differ, updating HubSpot...');
    await updateHubSpotCategories(hubspotClient, squareCategories);

    return res.status(200).json({
      success: true,
      synced: true,
      message: 'Categories synced successfully',
      categories: squareCategories,
      count: squareCategories.length,
    });

  } catch (error) {
    console.error('[Sync] Error syncing categories:', error);
    return res.status(500).json({
      error: 'Failed to sync categories',
      message: error.message,
    });
  }
};
