/**
 * Consolidated Square API Router
 * Handles products, categories, order calculations, and payments
 */

const crypto = require('crypto');

const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&auto=format&fit=crop&q=80';

const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';
const isProduction = SQUARE_ENVIRONMENT === 'production';
const SQUARE_ACCESS_TOKEN = isProduction
  ? process.env.SQUARE_PRODUCTION_ACCESS_TOKEN
  : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = isProduction
  ? process.env.SQUARE_PRODUCTION_LOCATION_ID
  : process.env.SQUARE_SANDBOX_LOCATION_ID;
const SQUARE_API_BASE = isProduction
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

// In-memory cache for catalog data
const catalogCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000, // 5 minutes
};

function getCachedCatalog() {
  if (catalogCache.data && catalogCache.timestamp) {
    const age = Date.now() - catalogCache.timestamp;
    if (age < catalogCache.ttl) {
      console.log(`[Square API] Cache hit (age: ${Math.round(age / 1000)}s)`);
      return catalogCache.data;
    }
  }
  console.log('[Square API] Cache miss');
  return null;
}

function setCachedCatalog(data) {
  catalogCache.data = data;
  catalogCache.timestamp = Date.now();
}

/**
 * Handle GET /api/square-products
 */
async function handleGetProducts(req, res) {
  try {
    // Check cache first
    const cached = getCachedCatalog();
    if (cached) {
      // Set cache headers for CDN and browser caching
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json(cached);
    }
    // Helper function to fetch all pages of a catalog type
    async function fetchAllCatalogPages(type) {
      let allObjects = [];
      let cursor = null;

      do {
        const url = cursor
          ? `${SQUARE_API_BASE}/v2/catalog/list?types=${type}&cursor=${cursor}`
          : `${SQUARE_API_BASE}/v2/catalog/list?types=${type}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Square-Version': '2024-12-18',
            'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(`Failed to fetch ${type}: ${JSON.stringify(data)}`);

        allObjects = allObjects.concat(data.objects || []);
        cursor = data.cursor;
      } while (cursor);

      return allObjects;
    }

    // Fetch categories, images, and items with pagination support
    const [categories, images, items] = await Promise.all([
      fetchAllCatalogPages('CATEGORY'),
      fetchAllCatalogPages('IMAGE'),
      fetchAllCatalogPages('ITEM'),
    ]);

    console.log('[Square API] Fetched:', {
      categories: categories.length,
      images: images.length,
      items: items.length,
    });

    // Combine all objects
    const allObjects = [
      ...categories,
      ...images,
      ...items,
    ];

    const imageMap = {};
    allObjects.filter(obj => obj.type === 'IMAGE').forEach(image => {
      imageMap[image.id] = image.image_data?.url || null;
    });

    console.log('[Square API] Found categories:', categories.length);

    const categoryMap = {};
    categories.forEach(category => {
      const imageId = category.category_data?.image_ids?.[0];
      categoryMap[category.id] = {
        name: category.category_data?.name || 'Uncategorized',
        image: imageId ? imageMap[imageId] : null,
      };
      console.log('[Square API] Mapped category:', category.id, '→', category.category_data?.name);
    });

    const products = allObjects.filter(obj => obj.type === 'ITEM').map(item => {
      const itemData = item.item_data;
      const variation = itemData.variations?.[0];
      const price = variation?.item_variation_data?.price_money?.amount || 0;
      const categoryId = itemData.reporting_category?.id;
      const categoryInfo = categoryId ? categoryMap[categoryId] : null;
      const imageId = itemData.image_ids?.[0];
      const productImageUrl = imageId ? imageMap[imageId] : null;

      if (!categoryId) {
        console.log('[Square API] Product has no category:', itemData.name);
      }

      if (imageId && !productImageUrl) {
        console.warn('[Square API] Product references missing image:', {
          product: itemData.name,
          imageId,
          category: categoryInfo?.name,
        });
      }

      // Determine availability based on Square's available_online flag
      // Default to available (true) if available_online is not explicitly set to false
      // Also check if track_inventory is enabled with low quantity alert
      const isAvailable = !itemData.is_deleted && (itemData.available_online !== false) &&
        (!variation?.item_variation_data?.track_inventory || variation?.item_variation_data?.inventory_alert_type !== 'LOW_QUANTITY');

      return {
        id: item.id,
        variationId: variation?.id,
        name: itemData.name || 'Untitled Product',
        description: itemData.description || '',
        category: categoryInfo?.name || 'Uncategorized',
        categoryImage: categoryInfo?.image || null,
        price: price / 100,
        image: productImageUrl || DEFAULT_PRODUCT_IMAGE,
        available: isAvailable,
        variations: itemData.variations || [],
      };
    });

    // Extract unique categories from products with their images
    const categoryNames = [...new Set(products.map(p => p.category))]
      .filter(cat => cat && cat !== 'Uncategorized');

    // Build full category objects with images
    const categoryObjects = categoryNames.map(name => {
      // Find the category ID from categoryMap
      const categoryEntry = Object.entries(categoryMap).find(([id, info]) => info.name === name);
      if (categoryEntry) {
        const [id, info] = categoryEntry;
        return {
          id,
          name: info.name,
          image: info.image,
          slug: info.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        };
      }
      // Fallback if no match found
      return {
        id: null,
        name,
        image: null,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const responseData = {
      products,
      categories: categoryObjects,
      count: products.length
    };

    // Cache the response
    setCachedCatalog(responseData);

    // Set cache headers: cache for 5 minutes, stale-while-revalidate for 10 minutes
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

/**
 * Handle GET /api/square-product?id=...
 */
async function handleGetProduct(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Product ID is required' });

  try {
    const response = await fetch(`${SQUARE_API_BASE}/v2/catalog/object/${id}?include_related_objects=true`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch product', details: data });

    const item = data.object;
    if (!item || item.type !== 'ITEM') return res.status(404).json({ error: 'Product not found' });

    const relatedObjects = data.related_objects || [];
    const images = relatedObjects.filter(obj => obj.type === 'IMAGE').map(imgObj => imgObj.image_data?.url || DEFAULT_PRODUCT_IMAGE);
    if (images.length === 0) images.push(DEFAULT_PRODUCT_IMAGE);

    const itemData = item.item_data;
    const variations = (itemData.variations || []).map(v => ({
      id: v.id,
      name: v.item_variation_data?.name || 'Default',
      sku: v.item_variation_data?.sku || null,
      price: (v.item_variation_data?.price_money?.amount || 0) / 100,
      available: !v.item_variation_data?.track_inventory || (v.item_variation_data?.inventory_alert_type !== 'LOW_QUANTITY'),
    }));

    const product = {
      id: item.id,
      variationId: variations[0]?.id,
      name: itemData.name || 'Untitled Product',
      description: itemData.description || '',
      category: itemData.category_id || 'uncategorized',
      price: (itemData.variations?.[0]?.item_variation_data?.price_money?.amount || 0) / 100,
      images: images,
      mainImage: images[0],
      galleryImages: images.slice(1, 4),
      available: !itemData.is_deleted && (itemData.available_online !== false) &&
        (!variations[0]?.item_variation_data?.track_inventory || variations[0]?.item_variation_data?.inventory_alert_type !== 'LOW_QUANTITY'),
      variations,
    };

    return res.status(200).json({ product, success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

/**
 * Handle GET /api/square-categories
 */
async function handleGetCategories(req, res) {
  try {
    // Try to use cached catalog data first
    const cached = getCachedCatalog();
    if (cached && cached.categories) {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ categories: cached.categories, count: cached.categories.length });
    }

    const response = await fetch(`${SQUARE_API_BASE}/v2/catalog/list?types=CATEGORY,IMAGE`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch categories', details: data });

    const imageMap = {};
    (data.objects || []).filter(obj => obj.type === 'IMAGE').forEach(image => {
      imageMap[image.id] = image.image_data?.url || null;
    });

    const categories = (data.objects || [])
      .filter(obj => obj.type === 'CATEGORY' && obj.category_data)
      .map(category => ({
        id: category.id,
        name: category.category_data.name,
        description: category.category_data.description || '',
        image: category.category_data.image_ids?.[0] ? imageMap[category.category_data.image_ids[0]] : null,
        slug: category.category_data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ categories, count: categories.length });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

/**
 * Handle POST /api/calculate-order
 */
async function handleCalculateOrder(req, res) {
  try {
    const { cartItems, shippingAddress, squareApplicationId, squareLocationId } = req.body;
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) return res.status(400).json({ error: 'Cart items are required' });

    console.log('[Square Calculate] Request Body:', JSON.stringify(req.body, null, 2));

    // Detect environment
    const isProdReq = squareApplicationId ? !squareApplicationId.startsWith('sandbox-') : isProduction;
    const activeAccessToken = isProdReq ? process.env.SQUARE_PRODUCTION_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
    const activeLocationId = squareLocationId || (isProdReq ? process.env.SQUARE_PRODUCTION_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID);
    const activeApiBase = isProdReq ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

    console.log(`[Square Calculate] Env: ${isProdReq ? 'PROD' : 'SANDBOX'}, Token: ${activeAccessToken ? 'Found' : 'MISSING'}, Location: ${activeLocationId}`);

    if (!activeAccessToken) {
      console.error('[Square Calculate] MISSING ACCESS TOKEN');
      return res.status(500).json({ error: 'Configuration error', message: 'Square Access Token is missing' });
    }

    const itemDebug = [];
    const order = {
      location_id: activeLocationId,
      line_items: cartItems.map(item => {
        const vid = item.variationId || item.id;
        // Square IDs are usually long strings. We check for 'item_' or 'variation_' which are our fallback IDs.
        const isFallbackId = !vid || vid.startsWith('item_') || vid.startsWith('variation_');
        const isValidSqId = !isFallbackId && vid.length > 5; // Be more lenient with length

        itemDebug.push({
          name: item.name,
          idUsed: vid,
          isValidSqId
        });

        console.log(`[Square Calculate] Item: ${item.name}, ID: ${vid}, IsValidSqId: ${isValidSqId}`);

        if (isValidSqId) {
          return {
            catalog_object_id: vid,
            quantity: item.quantity.toString()
          };
        }

        return {
          name: item.name,
          quantity: item.quantity.toString(),
          base_price_money: { amount: Math.round(item.price * 100), currency: 'USD' }
        };
      })
    };

    // NOTE: We deliberately DO NOT send shippingAddress here.
    // This forces Square to use "Origin-based" tax (your Kansas rule) 
    // instead of trying to calculate destination-based tax for NY/CA/etc.

    const response = await fetch(`${activeApiBase}/v2/orders/calculate`, {
      method: 'POST',
      headers: { 'Square-Version': '2024-12-18', 'Authorization': `Bearer ${activeAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    });

    const data = await response.json();
    console.log('[Square Calculate] Response body:', JSON.stringify(data, null, 2));

    const manualSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (!response.ok || !data.order) {
      console.error('[Square Calculate] API Error:', JSON.stringify(data, null, 2));
      return res.status(502).json({
        error: 'Order calculation failed',
        details: data.errors || data,
      });
    }

    const netAmounts = data.order.net_amounts || {};
    const sqSubtotal = (netAmounts.subtotal_money?.amount || 0) / 100;
    const subtotal = sqSubtotal > 0 ? sqSubtotal : manualSubtotal;
    const tax = (netAmounts.tax_money?.amount || 0) / 100;
    const discount = (netAmounts.discount_money?.amount || 0) / 100;
    
    // Shipping might be in service_charges if it was added as a fulfillment
    let shipping = data.order.service_charges ? data.order.service_charges.reduce((sum, charge) => sum + (charge.amount_money?.amount || 0), 0) / 100 : 0;
    
    // The total from Square should be the source of truth if it's > 0
    let total = (netAmounts.total_money?.amount || 0) / 100;
    
    // If Square total is 0 (unlikely if there are items), fallback to manual calculation
    if (total === 0) {
      total = subtotal + tax + shipping - discount;
    }

    console.log(`[Square Calculate] Result: Subtotal=${subtotal}, Tax=${tax}, Shipping=${shipping}, Total=${total}`);

    return res.status(200).json({ 
      success: true, 
      subtotal, 
      tax, 
      discount, 
      shipping, 
      total, 
      taxes: data.order.taxes || [],
      orderId: data.order.id,
      env: isProdReq ? 'production' : 'sandbox',
      debug: {
        locationId: activeLocationId,
        items: itemDebug
      }
    });
  } catch (error) {
    console.error('[Square Calculate] System Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

/**
 * Handle POST /api/process-payment
 *
 * SECURITY: the charge amount is derived entirely on the server. Cart items
 * must reference Square catalog variations; Square prices the order from the
 * catalog and applies tax rules. The client-sent `amount` is only compared
 * against the server total so the shopper is never charged a different
 * amount than they were shown.
 */
async function handleProcessPayment(req, res) {
  const { sourceId, amount, orderId, buyerEmail, billingDetails, cartItems, squareApplicationId, squareLocationId } = req.body;
  if (!sourceId) return res.status(400).json({ error: 'sourceId is required' });
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'cartItems are required' });
  }

  try {
    // Detect environment
    const isProdReq = squareApplicationId ? !squareApplicationId.startsWith('sandbox-') : isProduction;
    const activeAccessToken = isProdReq ? process.env.SQUARE_PRODUCTION_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
    const activeLocationId = squareLocationId || (isProdReq ? process.env.SQUARE_PRODUCTION_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID);
    const activeApiBase = isProdReq ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

    if (!activeAccessToken || !activeLocationId) {
      return res.status(500).json({
        error: 'Credentials missing',
        message: `Missing ${isProdReq ? 'Production' : 'Sandbox'} credentials in Vercel environment variables.`
      });
    }

    // 1. Validate cart items: every item must reference a real catalog
    // variation ('item_'/'variation_' prefixes are client-generated fallback
    // IDs). Client-sent names/prices are never used for pricing.
    const lineItems = [];
    for (const item of cartItems) {
      const vid = item.variationId || item.id;
      const quantity = Number(item.quantity);
      if (!vid || typeof vid !== 'string' || vid.startsWith('item_') || vid.startsWith('variation_')) {
        return res.status(400).json({
          error: 'Invalid cart item',
          message: `Cart item "${item.name || 'unknown'}" has no valid catalog ID. Please remove it and re-add it to your cart.`,
        });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        return res.status(400).json({
          error: 'Invalid quantity',
          message: `Cart item "${item.name || 'unknown'}" has an invalid quantity.`,
        });
      }
      lineItems.push({ catalog_object_id: vid, quantity: quantity.toString() });
    }

    const orderRef = orderId || `ORD-${crypto.randomUUID()}`;
    // Idempotency keys derive from the payment token: unique per checkout
    // attempt (tokens are single-use), stable if the same request is retried.
    const attemptKey = crypto.createHash('sha256').update(`${orderRef}:${sourceId}`).digest('hex').slice(0, 24);

    // 2. Create the Square Order — Square prices it from the catalog
    const orderResponse = await fetch(`${activeApiBase}/v2/orders`, {
      method: 'POST',
      headers: { 'Square-Version': '2024-12-18', 'Authorization': `Bearer ${activeAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: {
          location_id: activeLocationId,
          reference_id: orderRef,
          line_items: lineItems,
        },
        idempotency_key: `order-${attemptKey}`,
      }),
    });

    const orderResult = await orderResponse.json();
    if (!orderResponse.ok) {
      console.error('[Square Payment] Order creation failed:', JSON.stringify(orderResult));
      return res.status(502).json({ error: 'Order creation failed', details: orderResult.errors || orderResult });
    }

    const squareOrder = orderResult.order;
    const totalCents = squareOrder.total_money?.amount;
    const orderCurrency = squareOrder.total_money?.currency || 'USD';
    if (!Number.isInteger(totalCents) || totalCents <= 0) {
      console.error('[Square Payment] Order has no valid total:', JSON.stringify(squareOrder.total_money));
      return res.status(502).json({ error: 'Order total unavailable' });
    }

    // 3. Verify the total the shopper saw matches the catalog-priced total
    const clientCents = Math.round(Number(amount) * 100);
    if (clientCents !== totalCents) {
      console.warn(`[Square Payment] Price mismatch: client=${clientCents} server=${totalCents} (order ${orderRef})`);
      return res.status(409).json({
        error: 'Price mismatch',
        message: 'The order total has changed. Please review your cart and try again.',
        expectedTotal: totalCents / 100,
      });
    }

    // 4. Charge the server-derived total against the order
    const paymentData = {
      source_id: sourceId,
      idempotency_key: `pay-${attemptKey}`,
      amount_money: { amount: totalCents, currency: orderCurrency },
      location_id: activeLocationId,
      buyer_email_address: buyerEmail,
      reference_id: orderRef,
      order_id: squareOrder.id,
      autocomplete: true,
    };

    if (billingDetails) {
      paymentData.billing_address = {
        address_line_1: billingDetails.address1,
        locality: billingDetails.city,
        administrative_district_level_1: billingDetails.state,
        postal_code: billingDetails.zipCode,
        country: 'US',
      };
    }

    const response = await fetch(`${activeApiBase}/v2/payments`, {
      method: 'POST',
      headers: { 'Square-Version': '2024-12-18', 'Authorization': `Bearer ${activeAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Payment failed', details: data });

    const p = data.payment;
    return res.status(200).json({
      success: true,
      paymentId: p.id,
      orderId: p.order_id || squareOrder.id,
      receiptNumber: p.receipt_number,
      receiptUrl: p.receipt_url,
      status: p.status,
      amount: p.amount_money.amount / 100,
      currency: p.amount_money.currency,
      cardDetails: p.card_details ? { last4: p.card_details.card?.last_4, brand: p.card_details.card?.card_brand } : null,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.url.split('?')[0];

  if (path === '/api/square-products' || path === '/api/square') return handleGetProducts(req, res);
  if (path === '/api/square-product') return handleGetProduct(req, res);
  if (path === '/api/square-categories') return handleGetCategories(req, res);
  if (path === '/api/calculate-order') return handleCalculateOrder(req, res);
  if (path === '/api/process-payment') return handleProcessPayment(req, res);

  return res.status(404).json({ error: 'Route not found' });
};
