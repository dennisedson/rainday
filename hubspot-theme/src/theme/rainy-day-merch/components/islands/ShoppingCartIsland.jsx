import { useState, useEffect } from 'react';

export default function ShoppingCartIsland() {
  // Cart state - in production this would come from localStorage or API
  const [cartItems, setCartItems] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart:', e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    } else {
      localStorage.removeItem('cart');
    }
  }, [cartItems]);

  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  // Calculate shipping (flat rate for now)
  const shipping = cartItems.length > 0 ? 12.00 : 0;

  // Calculate discount from promo code
  const discount = appliedPromo ? (subtotal * appliedPromo.percentage / 100) : 0;

  // Calculate tax (8%)
  const tax = (subtotal - discount + shipping) * 0.08;

  // Calculate total
  const total = subtotal - discount + shipping + tax;

  // Update quantity for an item
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove item from cart
  const removeItem = (itemId) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
  };

  // Apply promo code
  const applyPromoCode = () => {
    // Mock promo codes - in production this would be an API call
    const promoCodes = {
      'SAVE10': { percentage: 10, code: 'SAVE10' },
      'SAVE20': { percentage: 20, code: 'SAVE20' },
    };

    if (promoCodes[promoCode.toUpperCase()]) {
      setAppliedPromo(promoCodes[promoCode.toUpperCase()]);
    } else {
      alert('Invalid promo code');
    }
  };

  // Proceed to shipping
  const proceedToShipping = () => {
    // Store cart summary in localStorage for next step
    localStorage.setItem('checkoutData', JSON.stringify({
      cartItems,
      subtotal,
      shipping,
      discount,
      tax,
      total,
      promoCode: appliedPromo?.code
    }));
    window.location.href = '/checkout-shipping';
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-8">Add some items to get started!</p>
        <a
          href="/shop"
          className="inline-block bg-primary hover:bg-primary-600 text-white font-semibold px-8 py-3 rounded-lg transition"
        >
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="bg-beige-100 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-8">
          <a href="/" className="hover:text-primary">Home</a>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Checkout</span>
        </nav>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            {/* Step 1 - Shopping Cart (active) */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-semibold mb-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Shopping Cart</span>
            </div>

            {/* Divider */}
            <div className="w-16 h-0.5 bg-gray-300"></div>

            {/* Step 2 - Shipping */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold mb-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-500">Shipping</span>
            </div>

            {/* Divider */}
            <div className="w-16 h-0.5 bg-gray-300"></div>

            {/* Step 3 - Payment */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold mb-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-500">Payment</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-card p-6">
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
                Shopping Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
              </h2>

              <div className="space-y-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-6 border-b border-gray-200 last:border-0">
                    {/* Product Image */}
                    <div className="w-24 h-24 flex-shrink-0 bg-beige-200 rounded-lg overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          {item.category && (
                            <p className="text-sm text-gray-500">{item.category}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-500 transition"
                          aria-label="Remove item"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-3 py-1 hover:bg-gray-100 transition"
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <span className="px-4 py-1 font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-3 py-1 hover:bg-gray-100 transition"
                          >
                            +
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                          {item.quantity > 1 && (
                            <div className="text-sm text-gray-500">
                              ${item.price.toFixed(2)} each
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-card p-6 sticky top-4">
              <h3 className="text-xl font-display font-bold text-gray-900 mb-6">Order Summary</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promo Code
                </label>
                <div className="flex flex-col xl:flex-row gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={appliedPromo !== null}
                  />
                  <button
                    onClick={applyPromoCode}
                    disabled={!promoCode || appliedPromo !== null}
                    className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Try code: SAVE10</p>
              </div>

              {/* Proceed Button */}
              <button
                onClick={proceedToShipping}
                className="w-full bg-primary hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition mb-4"
              >
                Proceed to Shipping
              </button>

              {/* Trust Badges */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Secure SSL Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Free Returns within 30 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Authenticity Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

