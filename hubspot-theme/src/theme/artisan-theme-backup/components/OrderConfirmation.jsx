import React, { useEffect, useState } from 'react';
import Container from './Container';
import Button from './Button';
import Icon from './Icon';

/**
 * OrderConfirmation component
 * Displays order confirmation with details and thank you message
 */
const OrderConfirmation = ({
  orderData,
  className = '',
}) => {
  const [order, setOrder] = useState(orderData || null);

  useEffect(() => {
    if (!orderData) {
      // Try to get order data from URL params or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('orderId');
      
      if (orderId) {
        // In a real app, you'd fetch order details from your backend
        // For now, we'll use dummy data
        setOrder({
          orderId: orderId,
          orderNumber: `#${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          date: new Date().toLocaleDateString(),
          total: 0,
          items: [],
        });
      }
    }
  }, [orderData]);

  if (!order) {
    return (
      <Container className={`py-16 ${className}`}>
        <div className="text-center">
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className={`py-12 ${className}`}>
      <div className="max-w-3xl mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Thank you for your order!
          </h1>
          
          <p className="text-lg text-gray-600">
            Your order has been confirmed and will be shipped soon.
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Order Number</p>
              <p className="text-lg font-semibold text-gray-900">
                {order.orderNumber}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Order Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {order.date}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Amount</p>
              <p className="text-lg font-semibold text-primary">
                ${order.total?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Receipt/Invoice */}
          {order.receiptUrl && (
            <div className="border-t border-gray-200 pt-4">
              <a
                href={order.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:text-primary-600 font-medium"
              >
                <Icon name="chevronRight" size={16} />
                View Receipt
              </a>
            </div>
          )}
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-4">
              Order Items
            </h2>
            
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={item.image || 'https://via.placeholder.com/64'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  
                  <p className="font-semibold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-beige-100 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What's Next?
          </h3>
          
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Order Confirmation Email</p>
                <p className="text-sm text-gray-600">
                  You'll receive an email confirmation shortly with your order details.
                </p>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Processing</p>
                <p className="text-sm text-gray-600">
                  We're preparing your order for shipment. This usually takes 1-2 business days.
                </p>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Shipping</p>
                <p className="text-sm text-gray-600">
                  You'll receive a shipping confirmation with tracking information once your order ships.
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => window.location.href = '/products'}
            className="flex-1"
          >
            Continue Shopping
          </Button>
          
          <Button
            variant="ghost"
            size="lg"
            onClick={() => window.location.href = '/account/orders'}
            className="flex-1"
          >
            View Order History
          </Button>
        </div>

        {/* Support */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need help with your order?{' '}
            <a href="/contact" className="text-primary hover:text-primary-600 font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default OrderConfirmation;

