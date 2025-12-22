import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import Badge from './Badge';
import { toggleFavorite, isFavorite } from '../../utils/favorites';

/**
 * ProductCard component (S) - Shared product display card
 * Displays product image, title, price, rating, and category with favorites functionality
 */
const ProductCard = ({
  id,
  image,
  title,
  category,
  price,
  originalPrice,
  rating = 0,
  reviewCount = 0,
  onSale = false,
  featured = false,
  onAddToCart,
  productUrl,
  className = '',
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Check favorite status on mount
  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const favorited = await isFavorite(id);
        setIsFavorited(favorited);
      } catch (error) {
        console.error('[ProductCard] Error checking favorite:', error);
      }
    };
    checkFavorite();

    // Listen for favorites updates
    const handleFavoritesUpdate = () => {
      checkFavorite();
    };
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
  }, [id]);

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isToggling) return;
    
    setIsToggling(true);
    const newState = !isFavorited;
    setIsFavorited(newState); // Optimistic update
    
    try {
      const result = await toggleFavorite(id);
      if (result.success) {
        setIsFavorited(result.isFavorite);
      } else {
        // Revert on error
        setIsFavorited(!newState);
      }
    } catch (error) {
      console.error('[ProductCard] Error toggling favorite:', error);
      // Revert on error
      setIsFavorited(!newState);
    } finally {
      setIsToggling(false);
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(id);
    }
  };

  // Calculate discount percentage
  const discountPercentage = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  // Generate product URL - use provided URL or construct from ID
  const href = productUrl || `/product?id=${encodeURIComponent(id)}`;

  return (
    <a href={href} className={`card group block ${className}`}>
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-100 rounded-xl">
        <img
          src={image}
          alt={title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-105 transition-transform duration-500`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {onSale && <Badge variant="sale">Sale</Badge>}
          {featured && <Badge variant="featured">Featured</Badge>}
        </div>
        
        {/* Favorites Button */}
        <button
          onClick={handleFavoriteClick}
          disabled={isToggling}
          className={`absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 ${
            isFavorited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Icon
            name={isFavorited ? 'heartFilled' : 'heart'}
            size={20}
            className={isFavorited ? 'text-red-500' : 'text-gray-600'}
          />
        </button>
        
        {/* Quick Add to Cart - visible on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleAddToCart}
            className="w-full bg-white text-gray-900 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200"
          >
            Add to Cart
          </button>
        </div>
      </div>
      
      {/* Product Info */}
      <div className="p-4">
        {/* Category */}
        {category && (
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            {category}
          </p>
        )}
        
        {/* Title */}
        <h3 className="text-base font-medium text-gray-900 mb-2 line-clamp-2 h-12">
          {title}
        </h3>
        
        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Icon
                  key={i}
                  name={i < Math.floor(rating) ? 'starFilled' : 'star'}
                  size={16}
                  className={i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
            {reviewCount > 0 && (
              <span className="text-xs text-gray-500">({reviewCount})</span>
            )}
          </div>
        )}
        
        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">${price}</span>
          {originalPrice && originalPrice > price && (
            <>
              <span className="text-sm text-gray-400 line-through">
                ${originalPrice}
              </span>
              {discountPercentage > 0 && (
                <span className="text-xs font-semibold text-primary">
                  -{discountPercentage}%
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </a>
  );
};

export default ProductCard;

