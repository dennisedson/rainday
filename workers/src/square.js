/**
 * Square routes: catalog reads, order calculation, and payments.
 *
 * Ported from api/square.js. Behaviour is intentionally unchanged; the
 * differences are `env` instead of process.env, Request/Response instead of
 * (req, res), and Web Crypto instead of node:crypto.
 */

import { json, readJson, readParams, sha256Hex } from './lib.js';

const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&auto=format&fit=crop&q=80';

const SQUARE_VERSION = '2024-12-18';
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';

/**
 * Resolves which Square account to talk to. A request may override the
 * environment by passing a sandbox application id, which is how the dev portal
 * points at Square sandbox while production points at the live account.
 */
export function squareConfig(env, { squareApplicationId, squareLocationId } = {}) {
  const isProd = squareApplicationId
    ? !squareApplicationId.startsWith('sandbox-')
    : (env.SQUARE_ENVIRONMENT || 'sandbox') === 'production';

  return {
    isProd,
    accessToken: isProd ? env.SQUARE_PRODUCTION_ACCESS_TOKEN : env.SQUARE_SANDBOX_ACCESS_TOKEN,
    locationId:
      squareLocationId ||
      (isProd ? env.SQUARE_PRODUCTION_LOCATION_ID : env.SQUARE_SANDBOX_LOCATION_ID),
    apiBase: isProd ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com',
  };
}

