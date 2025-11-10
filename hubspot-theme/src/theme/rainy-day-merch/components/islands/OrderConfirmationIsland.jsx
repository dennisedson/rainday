import { useState, useEffect } from 'react';

export default function OrderConfirmationIsland() {
  const [orderData, setOrderData] = useState(null);

  // Load order data
  useEffect(() => {
    const saved = localStorage.getItem('orderData');
    if (saved) {
      try {
        setOrderData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse order data:', e);
        window.location.href = '/';
      }
    } else {
      // No order data, redirect home
      window.location.href = '/';
    }
  }, []);

  if (!orderData) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-beige-100 min-h-screen py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Order Confirmed!</h1>
          <p className="text-xl text-gray-600 mb-2">Thank you for your purchase</p>
          <p className="text-gray-600">
            Your order number is <span className="font-semibold text-gray-900">{orderData.orderId}</span>
          </p>
          <p className="text-sm text-gray-500 mt-4">
            A confirmation email has been sent to {orderData.shippingInfo.email}
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-xl shadow-card p-8 mb-6">
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">Order Details</h2>

          {/* Order Items */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Items Ordered</h3>
            <div className="space-y-4">
              {orderData.cartItems?.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                  <div className="w-20 h-20 flex-shrink-0 bg-beige-200 rounded-lg overflow-hidden">
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
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    {item.category && (
                      <p className="text-sm text-gray-500">{item.category}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-sm text-gray-500">
                        ${item.price.toFixed(2)} each
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${orderData.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>${orderData.shipping?.toFixed(2)}</span>
              </div>
              {orderData.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({orderData.promoCode})</span>
                  <span>-${orderData.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax (8%)</span>
                <span>${orderData.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-4 border-t border-gray-200">
                <span>Total</span>
                <span>${orderData.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Shipping Address</h3>
              <div className="text-gray-600">
                <p className="font-medium text-gray-900">
                  {orderData.shippingInfo.firstName} {orderData.shippingInfo.lastName}
                </p>
                <p>{orderData.shippingInfo.address}</p>
                {orderData.shippingInfo.apartment && (
                  <p>{orderData.shippingInfo.apartment}</p>
                )}
                <p>
                  {orderData.shippingInfo.city}, {orderData.shippingInfo.state} {orderData.shippingInfo.zipCode}
                </p>
                <p className="mt-2">{orderData.shippingInfo.phone}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method</h3>
              <div className="text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">
                      Card ending in {orderData.paymentInfo.last4}
                    </p>
                    <p className="text-sm">{orderData.paymentInfo.cardName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-xl shadow-card p-8 mb-6">
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">What's Next?</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Order Processing</h3>
                <p className="text-gray-600">We're preparing your items for shipment. This usually takes 1-2 business days.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Shipping Confirmation</h3>
                <p className="text-gray-600">You'll receive a tracking number via email once your order ships.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Delivery</h3>
                <p className="text-gray-600">Your order will arrive within 5-7 business days.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/"
            className="px-8 py-3 bg-primary hover:bg-primary-600 text-white font-semibold rounded-lg transition text-center"
          >
            Continue Shopping
          </a>
          <button
            onClick={() => window.print()}
            className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition text-center"
          >
            Print Receipt
          </button>
        </div>

        {/* Customer Support */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-2">Need help with your order?</p>
          <a href="/contact" className="text-primary hover:text-primary-600 font-medium">
            Contact Customer Support
          </a>
        </div>
      </div>
    </div>
  );
}

