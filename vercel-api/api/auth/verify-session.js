/**
 * Verify JWT Session Token
 * Validates a JWT token and returns contact information
 */

const jwt = require('jsonwebtoken');
const { Client } = require('@hubspot/api-client');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';

export default async function handler(req, res) {
  // Set CORS headers - must be set before any response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get token from Authorization header or body
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.body?.token || req.query?.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Optionally fetch fresh contact data from HubSpot
    if (HUBSPOT_ACCESS_TOKEN && decoded.contactId) {
      try {
        const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });
        const contact = await hubspotClient.crm.contacts.basicApi.getById(decoded.contactId, ['email', 'firstname', 'lastname']);
        
        return res.status(200).json({
          success: true,
          contact: {
            id: contact.id,
            email: contact.properties.email,
            firstName: contact.properties.firstname,
            lastName: contact.properties.lastname,
          },
        });
      } catch (error) {
        // If contact fetch fails, still return decoded token data
        console.error('Error fetching contact:', error);
      }
    }

    // Return decoded token data
    return res.status(200).json({
      success: true,
      contact: {
        id: decoded.contactId,
        email: decoded.email,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Session verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

