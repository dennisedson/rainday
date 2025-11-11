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

// Get session token from localStorage
function getSessionToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_session_token');
}

// Get user identifier (authenticated email > tracking token > fallback)
async function getUserIdentifier() {
  // First, check if user is authenticated (has session token)
  const sessionToken = getSessionToken();
  if (sessionToken) {
    try {
      // Verify session and get contact email
      const response = await fetch(`${API_BASE_URL}/auth/verify-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ token: sessionToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.contact && data.contact.email) {
          return { type: 'email', value: data.contact.email };
        }
      }
    } catch (error) {
      console.error('[Favorites] Error verifying session:', error);
      // Fall through to other methods
    }
  }

  // Try to get HubSpot tracking token
  const trackingToken = getHubSpotTrackingToken();
  if (trackingToken) {
    return { type: 'tracking_token', value: trackingToken };
  }
  
  // Fallback: Don't use guest IDs - they're not valid emails
  // Return null to indicate no valid identifier
  return null;
}

/**
 * Get all favorites for current user
 */
export async function getFavorites() {
  try {
    const identifier = await getUserIdentifier();
    
    if (!identifier) {
      // No valid identifier - return empty array
      return [];
    }
    
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
    const identifier = await getUserIdentifier();
    
    if (!identifier) {
      throw new Error('Please sign in to save favorites');
    }
    
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
    
    // Fallback to localStorage only if we have a valid identifier
    const identifier = await getUserIdentifier();
    if (identifier) {
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
    
    return { success: false, error: error.message };
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

