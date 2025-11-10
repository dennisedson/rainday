import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'https://hsecommerce-api.vercel.app/api';

export default function CheckoutPaymentIsland() {
  const [checkoutData, setCheckoutData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [squareLoaded, setSquareLoaded] = useState(false);
  const [squareConfig, setSquareConfig] = useState(null);
  const cardRef = useRef(null);
  const paymentsRef = useRef(null);

  // Load checkout data from previous steps
  useEffect(() => {
    const saved = localStorage.getItem('checkoutData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (!data.shippingInfo) {
          window.location.href = '/checkout-shipping';
        } else {
          setCheckoutData(data);
        }
      } catch (e) {
        console.error('Failed to parse checkout data:', e);
        window.location.href = '/cart';
      }
    } else {
      window.location.href = '/cart';
    }
  }, []);

  // Load Square SDK
  useEffect(() => {
    if (!window.Square) {
      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.async = true;
      script.onload = () => setSquareLoaded(true);
      script.onerror = () => setError('Failed to load Square SDK');
      document.head.appendChild(script);
    } else {
      setSquareLoaded(true);
    }
  }, []);

  // Fetch Square config and initialize payment form
  useEffect(() => {
    if (!squareLoaded || !checkoutData) return;

    const initSquare = async () => {
      try {
        // Fetch Square config
        const configResponse = await fetch(`${API_BASE_URL}/square-config`);
        const config = await configResponse.json();
        setSquareConfig(config);

        // Initialize Square Payments
        const payments = window.Square.payments(config.applicationId, config.locationId);
        paymentsRef.current = payments;

        // Initialize Card
        const card = await payments.card();
        await card.attach('#card-container');
        cardRef.current = card;

      } catch (e) {
        console.error('Error initializing Square:', e);
        setError('Failed to initialize payment form');
      }
    };

    initSquare();
  }, [squareLoaded, checkoutData]);

  // Process payment
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cardRef.current || !checkoutData) {
      setError('Payment form not ready');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Tokenize card
      const result = await cardRef.current.tokenize();
      
      if (result.status === 'OK') {
        const { token } = result;

        // Process payment via API
        const paymentResponse = await fetch(`${API_BASE_URL}/process-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: token,
            amount: checkoutData.total,
            currency: 'USD',
            orderId: `ORD-${Date.now()}`,
            billingDetails: {
              address1: checkoutData.shippingInfo.address,
              address2: checkoutData.shippingInfo.apartment,
              city: checkoutData.shippingInfo.city,
              state: checkoutData.shippingInfo.state,
              zipCode: checkoutData.shippingInfo.zipCode,
              country: 'US',
            },
            shippingDetails: checkoutData.shippingInfo,
          }),
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
          throw new Error(paymentData.error || 'Payment failed');
        }

        // Create deal in HubSpot
        try {
          await fetch(`${API_BASE_URL}/create-deal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: checkoutData.shippingInfo.email,
              firstName: checkoutData.shippingInfo.firstName,
              lastName: checkoutData.shippingInfo.lastName,
              orderTotal: checkoutData.total,
              orderItems: checkoutData.cartItems,
              paymentId: paymentData.paymentId,
              orderId: paymentData.orderId || `ORD-${Date.now()}`,
            }),
          });
        } catch (dealError) {
          console.error('Failed to create deal:', dealError);
          // Don't fail checkout if deal creation fails
        }

        // Save order data for confirmation page
        const orderData = {
          ...checkoutData,
          paymentInfo: {
            paymentId: paymentData.paymentId,
            receiptNumber: paymentData.receiptNumber,
            receiptUrl: paymentData.receiptUrl,
            last4: '****', // Square doesn't return this
            cardName: 'Card on file',
          },
          orderId: paymentData.orderId || `ORD-${Date.now()}`,
          orderDate: new Date().toISOString(),
        };

        localStorage.setItem('orderData', JSON.stringify(orderData));
        localStorage.removeItem('checkoutData');
        localStorage.removeItem('cart');

        // Redirect to confirmation
        window.location.href = '/order-confirmation';

      } else {
        // Handle tokenization errors
        const errorMessages = result.errors?.map(error => error.message).join(', ') || 'Payment failed';
        throw new Error(errorMessages);
      }

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred processing your payment');
      setIsProcessing(false);
    }
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

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Square Card Container */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Information *
                  </label>
                  <div 
                    id="card-container" 
                    className="border border-gray-300 rounded-lg p-4 min-h-[60px]"
                  ></div>
                  <p className="text-xs text-gray-500 mt-2">
                    {squareConfig?.environment === 'sandbox' ? 'Test mode: Use card 4111 1111 1111 1111' : 'Secure payment processed by Square'}
                  </p>
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
                    disabled={isProcessing || !squareLoaded}
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
                  <span>Secured by Square</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
