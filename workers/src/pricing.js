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

const KANSAS = 'KS';

/**
 * Kansas buyers are taxed. Everyone else is not, until an economic nexus
 * threshold is crossed in their state (commonly $100k gross or 200
 * transactions annually). An unrecognised state fails toward NOT taxing,
 * which undercharges rather than charging tax that was never owed.
 */
export function shouldApplyKansasTax(state) {
  return String(state ?? '').trim().toUpperCase() === KANSAS;
}

export function buildOrderTaxes(env, state) {
  if (!shouldApplyKansasTax(state)) return [];
  const id = env.SQUARE_KS_TAX_ID;
  if (!id) return [];
  return [{ catalog_object_id: id, scope: 'ORDER' }];
}
