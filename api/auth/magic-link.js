/**
 * Magic Link Authentication - Request Magic Link
 * Sends a magic link email to the user for passwordless login
 */

const { Client } = require('@hubspot/api-client');
const crypto = require('crypto');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || 'your-secret-key-change-in-production';
const BASE_URL = process.env.BASE_URL || 'https://www.rainydaymerchandise.com';

// Custom property names in HubSpot CRM
const MAGIC_LINK_TOKEN_PROPERTY = 'magic_link_token';
const MAGIC_LINK_EXPIRES_PROPERTY = 'magic_link_expires';

/**
 * Generate a secure random token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send magic link email
 * Uses Resend if API key is configured, otherwise logs to console
 */
async function sendMagicLinkEmail(email, token) {
  const magicLink = `${BASE_URL}/login?token=${token}&email=${encodeURIComponent(email)}`;
  
  // Try to send via Resend if configured
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (RESEND_API_KEY) {
    try {
      // Use dynamic require for Resend (only load if API key exists)
      const { Resend } = require('resend');
      const resend = new Resend(RESEND_API_KEY);
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@rainydaymerchandise.com',
        to: email,
        subject: 'Sign in to Rainy Day Merchandise',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Sign in to Rainy Day Merchandise</h2>
            <p>Click the button below to sign in to your account. This link will expire in 15 minutes.</p>
            <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">Sign In</a>
            <p style="color: #666; font-size: 12px;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all;">${magicLink}</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">If you didn't request this link, you can safely ignore this email.</p>
          </div>
        `,
      });
      
      console.log(`[Magic Link] Email sent to ${email} via Resend`);
      return { success: true, link: magicLink, sent: true };
    } catch (error) {
      console.error('[Magic Link] Error sending email via Resend:', error);
      // Fall through to console log
    }
  }
  
  // Fallback: Log to console (for development)
  console.log(`[Magic Link] Send to ${email}: ${magicLink}`);
  console.log(`[Magic Link] To enable email sending, add RESEND_API_KEY to Vercel environment variables`);
  
  return { success: true, link: magicLink, sent: false };
}

module.exports = async function handler(req, res) {
  // Set CORS headers - must be set before any response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!HUBSPOT_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'HubSpot credentials not configured' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  try {
    const hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });

    // Find or create contact
    let contact;
    let contactId;

    try {
      // Search for existing contact by email
      const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email.toLowerCase().trim(),
          }],
        }],
        properties: ['email'],
        limit: 1,
      });

      if (searchResponse.results && searchResponse.results.length > 0) {
        contact = searchResponse.results[0];
        contactId = contact.id;
      } else {
        // Create new contact
        const newContact = await hubspotClient.crm.contacts.basicApi.create({
          properties: {
            email: email.toLowerCase().trim(),
          },
        });
        contactId = newContact.id;
      }
    } catch (error) {
      console.error('Error finding/creating contact:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }

    // Generate magic link token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store token in HubSpot contact
    try {
      await hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: {
          [MAGIC_LINK_TOKEN_PROPERTY]: token,
          [MAGIC_LINK_EXPIRES_PROPERTY]: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error storing magic link token:', error);
      // If properties don't exist, they need to be created in HubSpot first
      return res.status(500).json({ 
        error: 'Magic link properties not configured. Please create custom properties in HubSpot CRM.',
        details: `Required properties: ${MAGIC_LINK_TOKEN_PROPERTY}, ${MAGIC_LINK_EXPIRES_PROPERTY}`
      });
    }

    // Send magic link email
    const emailResult = await sendMagicLinkEmail(email, token);

    // Always return success (don't reveal if email exists)
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a magic link has been sent.',
      // In development, return the link for testing
      ...(process.env.NODE_ENV === 'development' && { magicLink: emailResult.link }),
    });
  } catch (error) {
    console.error('Magic link request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
