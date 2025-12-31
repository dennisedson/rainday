/**
 * Calculate Order API Endpoint
 * Uses Square Orders API to calculate taxes and discounts
 * 
 * POST /api/calculate-order
 */

const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';
const SQUARE_ACCESS_TOKEN = SQUARE_ENVIRONMENT === 'production'
  ? process.env.SQUARE_PRODUCTION_ACCESS_TOKEN
  : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;

const SQUARE_LOCATION_ID = SQUARE_ENVIRONMENT === 'production'
  ? process.env.SQUARE_PRODUCTION_LOCATION_ID
  : process.env.SQUARE_SANDBOX_LOCATION_ID;

const SQUARE_API_BASE = SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SQUARE_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Square credentials not configured' });
  }

  try {
    const { cartItems, shippingAddress } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart items are required' });
    }

    // 1. Prepare line items for Square
    const lineItems = cartItems.map(item => ({
      catalog_object_id: item.id.startsWith('item_') ? null : item.id, // Only use if it's a variation ID
      name: item.name,
      quantity: item.quantity.toString(),
      base_price_money: {
        amount: Math.round(item.price * 100),
        currency: 'USD'
      }
    }));

    // 2. Build order object
    const order = {
      location_id: SQUARE_LOCATION_ID,
      line_items: lineItems
    };

    // If we have shipping address, we could add it as a fulfillment 
    // to help Square calculate location-based taxes if configured
    if (shippingAddress) {
      order.fulfillments = [{
        type: 'SHIPMENT',
        shipment_details: {
          recipient: {
            address: {
              address_line_1: shippingAddress.address,
              locality: shippingAddress.city,
              administrative_district_level_1: shippingAddress.state,
              postal_code: shippingAddress.zipCode,
              country: 'US'
            }
          }
        }
      }];
    }

    // 3. Call Square CalculateOrder API
    const response = await fetch(`${SQUARE_API_BASE}/v2/orders/calculate`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Square CalculateOrder Error:', data);
      return res.status(response.status).json({ 
        error: 'Failed to calculate order with Square', 
        details: data.errors 
      });
    }

    const calculatedOrder = data.order;

    // Extract totals (Square returns amounts in cents)
    const subtotal = (calculatedOrder.net_amounts.subtotal_money?.amount || 0) / 100;
    const tax = (calculatedOrder.net_amounts.tax_money?.amount || 0) / 100;
    const discount = (calculatedOrder.net_amounts.discount_money?.amount || 0) / 100;
    
    // Shipping calculation - Square's CalculateOrder doesn't automatically 
    // calculate shipping rates unless they are added as service charges.
    // We'll return a default or use Square service charges if present.
    let shipping = 0;
    if (calculatedOrder.service_charges) {
      shipping = calculatedOrder.service_charges.reduce((sum, charge) => {
        return sum + (charge.amount_money?.amount || 0);
      }, 0) / 100;
    } else {
      // Fallback: Default shipping if not in Square
      shipping = 12.00;
    }

    const total = (calculatedOrder.net_amounts.total_money?.amount || 0) / 100 + (calculatedOrder.service_charges ? 0 : shipping);

    return res.status(200).json({
      success: true,
      subtotal,
      tax,
      discount,
      shipping,
      total,
      orderId: calculatedOrder.id,
      // Pass back the calculated order if needed
      squareOrder: calculatedOrder
    });

  } catch (error) {
    console.error('Error calculating order:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
};

