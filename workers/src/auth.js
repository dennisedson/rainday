/**
 * Magic-link authentication.
 *
 * Ported from api/auth.js: jsonwebtoken becomes jose, node:crypto becomes Web
 * Crypto, and Resend is called over its REST API instead of through its SDK.
 */

import { SignJWT, jwtVerify } from 'jose';
import { json, randomHex, readParams, timingSafeEqual } from './lib.js';
import { findContactByEmail, getContact, createContact, updateContact } from './hubspot.js';

const MAGIC_LINK_TOKEN_PROPERTY = 'magic_link_token';
const MAGIC_LINK_EXPIRES_PROPERTY = 'magic_link_expires';
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

function secretKey(env) {
  // No fallback: sessions must never be signed with a guessable default.
  if (!env.JWT_SECRET) return null;
  return new TextEncoder().encode(env.JWT_SECRET);
}

async function sendMagicLinkEmail(env, { to, magicLink }) {
  if (!env.RESEND_API_KEY) return false;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || 'noreply@rainydaymerchandise.com',
        to,
        subject: 'Sign in to Rainy Day Merchandise',
        html: `<p>Click below to sign in:</p><a href="${magicLink}">Sign In</a>`,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[Auth] Resend error:', error.message);
    return false;
  }
}

/** POST /api/auth/magic-link */
export async function handleMagicLinkRequest(request, env) {
  const { email } = await readParams(request);
  if (!email || !email.includes('@')) {
    return json({ error: 'Valid email address is required' }, { status: 400 });
  }

  try {
    const existing = await findContactByEmail(env, email);
    const contactId = existing
      ? existing.id
      : (await createContact(env, { email: email.toLowerCase().trim() })).id;

    const token = randomHex(32);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    await updateContact(env, contactId, {
      [MAGIC_LINK_TOKEN_PROPERTY]: token,
      [MAGIC_LINK_EXPIRES_PROPERTY]: expiresAt.toISOString(),
    });

    const baseUrl = env.BASE_URL || 'https://www.rainydaymerchandise.com';
    const magicLink = `${baseUrl}/login?token=${token}&email=${encodeURIComponent(email)}`;
    await sendMagicLinkEmail(env, { to: email, magicLink });

    // The response is deliberately identical whether or not the contact
    // existed, so it cannot be used to enumerate customers.
    return json({
      success: true,
      message: 'If an account exists, a magic link has been sent.',
    });
  } catch (error) {
    return json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

/** POST /api/auth/verify-link */
export async function handleVerifyLink(request, env) {
  const { token, email } = await readParams(request);
  if (!token || !email) return json({ error: 'Token and email are required' }, { status: 400 });

  const key = secretKey(env);
  if (!key) return json({ error: 'Auth is not configured (JWT_SECRET missing)' }, { status: 500 });

  try {
    const contact = await findContactByEmail(env, email, [
      'email',
      MAGIC_LINK_TOKEN_PROPERTY,
      MAGIC_LINK_EXPIRES_PROPERTY,
    ]);
    if (!contact) return json({ error: 'Invalid link' }, { status: 401 });

    const storedToken = contact.properties[MAGIC_LINK_TOKEN_PROPERTY] || '';
    if (!timingSafeEqual(storedToken, token)) {
      return json({ error: 'Invalid link' }, { status: 401 });
    }

    const expiresAt = contact.properties[MAGIC_LINK_EXPIRES_PROPERTY];
    if (!expiresAt || new Date(expiresAt) < new Date()) {
      return json({ error: 'Expired link' }, { status: 401 });
    }

    // Single use: burn the token before issuing a session.
    await updateContact(env, contact.id, {
      [MAGIC_LINK_TOKEN_PROPERTY]: '',
      [MAGIC_LINK_EXPIRES_PROPERTY]: '',
    });

    const sessionToken = await new SignJWT({
      contactId: contact.id,
      email: contact.properties.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(env.JWT_EXPIRES_IN || '30d')
      .sign(key);

    return json({
      success: true,
      token: sessionToken,
      contact: { id: contact.id, email: contact.properties.email },
    });
  } catch (error) {
    console.error('[Auth] verify-link error:', error.message);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/auth/verify-session */
export async function handleVerifySession(request, env) {
  const params = await readParams(request);
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || params.token;

  if (!token) return json({ error: 'No token' }, { status: 401 });

  const key = secretKey(env);
  if (!key) return json({ error: 'Auth is not configured (JWT_SECRET missing)' }, { status: 500 });

  let decoded;
  try {
    ({ payload: decoded } = await jwtVerify(token, key));
  } catch {
    return json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  // A valid session still resolves to the stored contact when possible, but a
  // CRM hiccup must not invalidate an otherwise good session.
  if (env.HUBSPOT_ACCESS_TOKEN && decoded.contactId) {
    try {
      const contact = await getContact(env, decoded.contactId, [
        'email',
        'firstname',
        'lastname',
      ]);
      return json({
        success: true,
        contact: {
          id: contact.id,
          email: contact.properties.email,
          firstName: contact.properties.firstname,
          lastName: contact.properties.lastname,
        },
      });
    } catch (error) {
      console.error('[Auth] Fetch contact error:', error.message);
    }
  }

  return json({
    success: true,
    contact: { id: decoded.contactId, email: decoded.email },
  });
}
