/**
 * Favorites Service
 * Manages favorites sync with HubSpot CRM
 * Falls back to localStorage if email not available
 */

const API_BASE_URL = 'https://hsecommerce-api.vercel.app/api';

// Get HubSpot tracking token from cookie
function getHubSpotTrackingToken() {
  const cookies = document.cookie.split('; ');
  const hubspotCookie = cookies.find(row => row.startsWith('hubspotutk='));
  
  if (hubspotCookie) {
    return hubspotCookie.split('=')[1];
  }
  
  return null;
}

// Get user identifier (HubSpot tracking token or fallback)
function getUserIdentifier() {
  // Try to get HubSpot tracking token first
  const trackingToken = getHubSpotTrackingToken();
  
  if (trackingToken) {
    return { type: 'tracking_token', value: trackingToken };
  }
  
  // Fallback to localStorage email if available
  let userId = localStorage.getItem('user_email');
  
  if (!userId) {
    // Generate a temporary ID as last resort
    userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user_email', userId);
  }
  
  return { type: 'email', value: userId };
}

/**
 * Get all favorites for current user
 */
export async function getFavorites() {
  try {
    const identifier = getUserIdentifier();
    const params = new URLSearchParams();
    
    if (identifier.type === 'tracking_token') {
      params.append('hubspotutk', identifier.value);
    } else {
      params.append('email', identifier.value);
    }
    
    const response = await fetch(`${API_BASE_URL}/favorites?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch favorites');
    }
    
    const data = await response.json();
    
    // Also sync to localStorage as backup
    localStorage.setItem('favorites', JSON.stringify(data.favorites || []));
    
    return data.favorites || [];
  } catch (error) {
    console.error('[Favorites] Error fetching favorites:', error);
    
    // Fallback to localStorage
    try {
      const localFavorites = localStorage.getItem('favorites');
      return localFavorites ? JSON.parse(localFavorites) : [];
    } catch (e) {
      return [];
    }
  }
}

/**
 * Toggle favorite status for a product
 */
export async function toggleFavorite(productId) {
  try {
    const identifier = getUserIdentifier();
    const body = {
      productId,
      action: 'toggle',
    };
    
    if (identifier.type === 'tracking_token') {
      body.hubspotutk = identifier.value;
    } else {
      body.email = identifier.value;
    }
    
    const response = await fetch(`${API_BASE_URL}/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update favorite');
    }
    
    const data = await response.json();
    
    // Sync to localStorage
    localStorage.setItem('favorites', JSON.stringify(data.favorites || []));
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('favoritesUpdated', {
      detail: { favorites: data.favorites, count: data.count },
    }));
    
    return data;
  } catch (error) {
    console.error('[Favorites] Error toggling favorite:', error);
    
    // Fallback to localStorage
    try {
      const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const index = localFavorites.indexOf(productId);
      
      if (index > -1) {
        localFavorites.splice(index, 1);
      } else {
        localFavorites.push(productId);
      }
      
      localStorage.setItem('favorites', JSON.stringify(localFavorites));
      
      window.dispatchEvent(new CustomEvent('favoritesUpdated', {
        detail: { favorites: localFavorites, count: localFavorites.length },
      }));
      
      return {
        success: true,
        favorites: localFavorites,
        count: localFavorites.length,
        isFavorite: localFavorites.includes(productId),
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
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

