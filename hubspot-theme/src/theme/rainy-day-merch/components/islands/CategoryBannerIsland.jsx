import { useState, useEffect } from 'react';

/**
 * CategoryBannerIsland - Dynamic banner that updates based on URL category parameter
 * Shows category-specific content and imagery
 */
export default function CategoryBannerIsland({ 
  siteName = 'Rainy Day Merchandise',
  customTitle = '',
  customDescription = '',
  showSaleBadge = true,
  showFeatures = true,
}) {
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [categoryImages, setCategoryImages] = useState({});

  // Fetch category images from Square
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('https://hsecommerce-api.vercel.app/api/square-categories');
        const data = await response.json();
        
        // Build map of category name to image
        const imageMap = {};
        data.categories.forEach(cat => {
          imageMap[cat.name] = cat.image;
        });
        
        setCategoryImages(imageMap);
        console.log('[CategoryBannerIsland] Category images:', imageMap);
      } catch (error) {
        console.error('[CategoryBannerIsland] Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  // Read category from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');
    
    setCategory(urlCategory || 'All Products');
    setIsLoading(false);
    
    console.log('[CategoryBannerIsland] Category:', urlCategory);
  }, []);

  // Category-specific content
  const categoryContent = {
    'Bracelets': {
      title: 'Bracelets',
      description: 'Discover our curated collection of handcrafted bracelets. From delicate chains to statement pieces, each bracelet is meticulously designed to elevate your style.',
      // image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&auto=format&fit=crop&q=80',
    },
    'Necklaces': {
      title: 'Necklaces',
      description: 'Discover our curated collection of handcrafted necklaces. From delicate chains to statement pieces, each necklace is meticulously designed to elevate your style.',
      // image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&auto=format&fit=crop&q=80',
    },
    'Earrings': {
      title: 'Earrings',
      description: 'Explore our stunning collection of handcrafted earrings. From subtle studs to bold dangles, each pair is designed to make a statement.',
      // image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200&auto=format&fit=crop&q=80',
    },
    'Keychains': {
      title: 'Keychains',
      description: 'Browse our unique collection of handcrafted keychains. Practical meets beautiful with designs that showcase artisan craftsmanship.',
      // image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1200&auto=format&fit=crop&q=80',
    },
    'Lanyards': {
      title: 'Lanyards',
      description: 'Discover our stylish collection of handcrafted lanyards. Functional accessories that don\'t compromise on style.',
      // image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1200&auto=format&fit=crop&q=80',
    },
    'All Products': {
      title: 'Shop All',
      description: 'Explore our entire collection of handcrafted jewelry and accessories. Each piece is designed with care and attention to detail.',
      // image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&auto=format&fit=crop&q=80',
    },
  };

  const content = categoryContent[category] || categoryContent['All Products'];
  
  // Use custom values if provided, otherwise use defaults
  const displayTitle = customTitle || content.title;
  const displayDescription = customDescription || content.description;
  
  // Use Square category image if available, otherwise fallback to hardcoded image
  const imageUrl = categoryImages[category] || content.image;

  if (isLoading) {
    return (
      <div className="relative bg-beige-100 h-96 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-64 bg-beige-200 rounded mx-auto mb-4"></div>
            <div className="h-6 w-96 bg-beige-200 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="relative bg-gradient-to-r from-beige-100 to-beige-50 overflow-hidden py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center rounded-3xl overflow-hidden bg-white shadow-2xl">
          {/* Text Content */}
          <div className="px-8 py-16 lg:px-12 lg:py-24">
            {showSaleBadge && (
              <div className="inline-block px-4 py-1 bg-primary text-white text-sm font-semibold rounded-full mb-6">
                SALE
              </div>
            )}
            <h1 className="text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-6">
              {displayTitle}
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              {displayDescription}
            </p>
            <button 
              onClick={() => {
                // Scroll to products
                const productGrid = document.querySelector('[data-product-grid]');
                if (productGrid) {
                  productGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="inline-flex items-center px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Shop Now
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            {/* Features */}
            {showFeatures && (
              <div className="grid grid-cols-3 gap-6 mt-12">
                <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full mb-3 shadow-md">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Handcrafted</h3>
                <p className="text-xs text-gray-600">With precision</p>
                </div>
                <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full mb-3 shadow-md">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Premium Materials</h3>
                <p className="text-xs text-gray-600">Ethically sourced</p>
                </div>
                <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full mb-3 shadow-md">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Gift Ready</h3>
                <p className="text-xs text-gray-600">Luxury packaging</p>
                </div>
              </div>
            )}
          </div>

          {/* Image */}
          <div className="relative h-full min-h-[400px] lg:min-h-[500px] overflow-hidden">
            <img
              src={imageUrl}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

