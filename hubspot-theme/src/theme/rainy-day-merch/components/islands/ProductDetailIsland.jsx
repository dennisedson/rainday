import { useState, useEffect } from 'react';
import Icon from '../shared/Icon';
import { toggleFavorite, isFavorite } from '../../utils/favorites';

// Vercel API endpoint for single Square product
const API_ENDPOINT = 'https://hsecommerce-api.vercel.app/api/square-product';

/**
 * Update page title and meta tags for SEO
 */
function updatePageMeta(product) {
  if (!product) return;
  
  // Update page title
  document.title = `${product.name} - Rainy Day Merchandise`;
  
  // Update or create meta description
  const description = product.description || `Buy ${product.name} for $${product.price.toFixed(2)}`;
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.name = 'description';
    document.head.appendChild(metaDescription);
  }
  metaDescription.content = description;
  
  // Update Open Graph tags for social sharing
  updateMetaTag('og:title', product.name);
  updateMetaTag('og:description', description);
  updateMetaTag('og:image', product.mainImage);
  updateMetaTag('og:url', window.location.href);
  updateMetaTag('og:type', 'product');
  updateMetaTag('product:price:amount', product.price.toFixed(2));
  updateMetaTag('product:price:currency', 'USD');
  
  // Update Twitter Card tags
  updateMetaTag('twitter:card', 'summary_large_image', 'name');
  updateMetaTag('twitter:title', product.name, 'name');
  updateMetaTag('twitter:description', description, 'name');
  updateMetaTag('twitter:image', product.mainImage, 'name');
}

/**
 * Helper function to update or create meta tags
 */
function updateMetaTag(property, content, attributeName = 'property') {
  let metaTag = document.querySelector(`meta[${attributeName}="${property}"]`);
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.setAttribute(attributeName, property);
    document.head.appendChild(metaTag);
  }
  metaTag.content = content;
}

/**
 * ProductDetailIsland - Client-side component for fetching and displaying a single product
 * Reads product ID from URL and fetches from Square API
 */
