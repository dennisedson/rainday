/**
 * Order pricing rules.
 *
 * The RATE lives in Square (a catalog tax object) so the shop owner can change
 * it without a deploy. The CONDITION lives here, because who owes tax is a
 * legal rule rather than a setting.
 *
 * Both handleCalculateOrder and handleProcessPayment must call these functions.
 * If they ever disagree, the price-mismatch guard returns 409 and checkout
 * breaks - safely, but visibly.
 */

import { squareFetch } from './square-client.js';

const KANSAS_FORMS = ['KS', 'KANSAS'];

/**
 * Kansas buyers are taxed. Everyone else is not, until an economic nexus
 * threshold is crossed in their state (commonly $100k gross or 200
 * transactions annually). An unrecognised state fails toward NOT taxing,
 * which undercharges rather than charging tax that was never owed.
 *
 * The checkout form's State field is free text, not a dropdown, so a buyer
 * may type the postal code ("KS") or the full name ("Kansas"). Both are
 * matched; no other spelling is guessed at.
 */
export function shouldApplyKansasTax(state) {
  return KANSAS_FORMS.includes(String(state ?? '').trim().toUpperCase());
}

/**
 * The tax catalog object id lives in a different Square account for
 * production versus sandbox, exactly like squareConfig() branches
 * accessToken/locationId/apiBase on cfg.isProd. Reading a flat env var here
 * would hand a production catalog id to a sandbox-credentialed request (or
 * vice versa); Square would reject the mismatched id, but the fix is to
 * route correctly rather than rely on that fail-safe.
 */
export function buildOrderTaxes(env, cfg, state) {
  if (!shouldApplyKansasTax(state)) return [];
  const id = cfg.isProd ? env.SQUARE_KS_TAX_ID_PRODUCTION : env.SQUARE_KS_TAX_ID_SANDBOX;
  if (!id) return [];
  return [{ catalog_object_id: id, scope: 'ORDER' }];
}

/**
 * Shipping.
 *
 * Catalog SERVICE_CHARGE objects do not exist in Square API 2024-12-18, so the
 * fee is the price of a dedicated `Shipping` catalog item. The owner edits that
 * price in Square Items; the Worker reads it and applies it as an ad-hoc order
 * service charge. The client never supplies the amount.
 *
 * SUBTOTAL_PHASE with taxable: true, because shipping is taxable in Kansas and
 * must land inside the taxed subtotal. Square rejects a taxable charge in
 * TOTAL_PHASE.
 */
export function buildServiceCharges(cents) {
  if (typeof cents !== 'number' || !Number.isFinite(cents) || cents <= 0) return [];
  return [{
    name: 'Shipping',
    amount_money: { amount: Math.round(cents), currency: 'USD' },
    calculation_phase: 'SUBTOTAL_PHASE',
    taxable: true,
  }];
}

/**
 * Reads the shipping fee from the configured catalog variation.
 *
 * The variation id is per-account, same as the tax catalog id in
 * buildOrderTaxes() and accessToken/locationId in squareConfig() — production
 * and sandbox credentials must never cross. Reading a flat env var here would
 * hand a production catalog id to a sandbox-credentialed request (or vice
 * versa), since a production-deployed Worker can be flipped onto sandbox
 * credentials per-request by a sandbox- prefixed application id.
 *
 * Returns null when unconfigured or unreadable, which means free shipping —
 * a misconfiguration undercharges rather than stranding a customer at checkout.
 */
export async function fetchShippingCents(cfg, env) {
  const id = cfg.isProd
    ? env.SQUARE_SHIPPING_VARIATION_ID_PRODUCTION
    : env.SQUARE_SHIPPING_VARIATION_ID_SANDBOX;
  if (!id) return null;
  try {
    const response = await squareFetch(cfg, `/v2/catalog/object/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data.errors || data));
    const amount = data.object?.item_variation_data?.price_money?.amount;
    return typeof amount === 'number' ? amount : null;
  } catch (error) {
    console.error('[Pricing] shipping lookup failed, treating shipping as free:', error.message);
    return null;
  }
}
