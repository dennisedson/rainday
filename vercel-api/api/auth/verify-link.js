/**
 * Magic Link Authentication - Verify Magic Link
 * Verifies the magic link token and creates a session
 */

const { Client } = require('@hubspot/api-client');
const jwt = require('jsonwebtoken');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// Custom property names in HubSpot CRM
const MAGIC_LINK_TOKEN_PROPERTY = 'magic_link_token';
const MAGIC_LINK_EXPIRES_PROPERTY = 'magic_link_expires';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!HUBSPOT_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'HubSpot credentials not configured' });
  }

  // Get token from query params (GET) or body (POST)
  const token = req.query.token || req.body.token;
  const email = req.query.email || req.body.email;

  if (!token || !email) {
    return res.status(400).json({ error: 'Token and email are required' });
  }

  try {
    const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });

    // Find contact by email
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: email.toLowerCase().trim(),
        }],
      }],
      properties: ['email', MAGIC_LINK_TOKEN_PROPERTY, MAGIC_LINK_EXPIRES_PROPERTY],
      limit: 1,
    });

    if (!searchResponse.results || searchResponse.results.length === 0) {
      return res.status(401).json({ error: 'Invalid magic link' });
    }

    const contact = searchResponse.results[0];
    const storedToken = contact.properties[MAGIC_LINK_TOKEN_PROPERTY];
    const expiresAt = contact.properties[MAGIC_LINK_EXPIRES_PROPERTY];

    // Verify token matches
    if (!storedToken || storedToken !== token) {
      return res.status(401).json({ error: 'Invalid magic link' });
    }

    // Check if token has expired
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      if (expirationDate < new Date()) {
        return res.status(401).json({ error: 'Magic link has expired. Please request a new one.' });
      }
    }

    // Clear the magic link token (single use)
    try {
      await hubspotClient.crm.contacts.basicApi.update(contact.id, {
        properties: {
          [MAGIC_LINK_TOKEN_PROPERTY]: '',
          [MAGIC_LINK_EXPIRES_PROPERTY]: '',
        },
      });
    } catch (error) {
      console.error('Error clearing magic link token:', error);
      // Continue anyway - token is verified
    }

    // Generate JWT session token
    const sessionToken = jwt.sign(
      {
        contactId: contact.id,
        email: contact.properties.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      token: sessionToken,
      contact: {
        id: contact.id,
        email: contact.properties.email,
      },
    });
  } catch (error) {
    console.error('Magic link verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

