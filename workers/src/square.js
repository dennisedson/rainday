/**
 * Square routes: catalog reads, order calculation, and payments.
 *
 * Ported from api/square.js. Behaviour is intentionally unchanged; the
 * differences are `env` instead of process.env, Request/Response instead of
 * (req, res), and Web Crypto instead of node:crypto.
 */

import { json, readJson, readParams, sha256Hex } from './lib.js';
import { squareConfig, squareFetch } from './square-client.js';
import { fetchInventoryLevelsSafely, fetchVariationsById, findInsufficientStock, resolveStockLevel } from './inventory.js';
import { buildOrderTaxes, buildServiceCharges, fetchShippingCents } from './pricing.js';
import { createOrderDeal } from './hubspot.js';

const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&auto=format&fit=crop&q=80';

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';

export { squareConfig };

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

function isItemAvailable(itemData, stockLevel) {
  if (stockLevel === 0) return false;
  return !itemData.is_deleted && itemData.available_online !== false;
}

/**
 * True for the dedicated `Shipping` catalog item, which prices the shipping
 * fee (see pricing.js) but is not itself a purchasable product.
 *
 * Checked two ways, independently: by variation id (the same value that
 * prices the fee) OR by name (case-insensitive, trimmed). The variation id
 * check alone leaves a gap — SQUARE_SHIPPING_VARIATION_ID_* defaults to empty
 * (free shipping) until the owner configures it, and during that window an
 * item literally named `Shipping` would otherwise reach the storefront grid
 * as a purchasable product. Belt and braces.
 */
