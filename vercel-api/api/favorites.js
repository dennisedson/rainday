/**
 * HubSpot CRM Favorites API
 * Manages product favorites associated with HubSpot contacts
 * Uses HubSpot tracking token (hubspotutk) or email to identify contacts
 */

const { Client } = require('@hubspot/api-client');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// Custom property name for storing favorites in HubSpot contacts
const FAVORITES_PROPERTY = 'favorite_products'; // JSON array of product IDs

/**
 * Identify contact from HubSpot tracking token
 * Uses HubSpot's legacy Contacts API endpoint
 */
async function identifyContactFromToken(hubspotutk) {
  try {
    // Use HubSpot's legacy Contacts API to get contact by tracking token
    const response = await fetch(`https://api.hubapi.com/contacts/v1/contact/utk/${hubspotutk}/profile`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.vid; // Contact ID (vid)
    }
    
    return null;
  } catch (error) {
    console.error('Error identifying contact from token:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!HUBSPOT_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'HubSpot credentials not configured' });
  }

  const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });
  const { email, hubspotutk, productId, action } = req.body;

  // For GET requests, can be in query params
  const contactEmail = email || req.query.email;
  const trackingToken = hubspotutk || req.query.hubspotutk;

  if (!contactEmail && !trackingToken) {
    return res.status(400).json({ error: 'Email or hubspotutk is required' });
  }

  try {
    // Find or create contact
    let contactId;
    let contact;
    
    try {
      // If we have tracking token, try to identify contact from it first
      if (trackingToken) {
        const vid = await identifyContactFromToken(trackingToken);
        if (vid) {
          // Get contact by ID using new CRM API
          try {
            contact = await hubspotClient.crm.contacts.basicApi.getById(vid, ['email', FAVORITES_PROPERTY]);
            contactId = vid;
          } catch (error) {
            console.error('Error fetching contact by vid:', error);
            // Fall through to email search
          }
        }
      }

      // If we don't have contact yet, search by email
      if (!contactId && contactEmail) {
        const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: contactEmail,
            }],
          }],
          properties: ['email', FAVORITES_PROPERTY],
          limit: 1,
        });

        if (searchResponse.results && searchResponse.results.length > 0) {
          contact = searchResponse.results[0];
          contactId = contact.id;
        } else {
          // Create new contact (only if we have email)
          const newContact = await hubspotClient.crm.contacts.basicApi.create({
            properties: {
              email: contactEmail,
            },
          });
          contactId = newContact.id;
          contact = { properties: { [FAVORITES_PROPERTY]: null } };
        }
      } else if (!contactId) {
        // No email or tracking token - can't proceed
        return res.status(400).json({ error: 'Unable to identify contact' });
      }
    } catch (error) {
      console.error('Error finding/creating contact:', error);
      return res.status(500).json({ error: `Failed to process contact: ${error.message}` });
    }

    // Get current favorites
    let favorites = [];
    try {
      const favoritesValue = contact.properties?.[FAVORITES_PROPERTY];
      if (favoritesValue) {
        favorites = JSON.parse(favoritesValue);
      }
    } catch (e) {
      // If parsing fails, start with empty array
      favorites = [];
    }

    // Handle different actions
    if (req.method === 'GET') {
      // Return current favorites
      return res.status(200).json({
        success: true,
        favorites: favorites,
        count: favorites.length,
      });
    }

    if (req.method === 'POST') {
      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      const actionType = action || 'toggle'; // 'add', 'remove', or 'toggle'

      if (actionType === 'add' || (actionType === 'toggle' && !favorites.includes(productId))) {
        // Add product to favorites
        if (!favorites.includes(productId)) {
          favorites.push(productId);
        }
      } else if (actionType === 'remove' || (actionType === 'toggle' && favorites.includes(productId))) {
        // Remove product from favorites
        favorites = favorites.filter(id => id !== productId);
      }

      // Update contact with new favorites
      await hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: {
          [FAVORITES_PROPERTY]: JSON.stringify(favorites),
        },
      });

      return res.status(200).json({
        success: true,
        favorites: favorites,
        count: favorites.length,
        isFavorite: favorites.includes(productId),
      });
    }

    if (req.method === 'DELETE') {
      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // Remove product from favorites
      favorites = favorites.filter(id => id !== productId);

      // Update contact
      await hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: {
          [FAVORITES_PROPERTY]: JSON.stringify(favorites),
        },
      });

      return res.status(200).json({
        success: true,
        favorites: favorites,
        count: favorites.length,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Favorites API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
