import { useState, useEffect } from 'react';
import { verifySession, logout, getSessionToken } from '../../utils/auth';
import { getFavorites } from '../../utils/favorites';

const API_BASE_URL = 'https://hsecommerce-api.vercel.app/api';

export default function AccountIsland() {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadFavorites();
    loadOrders();
  }, []);

  // Check if we're in HubSpot editor
  const isHubSpotEditor = () => {
    return typeof window !== 'undefined' && (
      window.hsEditor !== undefined ||
      window.location.search.includes('hsEditor=true') ||
      window.location.search.includes('hs_preview') ||
      window.parent !== window // Iframe check
    );
  };

  const checkAuth = async () => {
    // Don't redirect in HubSpot editor
    if (isHubSpotEditor()) {
      setLoading(false);
      // Show placeholder content in editor
      setContact({ email: 'example@email.com', id: 'editor-preview' });
      return;
    }

    try {
      const token = getSessionToken();
      console.log('[Account] Checking auth, token exists:', !!token);
      
      if (!token) {
        console.log('[Account] No token found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      const sessionContact = await verifySession();
      console.log('[Account] Session verification result:', sessionContact ? 'Success' : 'Failed');
      
      if (sessionContact) {
        setContact(sessionContact);
      } else {
        // Not authenticated, redirect to login
        console.log('[Account] Session invalid, redirecting to login');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('[Account] Auth check error:', error);
      // Don't redirect immediately on error - might be network issue
      // Wait a bit and retry once
      setTimeout(() => {
        const token = getSessionToken();
        if (!token) {
          window.location.href = '/login';
        }
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    // Skip in editor
    if (isHubSpotEditor()) {
      setFavorites([]);
      return;
    }

    try {
      const favs = await getFavorites();
      setFavorites(favs);
    } catch (error) {
      console.error('[Account] Error loading favorites:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const token = getSessionToken();
      
      if (!token) {
        setOrdersLoading(false);
        return;
      }

      // Fetch orders from HubSpot Deals associated with this contact
      // This would require a new API endpoint to fetch deals by contact ID
      // For now, we'll show a placeholder
      setOrders([]);
    } catch (error) {
      console.error('[Account] Error loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-gray-500 text-lg mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    // In editor, show placeholder. Otherwise will redirect
    if (isHubSpotEditor()) {
      return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">My Account</h1>
              <p className="text-gray-600">This page requires authentication. Users will be redirected to login if not signed in.</p>
            </div>
          </div>
        </div>
      );
    }
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
              <p className="text-gray-600 mt-1">{contact.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Favorites Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Favorites</h2>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {favorites.map((productId) => (
                <div key={productId} className="bg-gray-100 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Product ID: {productId}</p>
                  {/* TODO: Fetch and display actual product details */}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">You haven't favorited any products yet.</p>
          )}
          <div className="mt-4">
            <a
              href="/favorites"
              className="text-primary hover:text-primary-600 font-medium"
            >
              View all favorites →
            </a>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order History</h2>
          {ordersLoading ? (
            <p className="text-gray-500">Loading orders...</p>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">{order.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">${order.total}</p>
                      <p className="text-sm text-gray-600">{order.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">You haven't placed any orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

