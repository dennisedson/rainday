/**
 * Square account resolution and the authenticated fetch wrapper.
 *
 * Extracted from square.js so hubspot.js can use it without importing
 * square.js, which would otherwise form a cycle once square.js needs
 * createOrderDeal from hubspot.js.
 */

export const SQUARE_VERSION = '2024-12-18';

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

export function squareFetch(cfg, path, init = {}) {
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
