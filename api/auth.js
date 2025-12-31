/**
 * Consolidated Auth API Router
 * Handles magic link requests, verification, and session validation
 */

const { Client } = require('@hubspot/api-client');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || 'your-secret-key-change-in-production';
const BASE_URL = process.env.BASE_URL || 'https://www.rainydaymerchandise.com';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

const MAGIC_LINK_TOKEN_PROPERTY = 'magic_link_token';
const MAGIC_LINK_EXPIRES_PROPERTY = 'magic_link_expires';

/**
 * Handle POST /api/auth/magic-link
 */
async function handleMagicLinkRequest(req, res) {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email address is required' });

  try {
    const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });
    let contactId;

    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email.toLowerCase().trim() }] }],
      properties: ['email'],
      limit: 1,
    });

    if (searchResponse.results && searchResponse.results.length > 0) {
      contactId = searchResponse.results[0].id;
    } else {
      const newContact = await hubspotClient.crm.contacts.basicApi.create({ properties: { email: email.toLowerCase().trim() } });
      contactId = newContact.id;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await hubspotClient.crm.contacts.basicApi.update(contactId, {
      properties: {
        [MAGIC_LINK_TOKEN_PROPERTY]: token,
        [MAGIC_LINK_EXPIRES_PROPERTY]: expiresAt.toISOString(),
      },
    });

    const magicLink = `${BASE_URL}/login?token=${token}&email=${encodeURIComponent(email)}`;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let sent = false;

    if (RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@rainydaymerchandise.com',
          to: email,
          subject: 'Sign in to Rainy Day Merchandise',
          html: `<p>Click below to sign in:</p><a href="${magicLink}">Sign In</a>`,
        });
        sent = true;
      } catch (e) { console.error('[Auth] Resend error:', e); }
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists, a magic link has been sent.',
      ...(process.env.NODE_ENV === 'development' && { magicLink }),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

/**
 * Handle POST /api/auth/verify-link
 */
async function handleVerifyLink(req, res) {
  const token = req.query.token || req.body.token;
  const email = req.query.email || req.body.email;
  if (!token || !email) return res.status(400).json({ error: 'Token and email are required' });

  try {
    const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email.toLowerCase().trim() }] }],
      properties: ['email', MAGIC_LINK_TOKEN_PROPERTY, MAGIC_LINK_EXPIRES_PROPERTY],
      limit: 1,
    });

    if (!searchResponse.results || searchResponse.results.length === 0) return res.status(401).json({ error: 'Invalid link' });

    const contact = searchResponse.results[0];
    if (contact.properties[MAGIC_LINK_TOKEN_PROPERTY] !== token) return res.status(401).json({ error: 'Invalid link' });
    if (new Date(contact.properties[MAGIC_LINK_EXPIRES_PROPERTY]) < new Date()) return res.status(401).json({ error: 'Expired link' });

    await hubspotClient.crm.contacts.basicApi.update(contact.id, { properties: { [MAGIC_LINK_TOKEN_PROPERTY]: '', [MAGIC_LINK_EXPIRES_PROPERTY]: '' } });

    const sessionToken = jwt.sign({ contactId: contact.id, email: contact.properties.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.status(200).json({ success: true, token: sessionToken, contact: { id: contact.id, email: contact.properties.email } });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle POST /api/auth/verify-session
 */
async function handleVerifySession(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.body?.token || req.query?.token;
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (HUBSPOT_ACCESS_TOKEN && decoded.contactId) {
      try {
        const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });
        const contact = await hubspotClient.crm.contacts.basicApi.getById(decoded.contactId, ['email', 'firstname', 'lastname']);
        return res.status(200).json({ success: true, contact: { id: contact.id, email: contact.properties.email, firstName: contact.properties.firstname, lastName: contact.properties.lastname } });
      } catch (e) { console.error('[Auth] Fetch contact error:', e); }
    }
    return res.status(200).json({ success: true, contact: { id: decoded.contactId, email: decoded.email } });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.url.split('?')[0];

  if (path === '/api/auth/magic-link') {
    return handleMagicLinkRequest(req, res);
  } else if (path === '/api/auth/verify-link') {
    return handleVerifyLink(req, res);
  } else if (path === '/api/auth/verify-session') {
    return handleVerifySession(req, res);
  }

  return res.status(404).json({ error: 'Route not found' });
};

