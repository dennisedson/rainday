/**
 * Auth Utilities
 * Client-side authentication helpers for magic link authentication
 */

import { post, get } from './api';

// Session token storage key
const SESSION_TOKEN_KEY = 'auth_session_token';

/**
 * Get stored session token
 */
export function getSessionToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Store session token
 */
export function setSessionToken(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

/**
 * Remove session token (logout)
 */
export function clearSessionToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * Request magic link
 */
export async function requestMagicLink(email) {
  try {
    const data = await post('/auth/magic-link', { email });
    return data;
  } catch (error) {
    console.error('[Auth] Error requesting magic link:', error);
    // Provide more helpful error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('API request failed')) {
      throw new Error('Unable to connect to server. Please check your internet connection and try again.');
    }
    throw error;
  }
}

/**
 * Verify magic link token
 */
export async function verifyMagicLink(token, email) {
  try {
    const data = await get(`/auth/verify-link?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);

    // Store session token
    if (data.token) {
      setSessionToken(data.token);
    }

    return data;
  } catch (error) {
    console.error('[Auth] Error verifying magic link:', error);
    throw error;
  }
}

/**
 * Verify current session
 */
export async function verifySession() {
  const token = getSessionToken();
  
  if (!token) {
    console.log('[Auth] No token found in localStorage');
    return null;
  }

  console.log('[Auth] Verifying session with token:', token.substring(0, 20) + '...');

  try {
    const data = await post('/auth/verify-session', { token }, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('[Auth] Verify session response data:', data);
    console.log('[Auth] Session verified successfully for:', data.contact?.email);
    return data.contact;
  } catch (error) {
    console.error('[Auth] Error verifying session:', error);
    // Don't clear token on network errors - might be temporary
    if (error.message.includes('Failed to fetch') || error.message.includes('API request failed')) {
      console.log('[Auth] Network error, keeping token for retry');
    } else {
      clearSessionToken();
    }
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const contact = await verifySession();
  return contact !== null;
}

/**
 * Logout
 */
export function logout() {
  clearSessionToken();
  // Dispatch event for other components
  window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { authenticated: false } }));
  // Redirect to home page
  window.location.href = '/';
}

