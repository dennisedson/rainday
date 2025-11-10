import React from 'react';
import Container from './Container';
import Button from './Button';
import Icon from './Icon';
import { useCart } from '../hooks/useCart';

/**
 * ShoppingCart component
 * Displays cart items with quantity controls, totals, and checkout button
 */
const ShoppingCart = ({
  onContinueShopping,
  onCheckout,
  className = '',
}) => {
  const {
    cart,
    updateQuantity,
    removeItem,
    getSubtotal,
    getTax,
    getShipping,
    getTotal,
    getItemCount,
  } = useCart();

  const handleQuantityChange = (item, newQuantity) => {
    if (newQuantity > 0) {
      updateQuantity(item.id, newQuantity, item.variant);
    }
  };

  const handleRemove = (item) => {
    removeItem(item.id, item.variant);
  };

  const subtotal = getSubtotal();
  const tax = getTax();
  const shipping = getShipping();
  const total = getTotal();
  const itemCount = getItemCount();

  const isEmpty = cart.length === 0;

  if (isEmpty) {
    return (
      <Container className={`py-16 ${className}`}>
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <Icon name="cart" size={48} className="text-gray-400" />
          </div>
          
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
            Your cart is empty
          </h2>
          
          <p className="text-gray-600 mb-8">
            Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
          </p>
          
          <Button
            variant="primary"
            size="lg"
            onClick={onContinueShopping}
          >
            Continue Shopping
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className={`py-12 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Shopping Cart
          </h1>
          <p className="text-gray-600">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={`${item.id}-${JSON.stringify(item.variant)}`}
                className="bg-white rounded-xl shadow-sm p-6 flex gap-6"
              >
                {/* Product Image */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={item.image || item.images?.[0] || 'https://via.placeholder.com/100'}
                      alt={item.name || item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.name || item.title}
                      </h3>
                      {item.category && (
                        <p className="text-sm text-gray-500 uppercase tracking-wide">
                          {item.category}
                        </p>
                      )}
                      {item.variant && (
                        <p className="text-sm text-gray-600 mt-1">
                          Variant: {item.variant.name}
                        </p>
                      )}
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemove(item)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                      aria-label="Remove item"
                    >
                      <Icon name="trash" size={20} />
                    </button>
                  </div>

                  <div className="flex justify-between items-end">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuantityChange(item, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors duration-200"
                        aria-label="Decrease quantity"
                      >
                        <Icon name="minus" size={14} />
                      </button>
                      
                      <span className="text-lg font-semibold text-gray-900 w-8 text-center">
                        {item.quantity}
                      </span>
                      
                      <button
                        onClick={() => handleQuantityChange(item, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors duration-200"
                        aria-label="Increase quantity"
                      >
                        <Icon name="plus" size={14} />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        ${((item.price || 0) * item.quantity).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${(item.price || 0).toFixed(2)} each
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
                Order Summary
              </h2>

              {/* Summary Lines */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>Tax (8%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="font-medium">
                    {shipping === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>

                {subtotal > 0 && subtotal < 100 && (
                  <div className="text-sm text-primary bg-primary/5 p-3 rounded-lg">
                    Add ${(100 - subtotal).toFixed(2)} more for free shipping!
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-semibold text-gray-900">
                    Total
                  </span>
                  <span className="text-3xl font-bold text-gray-900">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={onCheckout}
                className="w-full mb-4"
              >
                Proceed to Checkout
              </Button>

              {/* Continue Shopping */}
              <Button
                variant="ghost"
                size="md"
                onClick={onContinueShopping}
                className="w-full"
              >
                Continue Shopping
              </Button>

              {/* Security Badge */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Icon name="cart" size={16} />
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ShoppingCart;

