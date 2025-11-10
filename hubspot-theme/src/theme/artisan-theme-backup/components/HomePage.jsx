import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import HeroSection from './HeroSection';
import ProductGrid from './ProductGrid';
import CategoryFilter from './CategoryFilter';
import SortDropdown from './SortDropdown';
import Slider from './Slider';
import Container from './Container';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';

/**
 * HomePage component
 * Main landing page with hero, filters, and product grid
 */
const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 500 });
  const [sortBy, setSortBy] = useState('featured');

  const { getItemCount: getCartCount } = useCart();
  const { getItemCount: getWishlistCount } = useWishlist();

  // Fetch products from Square
  useEffect(() => {
    fetchProducts();
  }, []);

  // Apply filters whenever they change
  useEffect(() => {
    applyFilters();
  }, [products, selectedCategory, priceRange, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/_hcms/api/square-products');
      const data = await response.json();
      
      if (data.products) {
        setProducts(data.products);
        
        // Build categories from products
        const uniqueCategories = [...new Set(data.products.map(p => p.category))].filter(Boolean);
        const categoryList = uniqueCategories.map(cat => ({
          id: cat,
          name: cat,
          count: data.products.filter(p => p.category === cat).length,
        }));
        setCategories(categoryList);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Use sample data for demo
      setSampleData();
    } finally {
      setLoading(false);
    }
  };

  const setSampleData = () => {
    // Sample data for demonstration
    const sampleProducts = [
      {
        id: '1',
        name: 'Luminous Pearl Necklace',
        category: 'Necklaces',
        price: 84,
        images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500'],
        rating: 4.5,
        reviewCount: 32,
      },
      {
        id: '2',
        name: 'Artisan Teardrop Earrings',
        category: 'Earrings',
        price: 67,
        originalPrice: 89,
        images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500'],
        rating: 5,
        reviewCount: 54,
        onSale: true,
      },
      // Add more sample products as needed
    ];
    
    setProducts(sampleProducts);
    setCategories([
      { id: 'Necklaces', name: 'Necklaces', count: 24 },
      { id: 'Earrings', name: 'Earrings', count: 32 },
      { id: 'Bracelets', name: 'Bracelets', count: 18 },
      { id: 'Rings', name: 'Rings', count: 15 },
    ]);
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by price range
    filtered = filtered.filter(
      p => p.price >= priceRange.min && p.price <= priceRange.max
    );

    // Sort
    switch (sortBy) {
      case 'price-low-high':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
      case 'featured':
      default:
        // Keep original order
        break;
    }

    setFilteredProducts(filtered);
  };

  return (
    <div className="min-h-screen bg-beige">
      <Header
        cartItemCount={getCartCount()}
        wishlistItemCount={getWishlistCount()}
        onCartClick={() => window.location.href = '/cart'}
        onWishlistClick={() => window.location.href = '/wishlist'}
      />

      <HeroSection
        image={products[0]?.images?.[0]}
      />

      <Container className="py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Price Range
              </h3>
              <Slider
                min={0}
                max={500}
                minValue={priceRange.min}
                maxValue={priceRange.max}
                onChange={setPriceRange}
              />
            </div>
          </aside>

          {/* Products Grid */}
          <main className="lg:col-span-3">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                {filteredProducts.length} products
              </p>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>

            <ProductGrid
              products={filteredProducts}
              loading={loading}
            />
          </main>
        </div>
      </Container>

      <Footer />
    </div>
  );
};

export default HomePage;