export default function ProductDetailIsland({ 
  fallbackData, 
  showBadges = true, 
  badge1Text = 'Free Shipping', 
  badge2Text = '1 Year Warranty', 
  badge3Text = '30-Day Returns',
  descriptionOverride = ''
}) {
  const [product, setProduct] = useState(fallbackData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  // Use override if provided
  const displayDescription = descriptionOverride || product?.description;
  
  // Get product ID from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
      setError('No product ID provided');
      setLoading(false);
      return;
    }

    // Check favorite status
    const checkFavorite = async () => {
      try {
        const favorited = await isFavorite(productId);
        setIsFavorited(favorited);
      } catch (err) {
        console.error('[ProductDetailIsland] Error checking favorite:', err);
      }
    };
    checkFavorite();

    // Listen for favorites updates
    const handleFavoritesUpdate = () => {
      checkFavorite();
    };
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);

    // Fetch product data from API
    const fetchProduct = async () => {
      try {
        console.log('[ProductDetailIsland] Fetching product:', productId);
        setLoading(true);
        
        const response = await fetch(`${API_ENDPOINT}?id=${encodeURIComponent(productId)}`);
        console.log('[ProductDetailIsland] Response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Product not found');
          }
          throw new Error(`Failed to fetch product: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[ProductDetailIsland] Fetched data:', data);
        
        const productData = data.product;
        setProduct(productData);
        setError(null);
        
        // Update page title and meta tags for SEO
        updatePageMeta(productData);
      } catch (err) {
        console.error('[ProductDetailIsland] Error fetching product:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();

    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, []);
  
  // Loading state
  if (loading) {
    return (
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-gray-500 text-lg mt-4">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !product) {
    return (
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-8">{error || 'This product does not exist or has been removed.'}</p>
            <a 
              href="/shop" 
              className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Browse All Products
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // Prepare images array
  const allImages = [product.mainImage, ...(product.galleryImages || [])].filter(Boolean);
  
  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/" className="hover:text-gray-900">Home</a>
          <span>&gt;</span>
          <a href="/shop" className="hover:text-gray-900">Shop</a>
          <span>&gt;</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>
      </div>

      {/* Product Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left: Image Gallery */}
          <div>
            {/* Main Image */}
            <div className="bg-gray-100 rounded-xl overflow-hidden mb-4">
              <img
                src={allImages[selectedImage]}
                alt={product.name}
                className="w-full aspect-square object-cover"
              />
            </div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`border-2 rounded-xl overflow-hidden hover:border-orange-500 transition-colors ${
                      selectedImage === idx ? 'border-orange-500' : 'border-gray-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div>
            {/* Product Name */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-gray-900">
                  ${product.price.toFixed(2)}
                </span>
                {!product.available && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 font-semibold rounded-full text-sm border border-gray-300">
                    Out of Stock
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {displayDescription && (
              <p className="text-gray-600 mb-6 leading-relaxed">
                {displayDescription}
              </p>
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className={`block text-sm font-semibold ${product.available ? 'text-gray-900' : 'text-gray-400'} mb-3`}>
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={!product.available}
                  className={`w-10 h-10 flex items-center justify-center border border-gray-300 rounded ${product.available ? 'hover:bg-gray-50 bg-white text-gray-700' : 'bg-gray-50 text-gray-300 cursor-not-allowed'} transition-colors font-normal`}
                  aria-label="Decrease quantity"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                >
                  <span className="text-xl leading-none">−</span>
                </button>
                <input
                  type="text"
                  value={quantity}
                  readOnly
                  className={`w-16 h-10 text-center border border-gray-300 rounded font-semibold ${product.available ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-400'}`}
                  style={{ MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={!product.available}
                  className={`w-10 h-10 flex items-center justify-center border border-gray-300 rounded ${product.available ? 'hover:bg-gray-50 bg-white text-gray-700' : 'bg-gray-50 text-gray-300 cursor-not-allowed'} transition-colors font-normal`}
                  aria-label="Increase quantity"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                >
                  <span className="text-xl leading-none">+</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                disabled={!product.available}
                onClick={() => {
                  // Get existing cart
                  let cart = [];
                  try {
                    const savedCart = localStorage.getItem('cart');
                    if (savedCart) {
                      cart = JSON.parse(savedCart);
                    }
                  } catch (e) {
                    console.error('Failed to parse cart:', e);
                  }

                  // Check if product already in cart
                  const existingIndex = cart.findIndex(item => item.id === product.id);
                  
                  if (existingIndex > -1) {
                    // Update quantity
                    cart[existingIndex].quantity += quantity;
                  } else {
                    // Add new item
                    cart.push({
                      id: product.id,
                      variationId: product.variationId, // ADDED: save the variation ID for tax calculation
                      name: product.name,
                      price: product.price,
                      quantity: quantity,
                      image: product.mainImage,
                      category: product.category || 'Products'
                    });
                  }

                  // Save cart
                  localStorage.setItem('cart', JSON.stringify(cart));

                  // Dispatch custom event to update cart count in header
                  window.dispatchEvent(new Event('cartUpdated'));

                  // Show success message
                  alert(`Added ${quantity} x ${product.name} to cart!`);
                }}
                className={`flex-1 ${product.available ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {product.available ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                className={`w-12 h-12 flex items-center justify-center border rounded-lg transition-colors ${
                  isFavorited 
                    ? 'bg-red-50 border-red-200' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                disabled={isToggling}
                onClick={async () => {
                  if (isToggling) return;
                  setIsToggling(true);
                  try {
                    const result = await toggleFavorite(product.id);
                    if (result.success) {
                      setIsFavorited(result.isFavorite);
                    }
                  } catch (err) {
                    console.error('[ProductDetailIsland] Error toggling favorite:', err);
                  } finally {
                    setIsToggling(false);
                  }
                }}
              >
                <Icon
                  name={isFavorited ? 'heartFilled' : 'heart'}
                  size={24}
                  className={isFavorited ? 'text-red-500' : 'text-gray-600'}
                />
              </button>
            </div>

            {/* Buy Now Button */}
            <button
              disabled={!product.available}
              onClick={() => {
                // Add to cart
                let cart = [];
                try {
                  const savedCart = localStorage.getItem('cart');
                  if (savedCart) {
                    cart = JSON.parse(savedCart);
                  }
                } catch (e) {
                  console.error('Failed to parse cart:', e);
                }

                const existingIndex = cart.findIndex(item => item.id === product.id);
                
                if (existingIndex > -1) {
                  cart[existingIndex].quantity += quantity;
                } else {
                  cart.push({
                    id: product.id,
                    variationId: product.variationId, // required: orders are priced by catalog variation
                    name: product.name,
                    price: product.price,
                    quantity: quantity,
                    image: product.mainImage,
                    category: product.category || 'Products'
                  });
                }

                localStorage.setItem('cart', JSON.stringify(cart));
                window.dispatchEvent(new Event('cartUpdated'));

                // Redirect to cart
                window.location.href = '/cart';
              }}
              className={`w-full ${product.available ? 'bg-white border-gray-900 text-gray-900 hover:bg-gray-50' : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'} border-2 py-3 px-6 rounded-lg font-semibold transition-colors mb-6`}
            >
              Buy Now
            </button>

            {/* Trust Badges */}
            {showBadges && (
              <div className="grid grid-cols-3 gap-6 py-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{badge1Text}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{badge2Text}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{badge3Text}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

