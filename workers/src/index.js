/**
 * Cloudflare Worker entrypoint for the Rainy Day Merchandise storefront API.
 *
 * Replaces the Vercel functions in ../api plus the rewrite table in
 * ../vercel.json — those rewrites are now the route map below.
 */

import { corsHeaders, json } from './lib.js';
import {
  handleCalculateOrder,
  handleGetCategories,
  handleGetProduct,
  handleGetProducts,
  handleProcessPayment,
} from './square.js';
import {
  handleCreateDeal,
  handleFavorites,
  handleSyncCategories,
  syncCategories,
} from './hubspot.js';
import {
  handleMagicLinkRequest,
  handleVerifyLink,
  handleVerifySession,
} from './auth.js';

const routes = {
  '/api/health': handleHealth,
  '/api/square': handleGetProducts,
  '/api/square-products': handleGetProducts,
  '/api/square-product': handleGetProduct,
  '/api/square-categories': handleGetCategories,
  '/api/calculate-order': handleCalculateOrder,
  '/api/process-payment': handleProcessPayment,
  '/api/create-deal': handleCreateDeal,
  '/api/sync-categories': handleSyncCategories,
  '/api/favorites': handleFavorites,
  '/api/auth/magic-link': handleMagicLinkRequest,
  '/api/auth/verify-link': handleVerifyLink,
  '/api/auth/verify-session': handleVerifySession,
};

async function handleHealth(request, env) {
  return json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.SQUARE_ENVIRONMENT || 'not-set',
    platform: 'cloudflare-workers',
  });
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const path = new URL(request.url).pathname.replace(/\/$/, '') || '/';
    const handler = routes[path];

    let response;
    if (!handler) {
      response = json({ error: 'Route not found' }, { status: 404 });
    } else {
      try {
        response = await handler(request, env, ctx);
      } catch (error) {
        console.error(`[Worker] Unhandled error on ${path}:`, error.stack || error.message);
        response = json({ error: 'Internal server error' }, { status: 500 });
      }
    }

    // Handlers build their own bodies; CORS is applied uniformly here so no
    // route can forget it.
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(cors)) headers.set(key, value);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  /** Nightly category sync, replacing the Vercel cron in ../vercel.json. */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      syncCategories(env)
        .then((count) => console.log(`[Cron] Category sync complete: ${count} categories`))
        .catch((error) => console.error('[Cron] Category sync failed:', error.message))
    );
  },
};
