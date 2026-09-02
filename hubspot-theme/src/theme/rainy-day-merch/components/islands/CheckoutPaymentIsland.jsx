import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../utils/config';

export default function CheckoutPaymentIsland({ squareApplicationId, squareLocationId }) {
  const [checkoutData, setCheckoutData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [squareReady, setSquareReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const paymentsRef = useRef(null);
  const cardElementRef = useRef(null);

  // Fix hydration issues by waiting for mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load checkout data from previous steps
  useEffect(() => {
    if (!isMounted) return;

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
  }, [isMounted]);

  // Initialize Square Web Payments SDK
  useEffect(() => {
    if (!isMounted || !squareApplicationId || !squareLocationId || !checkoutData) return;

    const loadSquareScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Square) {
          resolve(window.Square);
          return;
        }
        
        const isSandbox = squareApplicationId.startsWith('sandbox-');
        const script = document.createElement('script');
        script.src = isSandbox 
          ? 'https://sandbox.web.squarecdn.com/v1/square.js' 
          : 'https://web.squarecdn.com/v1/square.js';
        script.onload = () => resolve(window.Square);
        script.onerror = () => reject(new Error('Failed to load Square SDK'));
        document.head.appendChild(script);
      });
    };

    const initializeSquare = async () => {
      console.log('[Square] Loading SDK for Application ID:', squareApplicationId);
      
      try {
        const Square = await loadSquareScript();
        
        const payments = Square.payments(squareApplicationId, squareLocationId);
        paymentsRef.current = payments;

        const card = await payments.card();
        await card.attach('#card-container');
        cardElementRef.current = card;
        
        setSquareReady(true);
        console.log('[Square] Success: Payment form attached');
      } catch (e) {
        console.error('Failed to initialize Square:', e);
        setErrors({ general: `Square Error: ${e.message}. Please check your Application ID and Location ID in HubSpot.` });
      }
    };

    initializeSquare();

    return () => {
      if (cardElementRef.current) {
        cardElementRef.current.destroy();
      }
    };
  }, [isMounted, squareApplicationId, squareLocationId, checkoutData]);

  // Process payment
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!squareReady || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      // 1. Get token from Square
      const result = await cardElementRef.current.tokenize();
      if (result.status === 'OK') {
        const token = result.token;
        console.log('[Checkout] Payment token received');

        // 2. Call our API to process payment
        const paymentResponse = await fetch(`${API_BASE_URL}/process-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceId: token,
            amount: checkoutData.total,
            currency: 'USD',
            orderId: `ORD-${Date.now()}`,
            buyerEmail: checkoutData.shippingInfo.email,
            cartItems: checkoutData.cartItems,
            squareApplicationId,
            squareLocationId,
            billingDetails: {
              firstName: checkoutData.shippingInfo.firstName,
              lastName: checkoutData.shippingInfo.lastName,
              phone: checkoutData.shippingInfo.phone,
              address1: checkoutData.shippingInfo.address,
              city: checkoutData.shippingInfo.city,
              state: checkoutData.shippingInfo.state,
              zipCode: checkoutData.shippingInfo.zipCode,
              country: 'US',
            }
          }),
        });

        const paymentResult = await paymentResponse.json();

        if (!paymentResponse.ok) {
          // Server re-prices the order from the Square catalog; a 409 means
          // the total we displayed no longer matches current catalog prices.
          if (paymentResponse.status === 409 && paymentResult.expectedTotal != null) {
            throw new Error(
              `The order total has changed to $${paymentResult.expectedTotal.toFixed(2)}. ` +
              'Prices may have been updated. Please return to your cart to review before paying.'
            );
          }
          throw new Error(paymentResult.message || paymentResult.error || 'Payment processing failed');
        }

        console.log('[Checkout] Payment successful:', paymentResult);

        // 3. Save order data and redirect
        const orderData = {
          ...checkoutData,
          paymentId: paymentResult.paymentId,
          orderId: paymentResult.orderId || `ORD-${Date.now()}`,
          orderDate: new Date().toISOString(),
          receiptUrl: paymentResult.receiptUrl,
          cardDetails: paymentResult.cardDetails,
        };

        localStorage.setItem('orderData', JSON.stringify(orderData));
        localStorage.removeItem('checkoutData');
        localStorage.removeItem('cart');

        window.location.href = '/order-confirmation';
      } else {
        let errorMessage = 'Tokenization failed';
        if (result.errors) {
          errorMessage = result.errors[0].message;
        }
        setErrors({ general: errorMessage });
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('[Checkout] Error:', err);
      setErrors({ general: err.message || 'An unexpected error occurred' });
      setIsProcessing(false);
    }
  };

  if (!isMounted || !checkoutData) {
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
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Secure Payment</h2>

              {errors.general && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Credit or Debit Card
                  </label>
                  <div 
                    id="card-container" 
                    className="p-4 border border-gray-300 rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent min-h-[80px]"
                  ></div>
                  <p className="mt-2 text-xs text-gray-500">
                    Your payment is processed securely by Square. We do not store your card details.
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
                    disabled={!squareReady || isProcessing}
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
                      `Pay $${checkoutData.total?.toFixed(2)}`
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
                    <span>Tax</span>
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
