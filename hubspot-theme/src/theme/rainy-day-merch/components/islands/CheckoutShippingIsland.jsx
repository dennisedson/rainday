import { useState, useEffect } from 'react';
import { post } from '../../utils/api';

export default function CheckoutShippingIsland({ squareApplicationId, squareLocationId }) {
  const [checkoutData, setCheckoutData] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});

  // Load checkout data from previous step
  useEffect(() => {
    const saved = localStorage.getItem('checkoutData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCheckoutData(data);
        if (data.shippingInfo) {
          setFormData(data.shippingInfo);
        }
      } catch (e) {
        console.error('Failed to parse checkout data:', e);
        window.location.href = '/cart';
      }
    } else {
      // No cart data, redirect to cart
      window.location.href = '/cart';
    }
  }, []);

  // Update totals whenever zip code or state changes
  useEffect(() => {
    if (!checkoutData || !formData.zipCode || formData.zipCode.length < 5) return;

    const updateTotals = async () => {
      setIsCalculating(true);
      try {
        const payload = {
          cartItems: checkoutData.cartItems,
          squareApplicationId,
          squareLocationId,
          shippingAddress: {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode
          }
        };
        
        const result = await post('/calculate-order', payload);

        console.log('[Shipping] Order Calculation Result:', result);
        if (result.warning) {
          console.warn(`[Shipping] ${result.warning}`);
        }
        
        if (result.taxes && result.taxes.length > 0) {
          result.taxes.forEach(t => {
            console.log(`[Shipping] Tax Applied: ${t.name} (${t.percentage}%) - $${(t.applied_money.amount / 100).toFixed(2)}`);
          });
        }

        setCheckoutData(prev => ({
          ...prev,
          subtotal: result.subtotal,
          shipping: result.shipping,
          tax: result.tax,
          discount: result.discount,
          total: result.total
        }));
      } catch (error) {
        console.error('[Shipping] Calculation failed:', error);
      } finally {
        setIsCalculating(false);
      }
    };

    const timer = setTimeout(updateTotals, 1000); // Debounce
    return () => clearTimeout(timer);
  }, [formData.zipCode, formData.state, squareApplicationId, squareLocationId]); // Removed checkoutData dependency to prevent update loops

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.zipCode) newErrors.zipCode = 'ZIP code is required';
    if (!formData.phone) newErrors.phone = 'Phone is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Proceed to payment
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Save shipping info and proceed to payment
    const updatedData = {
      ...checkoutData,
      shippingInfo: formData,
    };
    localStorage.setItem('checkoutData', JSON.stringify(updatedData));
    window.location.href = '/checkout-payment';
  };

  if (!checkoutData) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading...</p>
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
          <a href="/cart" className="hover:text-primary">Checkout</a>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Shipping</span>
        </nav>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            {/* Step 1 - Shopping Cart (completed) */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold mb-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Shopping Cart</span>
            </div>

            {/* Divider */}
            <div className="w-16 h-0.5 bg-primary"></div>

            {/* Step 2 - Shipping (active) */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-semibold mb-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Shipping</span>
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
          {/* Shipping Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-card p-6">
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Shipping Information</h2>

              <form onSubmit={handleSubmit}>
                {/* Contact Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                      placeholder="your@email.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                      />
                      {errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                      />
                      {errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apartment, suite, etc. (optional)
                    </label>
                    <input
                      type="text"
                      name="apartment"
                      value={formData.apartment}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                      />
                      {errors.city && (
                        <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border ${errors.state ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                      />
                      {errors.state && (
                        <p className="text-red-500 text-sm mt-1">{errors.state}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border ${errors.zipCode ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                      />
                      {errors.zipCode && (
                        <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                      placeholder="(555) 123-4567"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <a
                    href="/cart"
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition text-center"
                  >
                    Back to Cart
                  </a>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-primary hover:bg-primary-600 text-white font-semibold rounded-lg transition"
                  >
                    Continue to Payment
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-card p-6 sticky top-4">
              <h3 className="text-xl font-display font-bold text-gray-900 mb-6">Order Summary</h3>

              {/* Cart Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {checkoutData.cartItems?.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 flex-shrink-0 bg-beige-200 rounded-lg overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="border-t border-gray-200 pt-4">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className={isCalculating ? 'animate-pulse opacity-50' : ''}>
                      ${checkoutData.subtotal?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className={isCalculating ? 'animate-pulse opacity-50' : ''}>
                      ${checkoutData.shipping?.toFixed(2)}
                    </span>
                  </div>
                  {checkoutData.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({checkoutData.promoCode})</span>
                      <span>-${checkoutData.discount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span className={isCalculating ? 'animate-pulse opacity-50' : ''}>
                      ${checkoutData.tax?.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span className={isCalculating ? 'animate-pulse opacity-50' : ''}>
                      ${checkoutData.total?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

