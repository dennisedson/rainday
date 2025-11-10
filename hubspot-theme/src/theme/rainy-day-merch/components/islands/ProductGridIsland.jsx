import { useState, useEffect } from 'react';
import ProductCard from '../shared/ProductCard';

// Vercel API endpoint for Square products
const API_ENDPOINT = 'https://hsecommerce-api.vercel.app/api/square-products';

/**
 * ProductGridIsland - Client-side component for fetching and displaying products
 * This runs in the browser as an island
 */
export default function ProductGridIsland({ sectionTitle, category, sortBy, columnsDesktop, siteName = 'Rainy Day Merchandise' }) {
  // State for products, loading, and errors
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(category || null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
        console.log('[ProductGridIsland] Starting fetch from:', API_ENDPOINT);
        setLoading(true);
        const response = await fetch(API_ENDPOINT);
        console.log('[ProductGridIsland] Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[ProductGridIsland] Fetched data:', data);
        
        // Transform Square products to our format
        const transformedProducts = data.products.map(product => ({
          id: product.id,
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
        setError(null);
        console.log('[ProductGridIsland] Successfully set', transformedProducts.length, 'products');
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
  const filterCategory = activeCategory || category;
  
  console.log('[ProductGridIsland] Filter category:', filterCategory);
  console.log('[ProductGridIsland] Search query:', searchQuery);
  console.log('[ProductGridIsland] Total products:', products.length);
  
  // Filter by category (from URL or prop)
  if (filterCategory && filterCategory !== 'all') {
    filteredProducts = filteredProducts.filter(p => {
      // Exact match comparison (case-insensitive)
      const match = p.category.toLowerCase() === filterCategory.toLowerCase();
      console.log(`[ProductGridIsland] Checking "${p.title}" (${p.category}) against "${filterCategory}": ${match}`);
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

