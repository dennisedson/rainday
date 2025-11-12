import { useState, useEffect } from 'react';
import ProductCard from '../shared/ProductCard';

// Vercel API endpoint for Square products
const API_ENDPOINT = 'https://hsecommerce-api.vercel.app/api/square-products';

/**
 * TrendingProductsIsland - Client-side component for fetching and displaying trending products
 * This runs in the browser as an island
 */
export default function TrendingProductsIsland({
  sectionTitle,
  subtitle,
  showViewAll,
  viewAllLink,
  viewAllText,
  maxProducts,
}) {
  // State for products, loading, and errors
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle add to cart
  const handleAddToCart = (productId) => {
    // Find the product
    const product = products.find(p => p.id === productId);
    if (!product) {
      console.error('[TrendingProductsIsland] Product not found:', productId);
      return;
    }

    // Get existing cart
    let cart = [];
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        cart = JSON.parse(savedCart);
      }
    } catch (e) {
      console.error('[TrendingProductsIsland] Failed to parse cart:', e);
    }

    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex > -1) {
      // Update quantity
      cart[existingIndex].quantity += 1;
    } else {
      // Add new item
      cart.push({
        id: product.id,
        name: product.title,
        price: product.price,
        quantity: 1,
        image: product.image,
        category: product.category || 'Products'
      });
    }

    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));

    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new Event('cartUpdated'));

    // Show success message (optional - could use a toast notification instead)
    console.log(`Added ${product.title} to cart`);
  };

  // Fetch products from Vercel API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(API_ENDPOINT);

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }

        const data = await response.json();

        // Transform Square products to our format and limit to maxProducts
        const transformedProducts = data.products
          .slice(0, maxProducts || 4)
          .map(product => ({
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
        console.error('[TrendingProductsIsland] Error fetching products:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [maxProducts]);

  return (
    <section className="py-16 bg-beige">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {sectionTitle || 'Trending Now'}
            </h2>
            {subtitle && (
              <p className="text-gray-600">{subtitle}</p>
            )}
          </div>

          {/* View All Link */}
          {showViewAll && (
            <a
              href={viewAllLink || '/shop'}
              className="flex items-center gap-2 text-gray-900 font-semibold hover:text-primary transition-colors duration-200"
            >
              <span>{viewAllText || 'View All'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
            <p className="text-gray-500 text-lg mt-4">Loading products...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg">Error: {error}</p>
            <p className="text-gray-500 mt-2">Please try again later</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  onAddToCart={handleAddToCart}
                  productUrl={`/product?id=${encodeURIComponent(product.id)}`}
                />
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">No products found</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

