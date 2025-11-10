import React, { useState } from 'react';
import Container from './Container';
import CheckoutForm from './CheckoutForm';
import PaymentForm from './PaymentForm';
import { useCart } from '../hooks/useCart';

/**
 * CheckoutPage component
 * Complete checkout flow combining information form and payment
 */
const CheckoutPage = ({
  onOrderComplete,
  className = '',
}) => {
  const [step, setStep] = useState(1); // 1 = info, 2 = payment
  const [customerInfo, setCustomerInfo] = useState(null);
  const { cart, getTotal } = useCart();

  const handleFormSubmit = (checkoutData) => {
    setCustomerInfo(checkoutData.customerInfo);
    setStep(2);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentSuccess = (paymentData) => {
    if (onOrderComplete) {
      onOrderComplete({
        customerInfo,
        paymentData,
        cart,
      });
    } else {
      // Default: redirect to confirmation page
      window.location.href = `/order-confirmation?orderId=${paymentData.orderId || paymentData.paymentId}`;
    }
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    // Optionally show toast notification
  };

  const handleBackToInfo = () => {
    setStep(1);
  };

  const total = getTotal();

  if (cart.length === 0) {
    return (
      <Container className={`py-16 ${className}`}>
        <div className="text-center max-w-md mx-auto">
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-8">
            Add some items to your cart before checking out.
          </p>
          <a
            href="/products"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors duration-200"
          >
            Continue Shopping
          </a>
        </div>
      </Container>
    );
  }

  return (
    <Container className={`py-12 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">
            Checkout
          </h1>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step === 1
                    ? 'bg-primary text-white'
                    : 'bg-green-500 text-white'
                }`}
              >
                {step > 1 ? '✓' : '1'}
              </div>
              <span
                className={`font-medium ${
                  step === 1 ? 'text-gray-900' : 'text-green-600'
                }`}
              >
                Information
              </span>
            </div>
            
            <div className="flex-1 h-0.5 bg-gray-300" />
            
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step === 2
                    ? 'bg-primary text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                2
              </div>
              <span
                className={`font-medium ${
                  step === 2 ? 'text-gray-900' : 'text-gray-600'
                }`}
              >
                Payment
              </span>
            </div>
          </div>
        </div>

        {/* Order Summary (always visible) */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-4">
            Order Summary
          </h2>
          
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={`${item.id}-${JSON.stringify(item.variant)}`}
                className="flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={item.image || item.images?.[0] || 'https://via.placeholder.com/50'}
                      alt={item.name || item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.name || item.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  ${((item.price || 0) * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-primary">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {step === 1 && (
          <CheckoutForm
            onSubmit={handleFormSubmit}
          />
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={handleBackToInfo}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Information
            </button>

            <PaymentForm
              customerInfo={customerInfo}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          </div>
        )}
      </div>
    </Container>
  );
};

export default CheckoutPage;