export function isShippingItem(item, shippingVariationId) {
  const variationId = item?.item_data?.variations?.[0]?.id;
  if (shippingVariationId && variationId === shippingVariationId) return true;
  const name = item?.item_data?.name;
  return typeof name === 'string' && name.trim().toLowerCase() === 'shipping';
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

    // The Shipping catalog item's price is read server-side to compute the
    // shipping fee (see pricing.js); it is not a purchasable product.
    // available_online: false does not persist through the Catalog API, so it
    // must be filtered out here or it would appear in the product grid. The id
    // is per-account, same as the tax and shipping-fee ids elsewhere —
    // production and sandbox credentials must never cross.
    const shippingVariationId = cfg.isProd
      ? env.SQUARE_SHIPPING_VARIATION_ID_PRODUCTION
      : env.SQUARE_SHIPPING_VARIATION_ID_SANDBOX;
    const sellableItems = items.filter((item) => !isShippingItem(item, shippingVariationId));

    const variationIds = sellableItems
      .map((item) => item.item_data?.variations?.[0]?.id)
      .filter(Boolean);
    const stockLevels = await fetchInventoryLevelsSafely(cfg, variationIds);

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

    const products = sellableItems.map((item) => {
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
        available: isItemAvailable(itemData, resolveStockLevel(variation, stockLevels, cfg.locationId)),
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

    // Same exclusion as /api/square-products: the Shipping item is priced
    // for the shipping fee (see pricing.js), not sold as a product. Without
    // this, fetching it by id directly returns it as a normal purchasable
    // item.
    const shippingVariationId = cfg.isProd
      ? env.SQUARE_SHIPPING_VARIATION_ID_PRODUCTION
      : env.SQUARE_SHIPPING_VARIATION_ID_SANDBOX;
    if (isShippingItem(item, shippingVariationId)) {
      return json({ error: 'Product not found' }, { status: 404 });
    }

    const images = (data.related_objects || [])
      .filter((obj) => obj.type === 'IMAGE')
      .map((imgObj) => imgObj.image_data?.url || DEFAULT_PRODUCT_IMAGE);
    if (images.length === 0) images.push(DEFAULT_PRODUCT_IMAGE);

    const itemData = item.item_data;
    const variationIds = (itemData.variations || []).map((v) => v.id);
    const stockLevels = await fetchInventoryLevelsSafely(cfg, variationIds);

    const variations = (itemData.variations || []).map((v) => ({
      id: v.id,
      name: v.item_variation_data?.name || 'Default',
      sku: v.item_variation_data?.sku || null,
      price: (v.item_variation_data?.price_money?.amount || 0) / 100,
      available: resolveStockLevel(v, stockLevels, cfg.locationId) !== 0,
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
      available: isItemAvailable(itemData,
        resolveStockLevel(itemData.variations?.[0] ?? {}, stockLevels, cfg.locationId)),
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
    const { cartItems, shippingAddress, squareApplicationId, squareLocationId } = body;

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

    const taxes = buildOrderTaxes(env, cfg, shippingAddress?.state);
    const serviceCharges = buildServiceCharges(await fetchShippingCents(cfg, env));

    const response = await squareFetch(cfg, '/v2/orders/calculate', {
      method: 'POST',
      body: JSON.stringify({
        order: {
          location_id: cfg.locationId,
          line_items: lineItems,
          ...(taxes.length ? { taxes } : {}),
          ...(serviceCharges.length ? { service_charges: serviceCharges } : {}),
        },
      }),
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
export async function handleProcessPayment(request, env, ctx) {
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

    // Stock is enforced here, not just in the storefront: a cached page or a
    // direct API call could otherwise buy the last unit twice.
    const cartVariationIds = cartItems.map((item) => item.variationId || item.id);
    const [variationsById, stockLevels] = await Promise.all([
      fetchVariationsById(cfg, cartVariationIds),
      fetchInventoryLevelsSafely(cfg, cartVariationIds),
    ]);
    const shortfall = findInsufficientStock(cartItems, variationsById, stockLevels, cfg.locationId);
    if (shortfall) {
      console.warn(`[Order] Blocked: "${shortfall.name}" requested ${shortfall.requested}, ${shortfall.available} available`);
      return json(
        {
          error: 'Insufficient stock',
          message: shortfall.available === 0
            ? `"${shortfall.name}" just sold out. Please remove it from your cart.`
            : `Only ${shortfall.available} of "${shortfall.name}" remain. Please lower the quantity.`,
          itemName: shortfall.name,
          available: shortfall.available,
        },
        { status: 409 }
      );
    }

    const orderRef = orderId || `ORD-${crypto.randomUUID()}`;
    // Idempotency keys derive from the payment token: unique per checkout
    // attempt (tokens are single-use), stable if the same request is retried.
    const attemptKey = (await sha256Hex(`${orderRef}:${sourceId}`)).slice(0, 24);

    // 2. Create the Square order — Square prices it from the catalog.
    const taxes = buildOrderTaxes(env, cfg, billingDetails?.state);
    const serviceCharges = buildServiceCharges(await fetchShippingCents(cfg, env));

    // The shipping address is attached to the order as a SHIPMENT fulfillment
    // so it shows up on the Square Dashboard's Orders tab, not just as
    // billing_address on the payment (which the Dashboard doesn't surface).
    const recipientName = [billingDetails?.firstName, billingDetails?.lastName]
      .filter(Boolean).join(' ').trim();
    const fulfillments = billingDetails?.address1
      ? [{
          type: 'SHIPMENT',
          state: 'PROPOSED',
          shipment_details: {
            recipient: {
              display_name: recipientName || buyerEmail || 'Customer',
              email_address: buyerEmail,
              phone_number: billingDetails.phone,
              address: {
                address_line_1: billingDetails.address1,
                locality: billingDetails.city,
                administrative_district_level_1: billingDetails.state,
                postal_code: billingDetails.zipCode,
                country: billingDetails.country || 'US',
              },
            },
          },
        }]
      : [];

    const orderResponse = await squareFetch(cfg, '/v2/orders', {
      method: 'POST',
      body: JSON.stringify({
        order: {
          location_id: cfg.locationId,
          reference_id: orderRef,
          line_items: lineItems,
          ...(taxes.length ? { taxes } : {}),
          ...(serviceCharges.length ? { service_charges: serviceCharges } : {}),
          ...(fulfillments.length ? { fulfillments } : {}),
        },
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

    const dealWork = createOrderDeal(env, {
      email: buyerEmail,
      firstName: billingDetails?.firstName,
      lastName: billingDetails?.lastName,
      phone: billingDetails?.phone,
      order: squareOrder,
      payment: p,
    }).catch((error) => {
      console.error('[Order] HubSpot deal creation failed:', error.message, 'payment:', p.id);
    });
    if (ctx?.waitUntil) ctx.waitUntil(dealWork);

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
