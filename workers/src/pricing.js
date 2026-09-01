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
