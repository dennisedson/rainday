/**
 * Single source of truth for the storefront's API host.
 *
 * This used to be hardcoded in nine files, which meant moving the backend was a
 * nine-file edit plus a theme deploy. Import API_BASE_URL from here instead of
 * writing a URL literal.
 *
 * The host is chosen from the hostname the page is served on, so one build
 * serves both portals:
 *
 *   www.rainydaymerchandise.com  -> production Worker (production Square)
 *   anything else (dev portal,   -> sandbox Worker    (sandbox Square)
 *   HubSpot preview URLs)
 *
 * The default is deliberately sandbox. An unrecognised hostname is far more
 * likely to be a preview than the real shop, and guessing wrong towards sandbox
 * shows the wrong catalog, while guessing wrong towards production would take
 * real card payments from a test page.
 *
 * Longer term these want to be custom domains (api. / api-sandbox.) rather than
 * platform hostnames, so a backend move is a DNS change. See workers/README.md.
 */

const PRODUCTION_HOSTS = ['www.rainydaymerchandise.com', 'rainydaymerchandise.com'];

const PRODUCTION_API = 'https://hsecommerce-api.dennis-544.workers.dev/api';
const SANDBOX_API = 'https://hsecommerce-api-sandbox.dennis-544.workers.dev/api';

function resolveApiBase() {
  // HubSpot renders components server-side before hydrating islands; there is
  // no hostname to read there. The browser re-evaluates this module in the
  // island bundle, which is where every API call actually happens.
  if (typeof window === 'undefined') return PRODUCTION_API;
  return PRODUCTION_HOSTS.includes(window.location.hostname) ? PRODUCTION_API : SANDBOX_API;
}

export const API_BASE_URL = resolveApiBase();
