/**
 * Favorites Service
 * Manages favorites sync with HubSpot CRM for signed-in customers.
 * Signed-out visitors fall back to localStorage.
 */

import { get, post } from './api';

// Get session token from localStorage
function getSessionToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_session_token');
}

function readLocalFavorites() {
  try {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
  } catch (e) {
    return [];
  }
}

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * Get all favorites for current user
 */
export async function getFavorites() {
  const token = getSessionToken();

  // Signed-out visitors keep the localStorage list they have always actually
  // been using: the server never read the hubspotutk parameter this used to
  // send, so anonymous favorites have never persisted to the CRM.
  if (!token) return readLocalFavorites();

  try {
    const data = await get('/favorites', authHeaders(token));
    localStorage.setItem('favorites', JSON.stringify(data.favorites || []));
    return data.favorites || [];
  } catch (error) {
    console.error('[Favorites] Error fetching favorites:', error);
    return readLocalFavorites();
  }
}

/**
 * Toggle favorite status for a product
 */
export async function toggleFavorite(productId) {
  const token = getSessionToken();

  const localToggle = () => {
    const favorites = readLocalFavorites();
    const index = favorites.indexOf(productId);
    if (index > -1) favorites.splice(index, 1);
    else favorites.push(productId);

    localStorage.setItem('favorites', JSON.stringify(favorites));
    window.dispatchEvent(new CustomEvent('favoritesUpdated', {
      detail: { favorites, count: favorites.length },
    }));

    return {
      success: true,
      favorites,
      count: favorites.length,
      isFavorite: favorites.includes(productId),
    };
  };

  if (!token) return localToggle();

  try {
    const data = await post('/favorites', { productId, action: 'toggle' }, authHeaders(token));
    localStorage.setItem('favorites', JSON.stringify(data.favorites || []));
    window.dispatchEvent(new CustomEvent('favoritesUpdated', {
      detail: { favorites: data.favorites, count: data.count },
    }));
    return data;
  } catch (error) {
    console.error('[Favorites] Error toggling favorite:', error);
    return localToggle();
  }
}

/**
 * Check if a product is favorited
 */
export async function isFavorite(productId) {
  const favorites = await getFavorites();
  return favorites.includes(productId);
}

/**
 * Get favorites count
 */
export async function getFavoritesCount() {
  const favorites = await getFavorites();
  return favorites.length;
}

