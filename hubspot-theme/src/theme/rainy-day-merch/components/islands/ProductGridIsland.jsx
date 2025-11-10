import { useState, useEffect } from 'react';
import ProductCard from '../shared/ProductCard';

// Vercel API endpoint for Square products
const API_ENDPOINT = 'https://hsecommerce-api.vercel.app/api/square-products';

/**
 * ProductGridIsland - Client-side component for fetching and displaying products
 * This runs in the browser as an island
 */
export default function ProductGridIsland({ sectionTitle, category, sortBy, columnsDesktop }) {
  // State for products, loading, and errors
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
  
  // Filter products by category
  let filteredProducts = products;
  if (category && category !== 'all') {
    filteredProducts = filteredProducts.filter(p => 
      p.category.toLowerCase().includes(category.toLowerCase())
    );
  }
  
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {sectionTitle && (
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
          {sectionTitle}
        </h2>
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

