/**
 * Who is asking.
 *
 * Its own module rather than part of auth.js because hubspot.js needs it, and
 * auth.js already imports hubspot.js — see the Square client extraction for the
 * same reasoning about cycles.
 */

import { jwtVerify } from 'jose';

export function secretKey(env) {
  // No fallback: sessions must never be signed with a guessable default.
  if (!env.JWT_SECRET) return null;
  return new TextEncoder().encode(env.JWT_SECRET);
}

/**
 * The single place that decides whether a caller is signed in.
 *
 * Returns the session's claims, or null. Callers MUST take the contact id from
 * here rather than from a request parameter — a client-supplied id is a request
 * to read someone else's data, not proof of who is asking.
 *
 * `params` is passed in by handlers that have already read the body, because a
 * Request body can only be consumed once.
 */
export async function requireSession(request, env, params = {}) {
  const key = secretKey(env);
  if (!key) return null;

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || params.token;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    return { contactId: payload.contactId, email: payload.email };
  } catch {
    return null;
  }
}
