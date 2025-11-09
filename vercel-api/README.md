# E-Commerce API for HubSpot CMS

Backend API for the HubSpot e-commerce site with Square payment integration. Deploys to Vercel as serverless functions.

## 🚀 Quick Deploy to Vercel

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
cd hsecommerce-api
npm install
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your personal account
- **Link to existing project?** No
- **Project name?** hsecommerce-api (or your preference)
- **Directory?** ./
- **Override settings?** No

### 3. Add Environment Variables

After first deployment, add secrets for **both sandbox and production**:

```bash
# Set environment mode (sandbox or production)
vercel env add SQUARE_ENVIRONMENT

# Sandbox credentials (for testing)
vercel env add SQUARE_SANDBOX_ACCESS_TOKEN
vercel env add SQUARE_SANDBOX_LOCATION_ID  
vercel env add SQUARE_SANDBOX_APPLICATION_ID

# Production credentials (for live transactions)
vercel env add SQUARE_PRODUCTION_ACCESS_TOKEN
vercel env add SQUARE_PRODUCTION_LOCATION_ID
vercel env add SQUARE_PRODUCTION_APPLICATION_ID

# HubSpot CRM
vercel env add HUBSPOT_ACCESS_TOKEN
```

Choose **Production** for each when prompted. Set `SQUARE_ENVIRONMENT` to `sandbox` initially for testing.

### 4. Deploy Again

```bash
vercel --prod
```

You'll get a production URL like: `https://hsecommerce-api.vercel.app`

## 📡 API Endpoints

### GET /api/square-products
Fetches products from Square Catalog API

**Response:**
```json
{
  "products": [
    {
      "id": "ABC123",
      "name": "Product Name",
      "description": "Description",
      "price": 299.99,
      "image": "image_id",
      "available": true
    }
  ],
  "count": 10
}
```

### POST /api/process-payment
Processes payments via Square Payments API

**Request:**
```json
{
  "sourceId": "PAYMENT_TOKEN_FROM_SQUARE_SDK",
  "amount": 299.99,
  "currency": "USD",
  "orderId": "ORDER_123",
  "billingDetails": {
    "address1": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "country": "US"
  }
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "PAYMENT_ID",
  "orderId": "ORDER_ID",
  "receiptUrl": "https://...",
  "status": "COMPLETED",
  "amount": 299.99
}
```

### POST /api/create-deal
Logs orders in HubSpot CRM

**Request:**
```json
{
  "email": "customer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "orderTotal": 299.99,
  "orderItems": [
    {"name": "Product", "quantity": 1}
  ],
  "paymentId": "PAYMENT_ID",
  "orderId": "ORDER_123"
}
```

**Response:**
```json
{
  "success": true,
  "dealId": "12345",
  "contactId": "67890"
}
```

## 🔧 Local Development

```bash
npm install
vercel dev
```

API will be available at `http://localhost:3000`

## 🔐 Getting API Credentials

### Square Credentials

1. Go to https://developer.squareup.com/
2. Create application
3. Get from dashboard:
   - **Application ID**
   - **Access Token** (use Sandbox for testing)
   - **Location ID**

### HubSpot Credentials (Optional - for CRM)

1. Go to HubSpot Settings → Integrations → Private Apps
2. Create private app with scopes:
   - `crm.objects.contacts.write`
   - `crm.objects.contacts.read`
   - `crm.objects.deals.write`
3. Copy the access token

## 🌐 Update HubSpot Frontend

After deploying to Vercel, update your HubSpot components to use the Vercel API URL:

```javascript
// Instead of:
const response = await fetch('/_hcms/api/square-products');

// Use:
const response = await fetch('https://hsecommerce-api.vercel.app/api/square-products');
```

## 🔒 CORS

CORS is pre-configured to allow all origins. For production, update `vercel.json` to restrict to your HubSpot domain:

```json
{
  "headers": [{
    "source": "/api/(.*)",
    "headers": [{
      "key": "Access-Control-Allow-Origin",
      "value": "https://your-hubspot-domain.hs-sites.com"
    }]
  }]
}
```

## 📊 Monitoring

View logs in Vercel dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Logs" tab

## 🚨 Troubleshooting

### "Square credentials not configured"
- Add environment variables in Vercel dashboard
- Redeploy after adding

### "CORS error"
- Check `vercel.json` CORS configuration
- Ensure you're calling from allowed origin

### "Payment failed"
- Test with Square test card: `4111 1111 1111 1111`
- Verify SQUARE_LOCATION_ID is correct
- Check Square Dashboard for details

## 📝 License

MIT

