/**
 * Process Payment Serverless Function
 * Processes payment using Square Payments API
 * 
 * CRITICAL SECURITY: Square Access Token MUST be stored in HubSpot Secrets
 * This function receives a payment nonce from the client and creates a payment
 */

exports.main = async (context = {}, sendResponse) => {
  // Get Square credentials from HubSpot Secrets
  const SQUARE_ACCESS_TOKEN = process.env['SQUARE_ACCESS_TOKEN'];
  const SQUARE_LOCATION_ID = process.env['SQUARE_LOCATION_ID'];
  const SQUARE_ENVIRONMENT = process.env['SQUARE_ENVIRONMENT'] || 'sandbox';

  // Set Square API base URL
  const SQUARE_API_BASE = SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

  // Validate required credentials
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    sendResponse({
      statusCode: 500,
      body: JSON.stringify({
        error: 'Square credentials not configured',
        message: 'Please add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID to HubSpot Secrets.',
      }),
    });
    return;
  }

  try {
    // Parse request body
    const body = JSON.parse(context.body || '{}');
    const {
      nonce,
      amount,
      currency = 'USD',
      orderDetails,
      customerInfo,
      idempotencyKey, // Prevent duplicate charges
    } = body;

    // Validate required fields
    if (!nonce) {
      sendResponse({
        statusCode: 400,
        body: JSON.stringify({
          error: 'Payment nonce is required',
        }),
      });
      return;
    }

    if (!amount || amount <= 0) {
      sendResponse({
        statusCode: 400,
        body: JSON.stringify({
          error: 'Valid amount is required',
        }),
      });
      return;
    }

    // Generate idempotency key if not provided (to prevent duplicate charges)
    const finalIdempotencyKey = idempotencyKey || `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Convert amount to cents (Square expects amount in smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    // Build payment request payload
    const paymentPayload = {
      source_id: nonce,
      idempotency_key: finalIdempotencyKey,
      amount_money: {
        amount: amountInCents,
        currency: currency,
      },
      location_id: SQUARE_LOCATION_ID,
      // Optional: Add customer information
      ...(customerInfo && {
        buyer_email_address: customerInfo.email,
        billing_address: customerInfo.billingAddress && {
          address_line_1: customerInfo.billingAddress.line1,
          address_line_2: customerInfo.billingAddress.line2,
          locality: customerInfo.billingAddress.city,
          administrative_district_level_1: customerInfo.billingAddress.state,
          postal_code: customerInfo.billingAddress.postalCode,
          country: customerInfo.billingAddress.country || 'US',
        },
      }),
      // Optional: Add note with order details
      note: orderDetails ? `Order: ${JSON.stringify(orderDetails)}` : undefined,
    };

    // Create payment via Square Payments API
    const paymentResponse = await fetch(`${SQUARE_API_BASE}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await response.json();

    if (!paymentResponse.ok) {
      // Payment failed
      const errors = paymentData.errors || [];
      const errorMessage = errors.map((e) => e.detail || e.code).join(', ');

      sendResponse({
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Payment failed',
          message: errorMessage || 'An error occurred while processing the payment',
          errors: errors,
        }),
      });
      return;
    }

    // Payment successful
    const payment = paymentData.payment || {};

    sendResponse({
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        paymentId: payment.id,
        orderId: payment.order_id,
        receiptUrl: payment.receipt_url,
        receiptNumber: payment.receipt_number,
        amount: payment.amount_money?.amount / 100,
        currency: payment.amount_money?.currency,
        status: payment.status,
        createdAt: payment.created_at,
      }),
    });
  } catch (error) {
    console.error('Error processing payment:', error);

    sendResponse({
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Payment processing error',
        message: error.message,
      }),
    });
  }
};

