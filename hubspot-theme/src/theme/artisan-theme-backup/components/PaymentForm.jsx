import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import { useCart } from '../hooks/useCart';

/**
 * PaymentForm component
 * Integrates Square Web Payments SDK for secure payment processing
 * 
 * IMPORTANT: Square Application ID and Location ID are safe to use client-side
 * The Access Token must NEVER be exposed on the client side
 */
const PaymentForm = ({
  customerInfo,
  onPaymentSuccess,
  onPaymentError,
  className = '',
}) => {
  const [payments, setPayments] = useState(null);
  const [card, setCard] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const cardContainerRef = useRef(null);
  const { cart, getTotal, clearCart } = useCart();

  // Square credentials (these are safe for client-side use)
  const SQUARE_APPLICATION_ID = process.env.SQUARE_APPLICATION_ID || 'sandbox-sq0idb-YOUR_APP_ID';
  const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || 'YOUR_LOCATION_ID';

  // Load Square Web Payments SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'; // Use production URL for live
    script.async = true;
    script.onload = () => {
      setSdkLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load Square Payments SDK');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize Square Payments
  useEffect(() => {
    if (!sdkLoaded || !window.Square) {
      return;
    }

    const initializeSquare = async () => {
      try {
        const paymentsInstance = window.Square.payments(
          SQUARE_APPLICATION_ID,
          SQUARE_LOCATION_ID
        );
        setPayments(paymentsInstance);

        // Initialize card payment method
        const cardInstance = await paymentsInstance.card();
        await cardInstance.attach(cardContainerRef.current);
        setCard(cardInstance);
      } catch (err) {
        console.error('Error initializing Square Payments:', err);
        setError('Failed to initialize payment form. Please try again.');
      }
    };

    initializeSquare();

    // Cleanup
    return () => {
      if (card) {
        card.destroy();
      }
    };
  }, [sdkLoaded, SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID]);

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!card) {
      setError('Payment form not ready. Please refresh the page.');
      return;
    }

    if (!customerInfo) {
      setError('Customer information is missing. Please go back and fill out the form.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Step 1: Tokenize the card to get a payment nonce
      const result = await card.tokenize();

      if (result.status === 'OK') {
        const nonce = result.token;

        // Step 2: Send nonce to serverless function to process payment
        const total = getTotal();
        
        const paymentPayload = {
          nonce: nonce,
          amount: total,
          currency: 'USD',
          orderDetails: {
            items: cart.map((item) => ({
              id: item.id,
              name: item.name || item.title,
              quantity: item.quantity,
              price: item.price,
            })),
            subtotal: total,
          },
          customerInfo: customerInfo,
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        };

        const response = await fetch('/_hcms/api/process-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentPayload),
        });

        const paymentData = await response.json();

        if (paymentData.success) {
          // Step 3: Create deal in HubSpot CRM
          try {
            await fetch('/_hcms/api/create-deal', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderDetails: paymentPayload.orderDetails,
                customerInfo: customerInfo,
                paymentInfo: paymentData,
                totalAmount: total,
              }),
            });
          } catch (dealError) {
            console.error('Error creating deal:', dealError);
            // Don't fail the order if CRM logging fails
          }

          // Clear cart after successful payment
          clearCart();

          // Clear saved checkout form data
          localStorage.removeItem('checkout_form_data');

          // Call success callback
          if (onPaymentSuccess) {
            onPaymentSuccess(paymentData);
          }
        } else {
          throw new Error(paymentData.message || 'Payment failed');
        }
      } else {
        // Tokenization failed
        const errors = result.errors || [];
        const errorMessage = errors.map((e) => e.message).join(', ') || 'Card verification failed';
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment processing failed. Please try again.');
      
      if (onPaymentError) {
        onPaymentError(err);
      }
    } finally {
      setProcessing(false);
    }
  };

  const total = getTotal();

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
        Payment Information
      </h2>

      {/* Order Total */}
      <div className="mb-6 p-4 bg-beige-100 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Total Amount</span>
          <span className="text-3xl font-bold text-primary">
            ${total.toFixed(2)}
          </span>
        </div>
      </div>

      <form onSubmit={handlePayment} className="space-y-6">
        {/* Square Card Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div
            ref={cardContainerRef}
            id="card-container"
            className="min-h-[80px] p-4 border-2 border-gray-300 rounded-lg focus-within:border-primary transition-colors duration-200"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Security Notice */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Secure Payment
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Your payment information is encrypted and secure. We never store your card details.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={processing}
          disabled={processing || !sdkLoaded || !card}
          className="w-full"
        >
          {processing ? 'Processing Payment...' : `Pay $${total.toFixed(2)}`}
        </Button>

        {/* Test Card Notice (only in sandbox) */}
        {SQUARE_APPLICATION_ID.includes('sandbox') && (
          <div className="text-xs text-gray-500 text-center">
            <p>Test Mode: Use card number 4111 1111 1111 1111</p>
            <p>CVV: Any 3 digits | Expiry: Any future date</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default PaymentForm;

