import { useState, useEffect } from 'react';
import ProductCard from '../shared/ProductCard';
import { get } from '../../utils/api';

/**
 * ProductGridIsland - Client-side component for fetching and displaying products
 * This runs in the browser as an island
 */
export default function ProductGridIsland({ sectionTitle, sortBy, columnsDesktop, siteName = 'Rainy Day Merchandise' }) {
  // State for products, loading, and errors
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle add to cart
  const handleAddToCart = (productId) => {
    // Find the product
    const product = products.find(p => p.id === productId);
    if (!product) {
      console.error('[ProductGridIsland] Product not found:', productId);
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
      console.error('[ProductGridIsland] Failed to parse cart:', e);
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
        variationId: product.variationId, // ADDED: include variationId
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
  
  // Check URL for category and search parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');
    const urlSearch = urlParams.get('search');
    console.log('[ProductGridIsland] URL Category:', urlCategory);
    console.log('[ProductGridIsland] URL Search:', urlSearch);
    if (urlCategory) {
      setActiveCategory(urlCategory);
    }
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }
  }, []);

  // Update page meta when category or search changes
  useEffect(() => {
    if (searchQuery) {
      // Update page title for search results
      document.title = `Search: "${searchQuery}" - ${siteName}`;
      
      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = `Search results for "${searchQuery}" at ${siteName}. Find handcrafted products that match your search.`;

      // Update Open Graph tags for social sharing
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.content = `Search: "${searchQuery}" - ${siteName}`;

      let ogDescription = document.querySelector('meta[property="og:description"]');
      if (!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescription);
      }
      ogDescription.content = `Search results for "${searchQuery}" at ${siteName}`;
    } else if (activeCategory) {
      // Update page title
      document.title = `${activeCategory} - ${siteName}`;
      
      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = `Shop ${activeCategory} products at ${siteName}. Handcrafted with care, designed to inspire.`;

      // Update Open Graph tags for social sharing
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.content = `${activeCategory} - ${siteName}`;

      let ogDescription = document.querySelector('meta[property="og:description"]');
      if (!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescription);
      }
      ogDescription.content = `Shop ${activeCategory} products at ${siteName}`;
    }
  }, [activeCategory, searchQuery, siteName]);
  
  // Fetch products from Vercel API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('[ProductGridIsland] Starting fetch from: /square-products');
        setLoading(true);
        const data = await get('/square-products');
        console.log('[ProductGridIsland] Fetched data:', data);

        // Transform Square products to our format
        const transformedProducts = data.products.map(product => ({
          id: product.id,
          variationId: product.variationId,
          image: product.image,
          title: product.name,
          description: product.description || '',
          category: product.category === 'uncategorized' ? '' : product.category,
          price: product.price,
          rating: 0,
          reviewCount: 0,
          available: product.available,
        }));

        setProducts(transformedProducts);
        setCategories(data.categories || []);
        setError(null);
        console.log('[ProductGridIsland] Successfully set', transformedProducts.length, 'products');
        console.log('[ProductGridIsland] Available categories:', data.categories);
      } catch (err) {
        console.error('[ProductGridIsland] Error fetching products:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    console.log('[ProductGridIsland] useEffect running, fetching products...');
    fetchProducts();
  }, []);
  
  // Filter products by category and search query
  let filteredProducts = products;

  console.log('[ProductGridIsland] Filter category:', activeCategory);
  console.log('[ProductGridIsland] Search query:', searchQuery);
  console.log('[ProductGridIsland] Total products:', products.length);

  // Filter by category (from URL or state)
  if (activeCategory && activeCategory !== 'all') {
    filteredProducts = filteredProducts.filter(p => {
      // Flexible match: exact match OR singular/plural variations
      const productCat = p.category.toLowerCase();
      const filterCat = activeCategory.toLowerCase();

      // Exact match
      let match = productCat === filterCat;

      // Also match if one is singular and other is plural (e.g., "necklace" matches "necklaces")
      if (!match) {
        const productCatSingular = productCat.replace(/s$/, '');
        const filterCatSingular = filterCat.replace(/s$/, '');
        match = productCatSingular === filterCatSingular;
      }

      console.log(`[ProductGridIsland] Checking "${p.title}" (${p.category}) against "${activeCategory}": ${match}`);
      return match;
    });
  }
  
  // Filter by search query (searches in product name and description)
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    filteredProducts = filteredProducts.filter(p => {
      const nameMatch = p.title.toLowerCase().includes(query);
      const descriptionMatch = p.description && p.description.toLowerCase().includes(query);
      return nameMatch || descriptionMatch;
    });
  }
  
  console.log('[ProductGridIsland] Filtered products count:', filteredProducts.length);
  
  // Sort products
  if (sortBy === 'price-low') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  }
  
  const gridColsClass = {
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    '5': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-product-grid>
      {/* Section Title (only show if no active category and no search - banner handles category titles) */}
      {!activeCategory && !searchQuery && sectionTitle && (
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900">
            {sectionTitle}
          </h2>
        </div>
      )}

      {/* Search Results Header */}
      {searchQuery && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Search Results for "{searchQuery}"
          </h2>
          <p className="text-gray-600">
            {filteredProducts.length === 0
              ? 'No products found matching your search.'
              : `Found ${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'}.`
            }
          </p>
        </div>
      )}

      {/* Category Filter */}
      {!loading && !error && categories.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !activeCategory
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Products
          </button>
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === category.name
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

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
          <div className={`grid ${gridColsClass[columnsDesktop] || gridColsClass['4']} gap-6`}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                image={product.image}
                title={product.title}
                category={product.category}
                price={product.price}
                rating={product.rating}
                reviewCount={product.reviewCount}
                available={product.available}
                onAddToCart={handleAddToCart}
                productUrl={`/product?id=${encodeURIComponent(product.id)}`}
              />
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No products found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

