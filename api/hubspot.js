/**
 * Consolidated HubSpot API Router
 * Handles deals, category syncing, and favorites
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
 * Handle POST /api/create-deal
 */
async function handleCreateDeal(req, res) {
  const { email, firstName, lastName, orderTotal, orderItems, paymentId, orderId } = req.body;
  if (!email || !orderTotal) return res.status(400).json({ error: 'Email and orderTotal are required' });

  try {
    const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });
    
    // Find or create contact
    let contactId;
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email.toLowerCase().trim() }] }],
      limit: 1
    });

    if (searchResponse.results && searchResponse.results.length > 0) {
      contactId = searchResponse.results[0].id;
    } else {
      const newContact = await hubspotClient.crm.contacts.basicApi.create({
        properties: { email: email.toLowerCase().trim(), firstname: firstName, lastname: lastName }
      });
      contactId = newContact.id;
    }

    // Create deal
    const deal = await hubspotClient.crm.deals.basicApi.create({
      properties: {
        dealname: `Order ${orderId || Date.now()}`,
        amount: orderTotal.toString(),
        dealstage: 'appointmentscheduled', // Default stage
        pipeline: 'default',
        payment_id: paymentId,
        order_id: orderId
      }
    });

    // Associate deal with contact
    await hubspotClient.crm.associations.v4.basicApi.create('deals', deal.id, 'contacts', contactId, [
      { associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }
    ]);

    return res.status(200).json({ success: true, dealId: deal.id });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create deal', message: error.message });
  }
}

/**
 * Handle POST /api/sync-categories
 */
async function handleSyncCategories(req, res) {
  try {
    const response = await fetch(`${SQUARE_API_BASE}/v2/catalog/list?types=CATEGORY`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const categories = (data.objects || []).map(c => ({ id: c.id, name: c.category_data.name }));
    // This is a stub for the full sync logic which usually involves updating a CMS module
    return res.status(200).json({ success: true, message: 'Categories fetched for sync', count: categories.length });
  } catch (error) {
    return res.status(500).json({ error: 'Sync failed', message: error.message });
  }
}

/**
 * Handle GET/POST /api/favorites
 */
async function handleFavorites(req, res) {
  const { contactId, productId, action } = req.method === 'POST' ? req.body : req.query;
  if (!contactId) return res.status(400).json({ error: 'contactId is required' });

  try {
    const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });
    const contact = await hubspotClient.crm.contacts.basicApi.getById(contactId, ['favorite_products']);
    let favorites = contact.properties.favorite_products ? contact.properties.favorite_products.split(',') : [];

    if (req.method === 'POST') {
      if (!productId || !action) return res.status(400).json({ error: 'productId and action are required' });
      if (action === 'add' && !favorites.includes(productId)) favorites.push(productId);
      else if (action === 'remove') favorites = favorites.filter(id => id !== productId);
      
      await hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: { favorite_products: favorites.join(',') }
      });
      return res.status(200).json({ success: true, favorites });
    }

    return res.status(200).json({ success: true, favorites });
  } catch (error) {
    return res.status(500).json({ error: 'Favorites operation failed', message: error.message });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.url.split('?')[0];

  if (path === '/api/create-deal') {
    return handleCreateDeal(req, res);
  } else if (path === '/api/sync-categories') {
    return handleSyncCategories(req, res);
  } else if (path === '/api/favorites') {
    return handleFavorites(req, res);
  }

  return res.status(404).json({ error: 'Route not found' });
};


