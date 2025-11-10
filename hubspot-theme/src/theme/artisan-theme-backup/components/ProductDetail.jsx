import React, { useState } from 'react';
import Button from './Button';
import Icon from './Icon';
import Badge from './Badge';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';

/**
 * ProductDetail component
 * Full product view with image carousel, description, variants, and add-to-cart
 */
const ProductDetail = ({
  product,
  onClose,
  className = '',
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  if (!product) {
    return null;
  }

  const images = product.images || [];
  const variants = product.variations || [];
  const hasVariants = variants.length > 1;

  // Use selected variant price if available, otherwise use base price
  const displayPrice = selectedVariant?.price || product.price;
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = async () => {
    setAddingToCart(true);
    
    try {
      await addItem(product, quantity, selectedVariant);
      // Optionally show success notification
      setTimeout(() => {
        setAddingToCart(false);
      }, 500);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setAddingToCart(false);
    }
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product);
  };

  const incrementQuantity = () => {
    setQuantity(Math.min(quantity + 1, 99));
  };

  const decrementQuantity = () => {
    setQuantity(Math.max(quantity - 1, 1));
  };

  return (
    <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column - Images */}
        <div className="relative bg-gray-50 p-8">
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200"
              aria-label="Close"
            >
              <Icon name="close" size={20} />
            </button>
          )}

          {/* Main Image */}
          <div className="aspect-square rounded-xl overflow-hidden bg-white mb-4">
            <img
              src={images[selectedImageIndex] || images[0] || 'https://via.placeholder.com/600'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Image Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    index === selectedImageIndex
                      ? 'border-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product Info */}
        <div className="p-8 lg:p-12 flex flex-col">
          {/* Badges */}
          <div className="flex gap-2 mb-4">
            {product.onSale && <Badge variant="sale">Sale</Badge>}
            {product.featured && <Badge variant="featured">Featured</Badge>}
            {!product.available && <Badge variant="danger">Out of Stock</Badge>}
          </div>

          {/* Category */}
          {product.category && (
            <p className="text-sm uppercase tracking-wide text-gray-500 mb-2">
              {product.category}
            </p>
          )}

          {/* Title */}
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-gray-900 mb-4">
            {product.name}
          </h1>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Icon
                    key={i}
                    name={i < Math.floor(product.rating) ? 'starFilled' : 'star'}
                    size={20}
                    className={
                      i < Math.floor(product.rating)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating} ({product.reviewCount} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-4xl font-bold text-gray-900">
              ${displayPrice.toFixed(2)}
            </span>
            {product.originalPrice && product.originalPrice > displayPrice && (
              <>
                <span className="text-2xl text-gray-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
                <span className="text-lg font-semibold text-primary">
                  Save $
                  {(product.originalPrice - displayPrice).toFixed(2)}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Description
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Variants */}
          {hasVariants && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Select Variant
              </h3>
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      selectedVariant?.id === variant.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Quantity
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={decrementQuantity}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors duration-200"
                aria-label="Decrease quantity"
              >
                <Icon name="minus" size={16} />
              </button>
              <span className="text-xl font-semibold text-gray-900 w-12 text-center">
                {quantity}
              </span>
              <button
                onClick={incrementQuantity}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors duration-200"
                aria-label="Increase quantity"
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <Button
              variant="primary"
              size="lg"
              onClick={handleAddToCart}
              loading={addingToCart}
              disabled={!product.available || addingToCart}
              className="flex-1"
            >
              {product.available ? 'Add to Cart' : 'Out of Stock'}
            </Button>
            
            <button
              onClick={handleWishlistToggle}
              className="p-4 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200"
              aria-label="Add to wishlist"
            >
              <Icon
                name={inWishlist ? 'heartFilled' : 'heart'}
                size={24}
                className={inWishlist ? 'text-red-500' : 'text-gray-600'}
              />
            </button>
          </div>

          {/* Additional Info */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Free shipping on orders over $100</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>30-day return policy</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secure checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

