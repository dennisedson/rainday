import { useState, useEffect } from 'react';
import ProductCard from '../shared/ProductCard';

const API_ENDPOINT = 'https://hsecommerce-api.vercel.app/api/square-products';
const FAVORITES_API = 'https://hsecommerce-api.vercel.app/api/favorites';

/**
 * FavoritesIsland - Displays all favorited products
 */
export default function FavoritesIsland({ siteName = 'Rainy Day Merchandise' }) {
  const [favorites, setFavorites] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch favorites and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get user identifier (tracking token or email)
        const cookies = document.cookie.split('; ');
        const hubspotCookie = cookies.find(row => row.startsWith('hubspotutk='));
        const trackingToken = hubspotCookie ? hubspotCookie.split('=')[1] : null;
        
        let favoritesResponse;
        if (trackingToken) {
          favoritesResponse = await fetch(`${FAVORITES_API}?hubspotutk=${encodeURIComponent(trackingToken)}`);
        } else {
          const userId = localStorage.getItem('user_email') || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          if (!localStorage.getItem('user_email')) {
            localStorage.setItem('user_email', userId);
          }
          favoritesResponse = await fetch(`${FAVORITES_API}?email=${encodeURIComponent(userId)}`);
        }
        let favoriteIds = [];
        
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json();
          favoriteIds = favoritesData.favorites || [];
        } else {
          // Fallback to localStorage
          const localFavorites = localStorage.getItem('favorites');
          favoriteIds = localFavorites ? JSON.parse(localFavorites) : [];
        }

        setFavorites(favoriteIds);

        // Fetch all products
        const productsResponse = await fetch(API_ENDPOINT);
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products');
        }

        const productsData = await productsResponse.json();
        
        // Filter to only favorited products
        const favoritedProducts = productsData.products.filter(product => 
          favoriteIds.includes(product.id)
        );

        // Transform to ProductCard format
        const transformedProducts = favoritedProducts.map(product => ({
          id: product.id,
          image: product.image,
          title: product.name,
          category: product.category === 'uncategorized' ? '' : product.category,
          price: product.price,
          rating: 0,
          reviewCount: 0,
          available: product.available,
        }));

        setProducts(transformedProducts);
        setError(null);
      } catch (err) {
        console.error('[FavoritesIsland] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for favorites updates
    const handleFavoritesUpdate = () => {
      fetchData();
    };
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          My Favorites
        </h1>
        <p className="text-lg text-gray-600">
          {favorites.length === 0 
            ? 'You haven\'t favorited any products yet'
            : `${favorites.length} ${favorites.length === 1 ? 'item' : 'items'} saved`
          }
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-gray-500 text-lg mt-4">Loading favorites...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-16">
          <p className="text-red-500 text-lg">Error: {error}</p>
          <p className="text-gray-500 mt-2">Please try again later</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-16">
          <svg className="mx-auto h-24 w-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No favorites yet</h2>
          <p className="text-gray-500 mb-6">Start adding products to your favorites by clicking the heart icon!</p>
          <a
            href="/shop"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          >
            Browse Products
          </a>
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              image={product.image}
              title={product.title}
              category={product.category}
              price={product.price}
              rating={product.rating}
              reviewCount={product.reviewCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

