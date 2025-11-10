import React, { useState } from 'react';
import Container from './Container';
import Icon from './Icon';
import Input from './Input';
import Badge from './Badge';

/**
 * Header component (S) - Main navigation header
 * Includes logo, navigation menu, search, wishlist, account, and cart
 */
const Header = ({
  cartItemCount = 0,
  wishlistItemCount = 0,
  onSearch,
  onCartClick,
  onWishlistClick,
  onAccountClick,
  className = '',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigationItems = [
    { label: 'New Arrivals', href: '/new-arrivals' },
    { label: 'Jewelry', href: '/jewelry' },
    { label: 'Crafts', href: '/crafts' },
    { label: 'Collections', href: '/collections' },
    { label: 'About', href: '/about' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className={`bg-white shadow-sm sticky top-0 z-50 ${className}`}>
      <Container>
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-display font-semibold text-gray-900">
              Artisan & Co.
            </span>
          </div>

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
          <div className="flex items-center gap-4">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-gray-600 hover:text-primary transition-colors duration-200 lg:hidden"
              aria-label="Search"
            >
              <Icon name="search" size={22} />
            </button>

            {/* Desktop Search */}
            <div className="hidden lg:block">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Icon name="search" size={18} />}
                  className="w-64"
                />
              </form>
            </div>

            {/* Wishlist */}
            <button
              onClick={onWishlistClick}
              className="relative p-2 text-gray-600 hover:text-primary transition-colors duration-200"
              aria-label="Wishlist"
            >
              <Icon name="heart" size={22} />
              {wishlistItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {wishlistItemCount}
                </span>
              )}
            </button>

            {/* Account */}
            <button
              onClick={onAccountClick}
              className="p-2 text-gray-600 hover:text-primary transition-colors duration-200"
              aria-label="Account"
            >
              <Icon name="user" size={22} />
            </button>

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative p-2 text-gray-600 hover:text-primary transition-colors duration-200"
              aria-label="Cart"
            >
              <Icon name="cart" size={22} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-primary transition-colors duration-200 lg:hidden"
              aria-label="Menu"
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {searchOpen && (
          <div className="pb-4 lg:hidden">
            <form onSubmit={handleSearch}>
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Icon name="search" size={18} />}
              />
            </form>
          </div>
        )}

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-3">
              {navigationItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-base font-medium text-gray-700 hover:text-primary transition-colors duration-200 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </Container>
    </header>
  );
};

export default Header;

