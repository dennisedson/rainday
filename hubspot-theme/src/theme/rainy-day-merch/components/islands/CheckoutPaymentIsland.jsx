import { useState, useEffect } from 'react';

export default function CheckoutPaymentIsland() {
  const [checkoutData, setCheckoutData] = useState(null);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false,
  });
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Load checkout data from previous steps
  useEffect(() => {
    const saved = localStorage.getItem('checkoutData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (!data.shippingInfo) {
          // Missing shipping info, redirect back
          window.location.href = '/checkout-shipping';
        } else {
          setCheckoutData(data);
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

  // Format card number (add spaces every 4 digits)
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry date (MM/YY)
  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let formattedValue = value;
    if (name === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    } else if (name === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
    } else if (name === 'cvv') {
      formattedValue = value.replace(/[^0-9]/gi, '').substring(0, 4);
    }

    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : formattedValue 
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.cardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (formData.cardNumber.replace(/\s/g, '').length < 13) {
      newErrors.cardNumber = 'Card number is invalid';
    }

    if (!formData.cardName) {
      newErrors.cardName = 'Cardholder name is required';
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      newErrors.expiryDate = 'Expiry date must be MM/YY';
    }

    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (formData.cvv.length < 3) {
      newErrors.cvv = 'CVV must be 3 or 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Process payment
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      // In production, this would call your payment API
      const orderData = {
        ...checkoutData,
        paymentInfo: {
          last4: formData.cardNumber.slice(-4),
          cardName: formData.cardName,
        },
        orderId: `ORD-${Date.now()}`,
        orderDate: new Date().toISOString(),
      };

      // Save order data
      localStorage.setItem('orderData', JSON.stringify(orderData));
      
      // Clear checkout data
      localStorage.removeItem('checkoutData');
      localStorage.removeItem('cart');

      // Redirect to confirmation
      window.location.href = '/order-confirmation';
    }, 2000);
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
          <span className="text-gray-900">Payment</span>
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
            <div className="w-16 h-0.5 bg-green-500"></div>

            {/* Step 2 - Shipping (completed) */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold mb-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Shipping</span>
            </div>

            {/* Divider */}
            <div className="w-16 h-0.5 bg-primary"></div>

            {/* Step 3 - Payment (active) */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-semibold mb-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Payment</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-card p-6 mb-6">
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Payment Information</h2>

              <form onSubmit={handleSubmit}>
                {/* Card Number */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Number *
                  </label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleChange}
                    maxLength="19"
                    className={`w-full px-4 py-3 border ${errors.cardNumber ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                    placeholder="1234 5678 9012 3456"
                  />
                  {errors.cardNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>
                  )}
                </div>

                {/* Cardholder Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder Name *
                  </label>
                  <input
                    type="text"
                    name="cardName"
                    value={formData.cardName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border ${errors.cardName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                    placeholder="John Doe"
                  />
                  {errors.cardName && (
                    <p className="text-red-500 text-sm mt-1">{errors.cardName}</p>
                  )}
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date *
                    </label>
                    <input
                      type="text"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      maxLength="5"
                      className={`w-full px-4 py-3 border ${errors.expiryDate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                      placeholder="MM/YY"
                    />
                    {errors.expiryDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.expiryDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV *
                    </label>
                    <input
                      type="text"
                      name="cvv"
                      value={formData.cvv}
                      onChange={handleChange}
                      maxLength="4"
                      className={`w-full px-4 py-3 border ${errors.cvv ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                      placeholder="123"
                    />
                    {errors.cvv && (
                      <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>
                    )}
                  </div>
                </div>

                {/* Save Card Option */}
                <div className="mb-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="saveCard"
                      checked={formData.saveCard}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Save card for future purchases
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <a
                    href="/checkout-shipping"
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition text-center"
                  >
                    Back to Shipping
                  </a>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 bg-primary hover:bg-primary-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Complete Purchase'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Shipping Address Summary */}
            <div className="bg-white rounded-xl shadow-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
              <div className="text-gray-600">
                <p className="font-medium text-gray-900">
                  {checkoutData.shippingInfo.firstName} {checkoutData.shippingInfo.lastName}
                </p>
                <p>{checkoutData.shippingInfo.address}</p>
                {checkoutData.shippingInfo.apartment && (
                  <p>{checkoutData.shippingInfo.apartment}</p>
                )}
                <p>
                  {checkoutData.shippingInfo.city}, {checkoutData.shippingInfo.state} {checkoutData.shippingInfo.zipCode}
                </p>
                <p className="mt-2">{checkoutData.shippingInfo.phone}</p>
                <p>{checkoutData.shippingInfo.email}</p>
              </div>
              <a
                href="/checkout-shipping"
                className="text-primary hover:text-primary-600 text-sm font-medium mt-4 inline-block"
              >
                Edit
              </a>
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
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${checkoutData.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>${checkoutData.shipping?.toFixed(2)}</span>
                  </div>
                  {checkoutData.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({checkoutData.promoCode})</span>
                      <span>-${checkoutData.discount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (8%)</span>
                    <span>${checkoutData.tax?.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span>${checkoutData.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Your payment information is secure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

