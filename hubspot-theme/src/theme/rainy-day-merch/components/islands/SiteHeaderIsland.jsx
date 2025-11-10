import { useState, useEffect } from 'react';
import { getFavoritesCount } from '../../utils/favorites';

const API_BASE_URL = 'https://hsecommerce-api.vercel.app/api';

export default function SiteHeaderIsland({ siteName = 'Artisan & Co.', logoImage = null }) {
  const [cartCount, setCartCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navigationItems, setNavigationItems] = useState([
    // Default fallback items
    { label: 'Shop', href: '/shop' },
    { label: 'About', href: '/about' },
  ]);

  // Update cart count from localStorage
  const updateCartCount = () => {
    try {
      const cart = localStorage.getItem('cart');
      if (cart) {
        const items = JSON.parse(cart);
        const count = items.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch (e) {
      console.error('Failed to parse cart:', e);
      setCartCount(0);
    }
  };

  // Fetch Square categories for navigation
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/square-categories`);
        if (response.ok) {
          const data = await response.json();
          
          // Map categories to navigation items
          const categoryNavItems = data.categories.map(cat => ({
            label: cat.name,
            href: `/shop?category=${encodeURIComponent(cat.name)}`,
          }));

          // Add "All Products" at the beginning and "About" at the end
          setNavigationItems([
            { label: 'All Products', href: '/shop' },
            ...categoryNavItems,
            { label: 'About', href: '/about' },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Keep fallback navigation items
      }
    };

    fetchCategories();
  }, []);

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to shop page with search query
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Update favorites count
  const updateFavoritesCount = async () => {
    try {
      const count = await getFavoritesCount();
      setFavoritesCount(count);
    } catch (error) {
      console.error('Failed to get favorites count:', error);
      setFavoritesCount(0);
    }
  };

  // Check URL for search query and pre-populate search input
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSearch = urlParams.get('search');
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setIsSearchOpen(true); // Keep search bar open if there's a search query
    }
  }, []);

  // Update cart count on mount and when localStorage changes
  useEffect(() => {
    updateCartCount();
    updateFavoritesCount();

    // Listen for storage events (cart updates from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'cart') {
        updateCartCount();
      } else if (e.key === 'favorites') {
        updateFavoritesCount();
      }
    };

    // Listen for custom cart update events
    const handleCartUpdate = () => {
      updateCartCount();
    };

    // Listen for favorites update events
    const handleFavoritesUpdate = () => {
      updateFavoritesCount();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, []);

  return (
    <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            {logoImage ? (
              <img 
                src={logoImage} 
                alt={siteName}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {siteName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-xl font-display font-semibold text-gray-900">
              {siteName}
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-primary transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search - Hidden on mobile */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="hidden sm:block p-2 text-gray-600 hover:text-primary transition-colors duration-200"
              aria-label="Search"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Favorites - Hidden on mobile */}
            <a
              href="/favorites"
              className="hidden sm:block relative p-2 text-gray-600 hover:text-primary transition-colors duration-200"
              aria-label={`Favorites (${favoritesCount} items)`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              )}
            </a>

            {/* Account - Hidden on mobile */}
            <a
              href="/account"
              className="hidden sm:block p-2 text-gray-600 hover:text-primary transition-colors duration-200"
              aria-label="Account"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </a>

            {/* Cart with Badge */}
            <a
              href="/cart"
              className="relative p-2 text-gray-600 hover:text-primary transition-colors duration-200"
              aria-label={`Cart with ${cartCount} items`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-primary transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar (slides down when open) */}
        {isSearchOpen && (
          <div className="py-4 border-t border-gray-200">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="search"
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Mobile Menu Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <span className="text-lg font-display font-semibold text-gray-900">Menu</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-600 hover:text-primary transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block px-6 py-3 text-base font-medium text-gray-700 hover:bg-beige-100 hover:text-primary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}

            {/* Divider */}
            <div className="my-4 border-t border-gray-200"></div>

            {/* Additional Mobile Links */}
            <a
              href="/favorites"
              className="flex items-center px-6 py-3 text-base font-medium text-gray-700 hover:bg-beige-100 hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Favorites
              {favoritesCount > 0 && (
                <span className="ml-auto bg-primary text-white text-xs font-bold rounded-full px-2 py-1">
                  {favoritesCount}
                </span>
              )}
            </a>
            <a
              href="/account"
              className="flex items-center px-6 py-3 text-base font-medium text-gray-700 hover:bg-beige-100 hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Account
            </a>
          </nav>

          {/* Mobile Menu Footer */}
          <div className="p-4 border-t border-gray-200 bg-beige-50">
            <a
              href="/cart"
              className="flex items-center justify-between px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>View Cart</span>
              {cartCount > 0 && (
                <span className="bg-white text-primary px-2 py-1 rounded-full text-sm font-bold">
                  {cartCount}
                </span>
              )}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

