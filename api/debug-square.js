/**
 * Debug endpoint to check what Square returns
 */

const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';
const isProduction = SQUARE_ENVIRONMENT === 'production';
const SQUARE_ACCESS_TOKEN = isProduction
  ? process.env.SQUARE_PRODUCTION_ACCESS_TOKEN
  : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
const SQUARE_API_BASE = isProduction
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const response = await fetch(`${SQUARE_API_BASE}/v2/catalog/list?types=ITEM,CATEGORY&limit=3`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    const categories = (data.objects || []).filter(obj => obj.type === 'CATEGORY');
    const items = (data.objects || []).filter(obj => obj.type === 'ITEM');

    return res.status(200).json({
      environment: SQUARE_ENVIRONMENT,
      apiBase: SQUARE_API_BASE,
      hasToken: !!SQUARE_ACCESS_TOKEN,
      categoriesFound: categories.length,
      itemsFound: items.length,
      categories: categories.map(c => ({
        id: c.id,
        name: c.category_data?.name
      })),
      sampleItem: items[0] ? {
        name: items[0].item_data.name,
        hasCategoryField: !!items[0].item_data.reporting_category,
        categoryId: items[0].item_data.reporting_category?.id,
        allKeys: Object.keys(items[0].item_data)
      } : null
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
