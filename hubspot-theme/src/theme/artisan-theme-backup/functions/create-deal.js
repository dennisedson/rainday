/**
 * Create Deal Serverless Function
 * Creates a Deal in HubSpot CRM after successful payment
 * Associates with Contact (creates contact if doesn't exist)
 */

const hubspot = require('@hubspot/api-client');

exports.main = async (context = {}, sendResponse) => {
  // HubSpot API client is automatically authenticated in serverless functions
  const hubspotClient = new hubspot.Client({
    accessToken: process.env['HUBSPOT_ACCESS_TOKEN'] || context.accountId,
  });

  try {
    // Parse request body
    const body = JSON.parse(context.body || '{}');
    const {
      orderDetails,
      customerInfo,
      paymentInfo,
      totalAmount,
    } = body;

    // Validate required fields
    if (!orderDetails || !customerInfo || !customerInfo.email) {
      sendResponse({
        statusCode: 400,
        body: JSON.stringify({
          error: 'Order details and customer email are required',
        }),
      });
      return;
    }

    // Step 1: Find or create contact
    let contactId;
    
    try {
      // Search for existing contact by email
      const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: customerInfo.email,
              },
            ],
          },
        ],
        properties: ['email', 'firstname', 'lastname'],
        limit: 1,
      });

      if (searchResponse.results && searchResponse.results.length > 0) {
        // Contact exists
        contactId = searchResponse.results[0].id;
      } else {
        // Create new contact
        const contactProperties = {
          email: customerInfo.email,
          firstname: customerInfo.firstName || '',
          lastname: customerInfo.lastName || '',
          phone: customerInfo.phone || '',
          address: customerInfo.shippingAddress?.line1 || '',
          city: customerInfo.shippingAddress?.city || '',
          state: customerInfo.shippingAddress?.state || '',
          zip: customerInfo.shippingAddress?.postalCode || '',
          country: customerInfo.shippingAddress?.country || 'US',
        };

        const newContact = await hubspotClient.crm.contacts.basicApi.create({
          properties: contactProperties,
        });

        contactId = newContact.id;
      }
    } catch (error) {
      console.error('Error finding/creating contact:', error);
      throw new Error(`Failed to process contact: ${error.message}`);
    }

    // Step 2: Create Deal
    try {
      // Build deal properties
      const dealName = `Order - ${customerInfo.email} - ${new Date().toISOString().split('T')[0]}`;
      
      // Format line items for deal description
      const lineItemsText = orderDetails.items
        ?.map((item) => `${item.name} x${item.quantity} - $${item.price * item.quantity}`)
        .join('\n') || 'No items';

      const dealProperties = {
        dealname: dealName,
        amount: totalAmount || 0,
        dealstage: 'closedwon', // Assuming payment was successful
        pipeline: 'default', // Use your pipeline ID
        closedate: new Date().toISOString(),
        // Custom properties (create these in HubSpot first)
        order_id: paymentInfo?.orderId || '',
        payment_id: paymentInfo?.paymentId || '',
        payment_status: paymentInfo?.status || 'completed',
        order_details: lineItemsText,
        shipping_address: customerInfo.shippingAddress
          ? `${customerInfo.shippingAddress.line1}, ${customerInfo.shippingAddress.city}, ${customerInfo.shippingAddress.state} ${customerInfo.shippingAddress.postalCode}`
          : '',
      };

      const newDeal = await hubspotClient.crm.deals.basicApi.create({
        properties: dealProperties,
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 3, // Deal to Contact association
              },
            ],
          },
        ],
      });

      // Step 3: Create line items (optional - requires Products in HubSpot)
      // This would map Square products to HubSpot products
      // Implementation depends on your HubSpot Products setup

      sendResponse({
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          dealId: newDeal.id,
          contactId: contactId,
          message: 'Deal created successfully in HubSpot CRM',
        }),
      });
    } catch (error) {
      console.error('Error creating deal:', error);
      throw new Error(`Failed to create deal: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in create-deal function:', error);

    sendResponse({
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to create deal in HubSpot',
        message: error.message,
      }),
    });
  }
};