function squareFetch(cfg, path, init = {}) {
  return fetch(`${cfg.apiBase}${path}`, {
    ...init,
    headers: {
      'Square-Version': SQUARE_VERSION,
      Authorization: `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

// Per-isolate catalog cache, same 5 minute TTL as the Vercel version. The
// Cache-Control header above is what actually does the heavy lifting once a
// custom domain puts Cloudflare's edge cache in front of the Worker.
const catalogCache = { data: null, timestamp: null, ttl: 5 * 60 * 1000 };

function getCachedCatalog() {
  if (catalogCache.data && catalogCache.timestamp) {
    if (Date.now() - catalogCache.timestamp < catalogCache.ttl) return catalogCache.data;
  }
  return null;
}

function setCachedCatalog(data) {
  catalogCache.data = data;
  catalogCache.timestamp = Date.now();
}

/** Exposed so a deploy or a deletion in Square can drop the cache immediately. */
export function clearCatalogCache() {
  catalogCache.data = null;
  catalogCache.timestamp = null;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function fetchAllCatalogPages(cfg, type) {
  let all = [];
  let cursor = null;

  do {
    const qs = cursor
      ? `?types=${type}&cursor=${encodeURIComponent(cursor)}`
      : `?types=${type}`;
    const response = await squareFetch(cfg, `/v2/catalog/list${qs}`, { method: 'GET' });
    const data = await response.json();
    if (!response.ok) throw new Error(`Failed to fetch ${type}: ${JSON.stringify(data)}`);

    all = all.concat(data.objects || []);
    cursor = data.cursor;
  } while (cursor);

  return all;
}

function isItemAvailable(itemData, variation) {
  const vd = variation?.item_variation_data;
  return (
    !itemData.is_deleted &&
    itemData.available_online !== false &&
    (!vd?.track_inventory || vd?.inventory_alert_type !== 'LOW_QUANTITY')
  );
}

/** GET /api/square-products */
export async function handleGetProducts(request, env) {
  const cfg = squareConfig(env);

  try {
    const cached = getCachedCatalog();
    if (cached) return json(cached, { headers: { 'Cache-Control': CACHE_CONTROL } });

    const [categories, images, items] = await Promise.all([
      fetchAllCatalogPages(cfg, 'CATEGORY'),
      fetchAllCatalogPages(cfg, 'IMAGE'),
      fetchAllCatalogPages(cfg, 'ITEM'),
    ]);

    const imageMap = {};
    for (const image of images) imageMap[image.id] = image.image_data?.url || null;

    const categoryMap = {};
    for (const category of categories) {
      const imageId = category.category_data?.image_ids?.[0];
      categoryMap[category.id] = {
        name: category.category_data?.name || 'Uncategorized',
        image: imageId ? imageMap[imageId] : null,
      };
    }

    const products = items.map((item) => {
      const itemData = item.item_data;
      const variation = itemData.variations?.[0];
      const price = variation?.item_variation_data?.price_money?.amount || 0;
      const categoryId = itemData.reporting_category?.id;
      const categoryInfo = categoryId ? categoryMap[categoryId] : null;
      const imageId = itemData.image_ids?.[0];

      return {
        id: item.id,
        variationId: variation?.id,
        name: itemData.name || 'Untitled Product',
        description: itemData.description || '',
        category: categoryInfo?.name || 'Uncategorized',
        categoryImage: categoryInfo?.image || null,
        price: price / 100,
        image: (imageId ? imageMap[imageId] : null) || DEFAULT_PRODUCT_IMAGE,
        available: isItemAvailable(itemData, variation),
        variations: itemData.variations || [],
      };
    });

    const categoryNames = [...new Set(products.map((p) => p.category))].filter(
      (c) => c && c !== 'Uncategorized'
    );

    const categoryObjects = categoryNames
      .map((name) => {
        const entry = Object.entries(categoryMap).find(([, info]) => info.name === name);
        if (entry) {
          const [id, info] = entry;
          return { id, name: info.name, image: info.image, slug: slugify(info.name) };
        }
        return { id: null, name, image: null, slug: slugify(name) };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const responseData = { products, categories: categoryObjects, count: products.length };
    setCachedCatalog(responseData);

    return json(responseData, { headers: { 'Cache-Control': CACHE_CONTROL } });
  } catch (error) {
    return json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

/** GET /api/square-product?id=... */
export async function handleGetProduct(request, env) {
  const { id } = await readParams(request);
  if (!id) return json({ error: 'Product ID is required' }, { status: 400 });

  const cfg = squareConfig(env);

  try {
    const response = await squareFetch(
      cfg,
      `/v2/catalog/object/${encodeURIComponent(id)}?include_related_objects=true`,
      { method: 'GET' }
    );
    const data = await response.json();
    if (!response.ok) {
      return json({ error: 'Failed to fetch product', details: data }, { status: response.status });
    }

    const item = data.object;
    if (!item || item.type !== 'ITEM') {
      return json({ error: 'Product not found' }, { status: 404 });
    }

    const images = (data.related_objects || [])
      .filter((obj) => obj.type === 'IMAGE')
      .map((imgObj) => imgObj.image_data?.url || DEFAULT_PRODUCT_IMAGE);
    if (images.length === 0) images.push(DEFAULT_PRODUCT_IMAGE);

    const itemData = item.item_data;
    const variations = (itemData.variations || []).map((v) => ({
      id: v.id,
      name: v.item_variation_data?.name || 'Default',
      sku: v.item_variation_data?.sku || null,
      price: (v.item_variation_data?.price_money?.amount || 0) / 100,
      available:
        !v.item_variation_data?.track_inventory ||
        v.item_variation_data?.inventory_alert_type !== 'LOW_QUANTITY',
    }));

    const product = {
      id: item.id,
      variationId: variations[0]?.id,
      name: itemData.name || 'Untitled Product',
      description: itemData.description || '',
      category: itemData.category_id || 'uncategorized',
      price: (itemData.variations?.[0]?.item_variation_data?.price_money?.amount || 0) / 100,
      images,
      mainImage: images[0],
      galleryImages: images.slice(1, 4),
      available: isItemAvailable(itemData, itemData.variations?.[0]),
      variations,
    };

    return json({ product, success: true });
  } catch (error) {
    return json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

/** GET /api/square-categories */
export async function handleGetCategories(request, env) {
  const cfg = squareConfig(env);

  try {
    const cached = getCachedCatalog();
    if (cached?.categories) {
      return json(
        { categories: cached.categories, count: cached.categories.length },
        { headers: { 'Cache-Control': CACHE_CONTROL } }
      );
    }

    // Must paginate. A single `?types=CATEGORY,IMAGE` call returns one page,
    // and with a few hundred images the CATEGORY objects fall past it — which
    // returned an empty category list, and so an empty storefront nav, whenever
    // this ran without a warm catalog cache.
    const [categoryObjects, imageObjects] = await Promise.all([
      fetchAllCatalogPages(cfg, 'CATEGORY'),
      fetchAllCatalogPages(cfg, 'IMAGE'),
    ]);

    const imageMap = {};
    for (const image of imageObjects) {
      imageMap[image.id] = image.image_data?.url || null;
    }

    const categories = categoryObjects
      .filter((obj) => obj.type === 'CATEGORY' && obj.category_data)
      .map((category) => ({
        id: category.id,
        name: category.category_data.name,
        description: category.category_data.description || '',
        image: category.category_data.image_ids?.[0]
          ? imageMap[category.category_data.image_ids[0]]
          : null,
        slug: slugify(category.category_data.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return json(
      { categories, count: categories.length },
      { headers: { 'Cache-Control': CACHE_CONTROL } }
    );
  } catch (error) {
    return json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

/** POST /api/calculate-order */
export async function handleCalculateOrder(request, env) {
  try {
    const body = await readJson(request);
    const { cartItems, squareApplicationId, squareLocationId } = body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return json({ error: 'Cart items are required' }, { status: 400 });
    }

    const cfg = squareConfig(env, { squareApplicationId, squareLocationId });
    if (!cfg.accessToken) {
      return json(
        { error: 'Configuration error', message: 'Square Access Token is missing' },
        { status: 500 }
      );
    }

    const itemDebug = [];
    const lineItems = cartItems.map((item) => {
      const vid = item.variationId || item.id;
      // 'item_'/'variation_' are client-generated fallback ids, not catalog ids.
      const isFallbackId = !vid || vid.startsWith('item_') || vid.startsWith('variation_');
      const isValidSqId = !isFallbackId && vid.length > 5;

      itemDebug.push({ name: item.name, idUsed: vid, isValidSqId });

      if (isValidSqId) {
        return { catalog_object_id: vid, quantity: String(item.quantity) };
      }
      return {
        name: item.name,
        quantity: String(item.quantity),
        base_price_money: { amount: Math.round(item.price * 100), currency: 'USD' },
      };
    });

    // Shipping address is deliberately withheld so Square applies origin-based
    // tax rather than trying to compute destination-based tax per state.
    const response = await squareFetch(cfg, '/v2/orders/calculate', {
      method: 'POST',
      body: JSON.stringify({ order: { location_id: cfg.locationId, line_items: lineItems } }),
    });

    const data = await response.json();
    if (!response.ok || !data.order) {
      return json(
        { error: 'Order calculation failed', details: data.errors || data },
        { status: 502 }
      );
    }

    const manualSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const net = data.order.net_amounts || {};
    const sqSubtotal = (net.subtotal_money?.amount || 0) / 100;
    const subtotal = sqSubtotal > 0 ? sqSubtotal : manualSubtotal;
    const tax = (net.tax_money?.amount || 0) / 100;
    const discount = (net.discount_money?.amount || 0) / 100;
    const shipping = data.order.service_charges
      ? data.order.service_charges.reduce((sum, c) => sum + (c.amount_money?.amount || 0), 0) / 100
      : 0;

    let total = (net.total_money?.amount || 0) / 100;
    if (total === 0) total = subtotal + tax + shipping - discount;

    return json({
      success: true,
      subtotal,
      tax,
      discount,
      shipping,
      total,
      taxes: data.order.taxes || [],
      orderId: data.order.id,
      env: cfg.isProd ? 'production' : 'sandbox',
      debug: { locationId: cfg.locationId, items: itemDebug },
    });
  } catch (error) {
    return json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/process-payment
 *
 * SECURITY: the charge amount is derived entirely on the server. Cart items
 * must reference Square catalog variations; Square prices the order from the
 * catalog and applies tax rules. The client-sent `amount` is only compared
 * against the server total so the shopper is never charged a different amount
 * than they were shown.
 */
export async function handleProcessPayment(request, env) {
  const body = await readJson(request);
  const {
    sourceId,
    amount,
    orderId,
    buyerEmail,
    billingDetails,
    cartItems,
    squareApplicationId,
    squareLocationId,
  } = body;

  if (!sourceId) return json({ error: 'sourceId is required' }, { status: 400 });
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return json({ error: 'cartItems are required' }, { status: 400 });
  }

  try {
    const cfg = squareConfig(env, { squareApplicationId, squareLocationId });
    if (!cfg.accessToken || !cfg.locationId) {
      return json(
        {
          error: 'Credentials missing',
          message: `Missing ${cfg.isProd ? 'Production' : 'Sandbox'} Square credentials.`,
        },
        { status: 500 }
      );
    }

    // 1. Every item must reference a real catalog variation. Client-sent names
    // and prices are never used for pricing.
    const lineItems = [];
    for (const item of cartItems) {
      const vid = item.variationId || item.id;
      const quantity = Number(item.quantity);

      if (!vid || typeof vid !== 'string' || vid.startsWith('item_') || vid.startsWith('variation_')) {
        return json(
          {
            error: 'Invalid cart item',
            message: `Cart item "${item.name || 'unknown'}" has no valid catalog ID. Please remove it and re-add it to your cart.`,
          },
          { status: 400 }
        );
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        return json(
          {
            error: 'Invalid quantity',
            message: `Cart item "${item.name || 'unknown'}" has an invalid quantity.`,
          },
          { status: 400 }
        );
      }
      lineItems.push({ catalog_object_id: vid, quantity: String(quantity) });
    }

    const orderRef = orderId || `ORD-${crypto.randomUUID()}`;
    // Idempotency keys derive from the payment token: unique per checkout
    // attempt (tokens are single-use), stable if the same request is retried.
    const attemptKey = (await sha256Hex(`${orderRef}:${sourceId}`)).slice(0, 24);

    // 2. Create the Square order — Square prices it from the catalog.
    const orderResponse = await squareFetch(cfg, '/v2/orders', {
      method: 'POST',
      body: JSON.stringify({
        order: { location_id: cfg.locationId, reference_id: orderRef, line_items: lineItems },
        idempotency_key: `order-${attemptKey}`,
      }),
    });

    const orderResult = await orderResponse.json();
    if (!orderResponse.ok) {
      return json(
        { error: 'Order creation failed', details: orderResult.errors || orderResult },
        { status: 502 }
      );
    }

    const squareOrder = orderResult.order;
    const totalCents = squareOrder.total_money?.amount;
    const orderCurrency = squareOrder.total_money?.currency || 'USD';
    if (!Number.isInteger(totalCents) || totalCents <= 0) {
      return json({ error: 'Order total unavailable' }, { status: 502 });
    }

    // 3. Verify the total the shopper saw matches the catalog-priced total.
    const clientCents = Math.round(Number(amount) * 100);
    if (clientCents !== totalCents) {
      return json(
        {
          error: 'Price mismatch',
          message: 'The order total has changed. Please review your cart and try again.',
          expectedTotal: totalCents / 100,
        },
        { status: 409 }
      );
    }

    // 4. Charge the server-derived total against the order.
    const paymentData = {
      source_id: sourceId,
      idempotency_key: `pay-${attemptKey}`,
      amount_money: { amount: totalCents, currency: orderCurrency },
      location_id: cfg.locationId,
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

    const response = await squareFetch(cfg, '/v2/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();
    if (!response.ok) {
      return json({ error: 'Payment failed', details: data }, { status: response.status });
    }

    const p = data.payment;
    return json({
      success: true,
      paymentId: p.id,
      orderId: p.order_id || squareOrder.id,
      receiptNumber: p.receipt_number,
      receiptUrl: p.receipt_url,
      status: p.status,
      amount: p.amount_money.amount / 100,
      currency: p.amount_money.currency,
      cardDetails: p.card_details
        ? { last4: p.card_details.card?.last_4, brand: p.card_details.card?.card_brand }
        : null,
    });
  } catch (error) {
    return json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
