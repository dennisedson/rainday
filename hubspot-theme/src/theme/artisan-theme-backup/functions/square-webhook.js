/**
 * Square Webhook Handler Serverless Function
 * Handles webhook events from Square (payment.created, payment.updated, etc.)
 * Verifies webhook signatures for security
 * 
 * NOTE: Configure this webhook URL in your Square Developer Dashboard
 */

const crypto = require('crypto');

exports.main = async (context = {}, sendResponse) => {
  // Get Square webhook signature key from HubSpot Secrets
  const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env['SQUARE_WEBHOOK_SIGNATURE_KEY'];

  try {
    // Get webhook payload and signature
    const body = context.body;
    const signature = context.headers['x-square-hmacsha256-signature'] || context.headers['X-Square-Hmacsha256-Signature'];

    // Verify webhook signature (CRITICAL for security)
    if (SQUARE_WEBHOOK_SIGNATURE_KEY && signature) {
      const hmac = crypto.createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY);
      hmac.update(body);
      const calculatedSignature = hmac.digest('base64');

      if (signature !== calculatedSignature) {
        console.error('Invalid webhook signature');
        sendResponse({
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid signature' }),
        });
        return;
      }
    }

    // Parse webhook event
    const event = JSON.parse(body);
    const { type, data } = event;

    console.log(`Received Square webhook: ${type}`);

    // Handle different event types
    switch (type) {
      case 'payment.created':
        await handlePaymentCreated(data);
        break;

      case 'payment.updated':
        await handlePaymentUpdated(data);
        break;

      case 'order.created':
        await handleOrderCreated(data);
        break;

      case 'order.updated':
        await handleOrderUpdated(data);
        break;

      default:
        console.log(`Unhandled webhook event type: ${type}`);
    }

    // Send success response
    sendResponse({
      statusCode: 200,
      body: JSON.stringify({ success: true, received: type }),
    });
  } catch (error) {
    console.error('Error processing Square webhook:', error);

    sendResponse({
      statusCode: 500,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message,
      }),
    });
  }
};

/**
 * Handle payment.created event
 * Called when a new payment is successfully created
 */
async function handlePaymentCreated(data) {
  const payment = data.object?.payment;
  
  if (!payment) {
    console.error('No payment data in webhook');
    return;
  }

  console.log(`Payment created: ${payment.id}`);
  console.log(`Amount: ${payment.amount_money?.amount / 100} ${payment.amount_money?.currency}`);
  console.log(`Status: ${payment.status}`);

  // TODO: Update order status in database
  // TODO: Send confirmation email to customer
  // TODO: Trigger fulfillment process
  // TODO: Update HubSpot Deal if not already done
}

/**
 * Handle payment.updated event
 * Called when payment status changes (e.g., refunded, failed)
 */
async function handlePaymentUpdated(data) {
  const payment = data.object?.payment;
  
  if (!payment) {
    console.error('No payment data in webhook');
    return;
  }

  console.log(`Payment updated: ${payment.id}`);
  console.log(`New status: ${payment.status}`);

  // TODO: Update order status based on payment status
  // TODO: Handle refunds
  // TODO: Update HubSpot Deal with new status
}

/**
 * Handle order.created event
 */
async function handleOrderCreated(data) {
  const order = data.object?.order;
  
  if (!order) {
    console.error('No order data in webhook');
    return;
  }

  console.log(`Order created: ${order.id}`);
  
  // TODO: Process order
}

/**
 * Handle order.updated event
 */
async function handleOrderUpdated(data) {
  const order = data.object?.order;
  
  if (!order) {
    console.error('No order data in webhook');
    return;
  }

  console.log(`Order updated: ${order.id}`);
  console.log(`State: ${order.state}`);
  
  // TODO: Update order in system
}

