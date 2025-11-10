import { useState } from 'react';
import { Island } from '@hubspot/cms-components';

export default function ProductInteractiveIsland({ productName, price }) {
  // State for quantity and wishlist
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Handlers
  const handleQuantityDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityIncrease = () => {
    setQuantity(quantity + 1);
  };

  const handleAddToCart = () => {
    alert(`Added ${quantity} x ${productName} to cart!`);
    // TODO: Implement actual cart functionality
  };

  const handleBuyNow = () => {
    alert(`Proceeding to checkout with ${quantity} x ${productName}`);
    // TODO: Implement checkout redirect
  };

  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
  };

  const handleShare = () => {
    const productUrl = window.location.href;
    const subject = `Check out ${productName}`;
    const body = `I thought you might be interested in this product:\n\n${productName}\nPrice: $${price}\n\n${productUrl}`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <>
      {/* Quantity Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Quantity
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={handleQuantityDecrease}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            aria-label="Decrease quantity"
          >
            <span className="text-xl">−</span>
          </button>
          <input
            type="text"
            value={quantity}
            readOnly
            className="w-16 h-10 text-center border border-gray-300 rounded font-semibold"
            style={{ MozAppearance: 'textfield' }}
          />
          <button
            onClick={handleQuantityIncrease}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            aria-label="Increase quantity"
          >
            <span className="text-xl">+</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleAddToCart}
          className="flex-1 bg-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Add to Cart
        </button>
        <button
          onClick={toggleWishlist}
          className={`w-12 h-12 flex items-center justify-center border border-gray-300 rounded-lg transition-colors ${
            isWishlisted ? 'bg-red-50 border-red-300' : 'hover:bg-gray-50'
          }`}
          aria-label="Add to wishlist"
        >
          <svg
            className={`w-6 h-6 ${isWishlisted ? 'text-red-500 fill-current' : 'text-gray-600'}`}
            fill={isWishlisted ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
        <button
          onClick={handleShare}
          className="w-12 h-12 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          aria-label="Share via email"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      {/* Buy Now Button */}
      <button
        onClick={handleBuyNow}
        className="w-full bg-white border-2 border-gray-900 text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors mb-6"
      >
        Buy Now
      </button>
    </>
  );
}

Island.registerComponent(ProductInteractiveIsland);

