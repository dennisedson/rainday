/**
 * Process Payment API Endpoint
 * Processes payments via Square Payments API
 * 
 * POST /api/process-payment
 * 
 * Body: {
 *   sourceId: string (payment token from Square Web Payments SDK),
 *   amount: number (in dollars),
 *   currency: string (e.g., 'USD'),
 *   orderId: string (optional),
 *   customerId: string (optional),
 *   billingDetails: object,
 *   shippingDetails: object,
 * }
 */

export default async function handler(req, res) {
  // Set CORS headers - must be set before any response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Determine which environment to use
  const isProduction = process.env.SQUARE_ENVIRONMENT === 'production';
  
  // Select credentials based on environment
  const SQUARE_ACCESS_TOKEN = isProduction 
    ? process.env.SQUARE_PRODUCTION_ACCESS_TOKEN 
    : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;

  const SQUARE_LOCATION_ID = isProduction 
    ? process.env.SQUARE_PRODUCTION_LOCATION_ID 
    : process.env.SQUARE_SANDBOX_LOCATION_ID;

  // Select API base URL based on environment
  const SQUARE_API_BASE = isProduction
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    return res.status(500).json({ error: 'Square credentials not configured' });
  }

  try {
    const { sourceId, amount, currency = 'USD', orderId, billingDetails, shippingDetails } = req.body;

    if (!sourceId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: sourceId and amount' });
    }

    // Convert dollars to cents for Square API
    const amountInCents = Math.round(amount * 100);

    // Generate idempotency key
    const idempotencyKey = `${orderId || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare payment request
    const paymentData = {
      source_id: sourceId,
      idempotency_key: idempotencyKey,
      amount_money: {
        amount: amountInCents,
        currency: currency,
      },
      location_id: SQUARE_LOCATION_ID,
    };

    // Add order ID if provided
    if (orderId) {
      paymentData.reference_id = orderId;
    }

    // Add billing address if provided
    if (billingDetails) {
      paymentData.billing_address = {
        address_line_1: billingDetails.address1,
        address_line_2: billingDetails.address2,
        locality: billingDetails.city,
        administrative_district_level_1: billingDetails.state,
        postal_code: billingDetails.zipCode,
        country: billingDetails.country || 'US',
      };
    }

    // Process payment with Square
    const response = await fetch(`${SQUARE_API_BASE}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Square Payment Error:', responseData);
      return res.status(response.status).json({
        error: 'Payment failed',
        details: responseData.errors || responseData,
      });
    }

    // Payment successful
    const payment = responseData.payment;

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      receiptNumber: payment.receipt_number,
      receiptUrl: payment.receipt_url,
      status: payment.status,
      amount: payment.amount_money.amount / 100,
      currency: payment.amount_money.currency,
      createdAt: payment.created_at,
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

