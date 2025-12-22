/**
 * Create Deal API Endpoint
 * Logs successful orders in HubSpot CRM as Deals
 * 
 * POST /api/create-deal
 * 
 * Body: {
 *   email: string,
 *   firstName: string,
 *   lastName: string,
 *   orderTotal: number,
 *   orderItems: array,
 *   paymentId: string,
 *   orderId: string,
 * }
 */

const { Client } = require('@hubspot/api-client');

module.exports = async function handler(req, res) {
  // Set CORS headers - must be set before any response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { HUBSPOT_ACCESS_TOKEN } = process.env;

  if (!HUBSPOT_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'HubSpot credentials not configured' });
  }

  try {
    const { 
      email, 
      firstName, 
      lastName, 
      orderTotal, 
      orderItems = [], 
      paymentId, 
      orderId 
    } = req.body;

    if (!email || !orderTotal) {
      return res.status(400).json({ error: 'Missing required fields: email and orderTotal' });
    }

    // Initialize HubSpot client
    const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });

    // Create or update contact
    let contactId;
    try {
      const contactResponse = await hubspotClient.crm.contacts.basicApi.create({
        properties: {
          email: email,
          firstname: firstName || '',
          lastname: lastName || '',
        },
      });
      contactId = contactResponse.id;
    } catch (error) {
      // Contact might already exist, try to find it
      if (error.statusCode === 409) {
        const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            }],
          }],
        });
        if (searchResponse.results.length > 0) {
          contactId = searchResponse.results[0].id;
        }
      } else {
        throw error;
      }
    }

    // Create deal
    const dealName = `Order ${orderId || paymentId}`;
    const dealProperties = {
      dealname: dealName,
      amount: orderTotal.toString(),
      dealstage: 'closedwon',
      pipeline: 'default',
      closedate: new Date().toISOString().split('T')[0],
      description: `Square Payment ID: ${paymentId}\nOrder ID: ${orderId || 'N/A'}\nItems: ${orderItems.map(item => `${item.name} x${item.quantity}`).join(', ')}`,
    };

    const dealResponse = await hubspotClient.crm.deals.basicApi.create({
      properties: dealProperties,
      associations: contactId ? [{
        to: { id: contactId },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 3, // Contact to Deal association
        }],
      }] : [],
    });

    return res.status(200).json({
      success: true,
      dealId: dealResponse.id,
      contactId: contactId,
      message: 'Deal created successfully',
    });

  } catch (error) {
    console.error('Error creating deal:', error);
    return res.status(500).json({ 
      error: 'Failed to create deal', 
      message: error.message,
      details: error.body || error,
    });
  }
};
