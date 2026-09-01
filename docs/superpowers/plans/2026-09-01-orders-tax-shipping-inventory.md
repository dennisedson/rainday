# Orders, Tax, Shipping, and Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Charge Kansas sales tax and shipping, block purchase of out-of-stock items, and make every order visible to the shop owner in both Square and HubSpot.

**Architecture:** Two new Worker modules — `src/pricing.js` (tax condition, shipping lookup) and `src/inventory.js` (stock resolution) — keep `src/square.js` from growing past its current 524 lines. Both `calculate-order` and `process-payment` call the *same* pricing functions, because if they ever disagree the existing price-mismatch guard returns 409 and checkout breaks. Money rules live in Square (a tax object, a shipping item price) so the owner changes them without a deploy; the client never supplies an amount.

**Tech Stack:** Cloudflare Workers (ESM, no bundler config), `node --test` for unit tests, Square Orders/Catalog/Inventory REST APIs at version `2024-12-18`, HubSpot CRM v3/v4 REST.

## Global Constraints

- Square API version header is exactly `2024-12-18` on every call.
- All Square requests go through the existing `squareFetch(cfg, path, init)` helper in `src/square.js`. Do not call `fetch` against Square directly.
- Tests run with `npm test` in `workers/` (`node --test test/*.test.js`). No credentials, no network.
- Tax and shipping must be applied by shared functions called from BOTH `handleCalculateOrder` and `handleProcessPayment`. Never two copies.
- Never trust a client-supplied price, amount, tax, or shipping figure.
- Sandbox first. No payment testing against production Square — any such test is a real charge.
- Existing sandbox config: KS tax `DBZ6Y7OTBOC3ZHUYFIUJJEJP` (6.5%), shipping variation `FTI6NZQXSUZ5CVNBDDL45ALJ` ($5.00), HubSpot staging portal `51953677`, owner `11176268`.

## File Structure

| File | Responsibility |
| :--- | :--- |
| `workers/src/pricing.js` | NEW. Tax condition, shipping price lookup, order-decoration helpers. Pure logic plus one catalog read. |
| `workers/src/inventory.js` | NEW. Inventory count fetching and three-way stock resolution. |
| `workers/src/square.js` | MODIFY. Wire pricing into both order paths; wire inventory into catalog reads; attach fulfillment; exclude the shipping item. |
| `workers/src/hubspot.js` | MODIFY. Add `createOrderDeal()` for server-side deal creation with structured properties. |
| `workers/test/pricing.test.js` | NEW. Tax condition and shipping/service-charge shaping. |
| `workers/test/inventory.test.js` | NEW. Three-way stock resolution. |
| `workers/test/orders.test.js` | NEW. Order-item formatting and address formatting. |
| `workers/wrangler.toml` | MODIFY. Add `SQUARE_KS_TAX_ID`, `SQUARE_SHIPPING_VARIATION_ID`, `HUBSPOT_OWNER_ID` vars per environment. |
| `hubspot-theme/.../CheckoutPaymentIsland.jsx` | MODIFY. Forward `firstName`, `lastName`, `phone`; drop the client-side `create-deal` call. |
| `hubspot-theme/.../OrderConfirmationIsland.jsx` | MODIFY. `Tax (8%)` becomes `Tax`. |
| `README.md`, `workers/README.md` | MODIFY. Owner-facing guidance, folded into the task that creates each behaviour. |

---

### Task 1: Inventory-gated availability

**Files:**
- Create: `workers/src/inventory.js`
- Create: `workers/test/inventory.test.js`
- Modify: `workers/src/square.js` (`isItemAvailable`, `handleGetProducts`, `handleGetProduct`)
- Modify: `workers/README.md`

**Interfaces:**
- Consumes: `squareFetch(cfg, path, init)` and `squareConfig(env)` from `src/square.js`.
- Produces:
  - `chunk(items, size) -> Array<Array>`
  - `parseInventoryQuantity(qty: string|null) -> number|null`
  - `tracksInventory(variationData, locationId) -> boolean`
  - `isSoldOutAtLocation(variationData, locationId) -> boolean`
  - `resolveStockLevel(variation, stockLevels: Map<string,number>, locationId) -> number|undefined`
  - `fetchInventoryLevels(cfg, squareFetch, variationIds: string[]) -> Promise<Map<string,number>>`
  - `fetchInventoryLevelsSafely(cfg, squareFetch, variationIds) -> Promise<Map<string,number>>`

`squareFetch` is passed in rather than imported, because `src/square.js` already
imports from `src/inventory.js` and importing back would be circular.

Note: Square REST returns **snake_case** (`catalog_object_id`, `item_variation_data`, `track_inventory`, `location_overrides`, `sold_out`), unlike the SDK. Read those names.

- [ ] **Step 1: Write the failing test**

Create `workers/test/inventory.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunk, parseInventoryQuantity, resolveStockLevel, tracksInventory,
} from '../src/inventory.js';

const LOC = 'LOC1';
const variation = (data) => ({ id: 'VAR1', item_variation_data: data });

test('untracked variations report unknown stock, not zero', () => {
  assert.equal(resolveStockLevel(variation({}), new Map(), LOC), undefined);
});

test('tracked variation with a count reports that count', () => {
  assert.equal(
    resolveStockLevel(variation({ track_inventory: true }), new Map([['VAR1', 7]]), LOC), 7);
});

test('tracked variation with no count row is out of stock', () => {
  assert.equal(
    resolveStockLevel(variation({ track_inventory: true }), new Map(), LOC), 0);
});

test('sold_out override beats a positive tracked count', () => {
  assert.equal(resolveStockLevel(variation({
    track_inventory: true,
    location_overrides: [{ location_id: LOC, sold_out: true }],
  }), new Map([['VAR1', 12]]), LOC), 0);
});

test('sold_out at a different location is ignored', () => {
  assert.equal(resolveStockLevel(variation({
    track_inventory: true,
    location_overrides: [{ location_id: 'OTHER', sold_out: true }],
  }), new Map([['VAR1', 12]]), LOC), 12);
});

test('a location override can turn tracking off', () => {
  assert.equal(resolveStockLevel(variation({
    track_inventory: true,
    location_overrides: [{ location_id: LOC, track_inventory: false }],
  }), new Map([['VAR1', 12]]), LOC), undefined);
});

test('a location override can turn tracking on', () => {
  assert.equal(resolveStockLevel(variation({
    track_inventory: false,
    location_overrides: [{ location_id: LOC, track_inventory: true }],
  }), new Map([['VAR1', 3]]), LOC), 3);
});

test('tracksInventory defaults to false', () => {
  assert.equal(tracksInventory(undefined, LOC), false);
  assert.equal(tracksInventory({}, LOC), false);
});

test('quantities floor to whole sellable units', () => {
  assert.equal(parseInventoryQuantity('4.9'), 4);
  assert.equal(parseInventoryQuantity('0'), 0);
  assert.equal(parseInventoryQuantity('-3'), 0);
  assert.equal(parseInventoryQuantity(null), 0);
  assert.equal(parseInventoryQuantity('not-a-number'), null);
});

test('chunk splits without dropping or duplicating', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 2), []);
  assert.deepEqual(chunk([1, 2], 5), [[1, 2]]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workers && npx --node-options=--experimental-vm-modules node --test test/inventory.test.js`
Expected: FAIL — `Cannot find module '../src/inventory.js'`

- [ ] **Step 3: Write the implementation**

Create `workers/src/inventory.js`:

```javascript
/**
 * Inventory counts and stock resolution.
 *
 * Square's catalog does not carry stock levels; only the Inventory API does.
 * Availability was previously inferred from `inventory_alert_type`, which is a
 * low-stock alert threshold, not "out of stock" — so zero-count items stayed
 * purchasable.
 */

const BATCH_SIZE = 500;

export function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Square reports quantities as decimal strings; we sell whole units only. */
export function parseInventoryQuantity(quantity) {
  const parsed = Number.parseFloat(quantity ?? '0');
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

function overrideFor(variationData, locationId) {
  return variationData?.location_overrides?.find((o) => o.location_id === locationId);
}

/** A per-location override wins over the variation-level default. */
export function tracksInventory(variationData, locationId) {
  const o = overrideFor(variationData, locationId);
  if (o?.track_inventory !== undefined && o.track_inventory !== null) return o.track_inventory;
  return Boolean(variationData?.track_inventory);
}

export function isSoldOutAtLocation(variationData, locationId) {
  return Boolean(overrideFor(variationData, locationId)?.sold_out);
}

/**
 * Three-way, and the distinction matters:
 *   0         - definitely out of stock, block the sale
 *   a number  - tracked count, gate on it
 *   undefined - Square isn't tracking this variation, leave it unconstrained
 */
export function resolveStockLevel(variation, stockLevels, locationId) {
  const data = variation?.item_variation_data;
  if (isSoldOutAtLocation(data, locationId)) return 0;
  if (!tracksInventory(data, locationId)) return undefined;
  return stockLevels.get(variation.id) ?? 0;
}

/** Current IN_STOCK counts keyed by variation id. Untracked ids simply won't appear. */
export async function fetchInventoryLevels(cfg, squareFetch, variationIds) {
  const levels = new Map();
  if (variationIds.length === 0) return levels;

  for (const ids of chunk(variationIds, BATCH_SIZE)) {
    let cursor;
    do {
      const response = await squareFetch(cfg, '/v2/inventory/counts/batch-retrieve', {
        method: 'POST',
        body: JSON.stringify({
          catalog_object_ids: ids,
          location_ids: [cfg.locationId],
          states: ['IN_STOCK'],
          ...(cursor ? { cursor } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`Inventory fetch failed: ${JSON.stringify(data.errors || data)}`);

      for (const count of data.counts ?? []) {
        if (!count.catalog_object_id) continue;
        const qty = parseInventoryQuantity(count.quantity);
        if (qty === null) continue;
        levels.set(count.catalog_object_id, (levels.get(count.catalog_object_id) ?? 0) + qty);
      }
      cursor = data.cursor;
    } while (cursor);
  }
  return levels;
}

/**
 * Inventory is advisory. If the API is unavailable we fall back to "stock
 * unknown" rather than showing an entire catalog as sold out.
 */
export async function fetchInventoryLevelsSafely(cfg, squareFetch, variationIds) {
  try {
    return await fetchInventoryLevels(cfg, squareFetch, variationIds);
  } catch (error) {
    console.error('[Inventory] fetch failed, treating stock as unknown:', error.message);
    return new Map();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workers && npm test`
Expected: PASS — 11 lib tests plus 10 inventory tests, 0 failures.

- [ ] **Step 5: Wire stock into availability in `src/square.js`**

Add the import at the top of `workers/src/square.js`:

```javascript
import { fetchInventoryLevelsSafely, resolveStockLevel } from './inventory.js';
```

Replace the existing `isItemAvailable` function with:

```javascript
function isItemAvailable(itemData, stockLevel) {
  if (stockLevel === 0) return false;
  return !itemData.is_deleted && itemData.available_online !== false;
}
```

The `inventory_alert_type` check is deliberately gone — it was a low-stock
alert being misread as an out-of-stock signal, and real counts now replace it.

- [ ] **Step 6: Use it in `handleGetProducts`**

In `handleGetProducts`, after `const [categories, images, items] = await Promise.all([...])`, add:

```javascript
    const variationIds = items
      .map((item) => item.item_data?.variations?.[0]?.id)
      .filter(Boolean);
    const stockLevels = await fetchInventoryLevelsSafely(cfg, squareFetch, variationIds);
```

Then in the `items.map(...)` callback, replace the `available:` line with:

```javascript
        available: isItemAvailable(itemData, resolveStockLevel(variation, stockLevels, cfg.locationId)),
```

- [ ] **Step 7: Use it in `handleGetProduct`**

In `handleGetProduct`, after `const itemData = item.item_data;`, add:

```javascript
    const variationIds = (itemData.variations || []).map((v) => v.id);
    const stockLevels = await fetchInventoryLevelsSafely(cfg, squareFetch, variationIds);
```

Change the `variations` mapping so each entry reports real stock:

```javascript
    const variations = (itemData.variations || []).map((v) => ({
      id: v.id,
      name: v.item_variation_data?.name || 'Default',
      sku: v.item_variation_data?.sku || null,
      price: (v.item_variation_data?.price_money?.amount || 0) / 100,
      available: resolveStockLevel(v, stockLevels, cfg.locationId) !== 0,
    }));
```

And replace the product's `available:` line with:

```javascript
      available: isItemAvailable(itemData,
        resolveStockLevel(itemData.variations?.[0] ?? {}, stockLevels, cfg.locationId)),
```

- [ ] **Step 8: Verify against sandbox**

```bash
cd workers && npm run deploy:sandbox
S=https://hsecommerce-api-sandbox.dennis-544.workers.dev/api
curl -s $S/square-products | python3 -c "import json,sys; d=json.load(sys.stdin); [print(p['name'], p['available']) for p in d['products'][:6]]"
```

Expected: products appear with `available` true. "Charm bracelets" is the only
tracked item (stock 10) so it stays true; set its Square stock to 0 and re-run
to see it flip to false. Untracked items stay true throughout.

- [ ] **Step 9: Document it in `workers/README.md`**

Add before the `## Deploy` heading:

```markdown
## Inventory and out-of-stock

Out-of-stock only works for items with **inventory tracking enabled in Square**
(Items → the item → Manage stock). Untracked items are always purchasable —
that is deliberate, so enabling this feature cannot take a whole catalog
offline.

Stock resolves three ways:

- **0** — out of stock. Add to Cart is disabled and the product shows "Out of
  Stock". The product stays visible and can still be favourited.
- **a number** — tracked count, the sale is gated on it.
- **unknown** — Square is not tracking this variation, so it stays purchasable.

If the Square Inventory API is unavailable the Worker treats stock as unknown
rather than marking everything sold out. That fails toward selling rather than
toward an empty-looking store; a sustained outage could oversell.
```

- [ ] **Step 10: Commit**

```bash
git add workers/src/inventory.js workers/test/inventory.test.js workers/src/square.js workers/README.md
git commit -m "Gate availability on real Square inventory counts

Availability was inferred from inventory_alert_type, which is a low-stock
alert threshold rather than an out-of-stock signal, so a variation at
quantity zero stayed purchasable. Neither codebase ever called the
Inventory API.

Stock now resolves three ways: 0 blocks the sale, a number gates it, and
undefined means Square is not tracking that variation so it stays
unconstrained. Per-location sold_out and track_inventory overrides win
over the variation-level flags.

Inventory is advisory: an API failure falls back to stock-unknown rather
than rendering the catalog sold out.

No theme changes needed - the out-of-stock UI already exists and only its
data was wrong."
```

---

### Task 2: Kansas-only sales tax

**Files:**
- Create: `workers/src/pricing.js`
- Create: `workers/test/pricing.test.js`
- Modify: `workers/src/square.js` (`handleCalculateOrder`, `handleProcessPayment`)
- Modify: `workers/wrangler.toml`
- Modify: `hubspot-theme/src/theme/rainy-day-merch/components/islands/OrderConfirmationIsland.jsx:134`
- Modify: `workers/README.md`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `shouldApplyKansasTax(state: string|undefined) -> boolean`
  - `buildOrderTaxes(env, state) -> Array<{catalog_object_id: string, scope: 'ORDER'}>`

- [ ] **Step 1: Write the failing test**

Create `workers/test/pricing.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderTaxes, shouldApplyKansasTax } from '../src/pricing.js';

const env = { SQUARE_KS_TAX_ID: 'TAX123' };

test('Kansas is taxed regardless of case or padding', () => {
  for (const s of ['KS', 'ks', 'Ks', ' KS ', '  ks']) {
    assert.equal(shouldApplyKansasTax(s), true, `expected ${JSON.stringify(s)} to be taxed`);
  }
});

test('other states are not taxed', () => {
  for (const s of ['NY', 'CA', 'MO', 'KANSAS', 'K', '']) {
    assert.equal(shouldApplyKansasTax(s), false, `expected ${JSON.stringify(s)} not to be taxed`);
  }
});

test('a missing state is not taxed', () => {
  assert.equal(shouldApplyKansasTax(undefined), false);
  assert.equal(shouldApplyKansasTax(null), false);
});

test('buildOrderTaxes attaches the configured tax for Kansas', () => {
  assert.deepEqual(buildOrderTaxes(env, 'KS'),
    [{ catalog_object_id: 'TAX123', scope: 'ORDER' }]);
});

test('buildOrderTaxes attaches nothing out of state', () => {
  assert.deepEqual(buildOrderTaxes(env, 'NY'), []);
});

test('buildOrderTaxes attaches nothing when no tax is configured', () => {
  assert.deepEqual(buildOrderTaxes({}, 'KS'), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workers && npm test`
Expected: FAIL — `Cannot find module '../src/pricing.js'`

- [ ] **Step 3: Write the implementation**

Create `workers/src/pricing.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workers && npm test`
Expected: PASS — all suites green.

- [ ] **Step 5: Add the config var**

In `workers/wrangler.toml`, add to `[vars]`:

```toml
SQUARE_KS_TAX_ID = "DBZ6Y7OTBOC3ZHUYFIUJJEJP"
```

and to `[env.sandbox.vars]`:

```toml
SQUARE_KS_TAX_ID = "DBZ6Y7OTBOC3ZHUYFIUJJEJP"
```

The top-level value is a placeholder until the production tax object exists;
production must use the real combined state-plus-local rate.

- [ ] **Step 6: Apply tax in `handleCalculateOrder`**

Add to the imports in `workers/src/square.js`:

```javascript
import { buildOrderTaxes } from './pricing.js';
```

`handleCalculateOrder` does **not** currently destructure `shippingAddress` —
it was dropped during the port from Vercel. At `src/square.js:288`, change:

```javascript
    const { cartItems, squareApplicationId, squareLocationId } = body;
```

to:

```javascript
    const { cartItems, shippingAddress, squareApplicationId, squareLocationId } = body;
```

The checkout island already sends it. Then replace the
`squareFetch(cfg, '/v2/orders/calculate', ...)` call and the comment above it
with:

```javascript
    const taxes = buildOrderTaxes(env, shippingAddress?.state);

    const response = await squareFetch(cfg, '/v2/orders/calculate', {
      method: 'POST',
      body: JSON.stringify({
        order: {
          location_id: cfg.locationId,
          line_items: lineItems,
          ...(taxes.length ? { taxes } : {}),
        },
      }),
    });
```

- [ ] **Step 7: Apply the same tax in `handleProcessPayment`**

In `handleProcessPayment`, replace the order-creation body:

```javascript
    const taxes = buildOrderTaxes(env, billingDetails?.state);

    const orderResponse = await squareFetch(cfg, '/v2/orders', {
      method: 'POST',
      body: JSON.stringify({
        order: {
          location_id: cfg.locationId,
          reference_id: orderRef,
          line_items: lineItems,
          ...(taxes.length ? { taxes } : {}),
        },
        idempotency_key: `order-${attemptKey}`,
      }),
    });
```

- [ ] **Step 8: Stop the confirmation page claiming a rate it does not know**

In `hubspot-theme/src/theme/rainy-day-merch/components/islands/OrderConfirmationIsland.jsx:134`, change:

```jsx
<span>Tax (8%)</span>
```

to:

```jsx
<span>Tax</span>
```

- [ ] **Step 9: Verify against sandbox**

```bash
cd workers && npm run deploy:sandbox
S=https://hsecommerce-api-sandbox.dennis-544.workers.dev/api
BODY='{"cartItems":[{"variationId":"H3OFQDJCCCOILEWLLJCGFTJX","quantity":1,"price":12,"name":"probe"}],"squareApplicationId":"sandbox-sq0idb-vzMCT08FEX4vNU_c0Yri6w"'
curl -s -X POST $S/calculate-order -H 'Content-Type: application/json' -d "$BODY,\"shippingAddress\":{\"state\":\"KS\"}}"
curl -s -X POST $S/calculate-order -H 'Content-Type: application/json' -d "$BODY,\"shippingAddress\":{\"state\":\"NY\"}}"
```

Expected: KS returns `tax: 0.78, total: 12.78`. NY returns `tax: 0, total: 12`.

- [ ] **Step 10: Document it in `workers/README.md`**

Add before the `## Deploy` heading:

```markdown
## Sales tax

Kansas buyers are charged Kansas sales tax. Buyers in other states are charged
nothing, because sales tax is only owed elsewhere once an economic nexus
threshold is crossed there — commonly $100,000 in gross revenue or 200
transactions annually in that state.

**The rate lives in Square.** It is a catalog tax object; edit its percentage in
the Square Dashboard under Items & Orders → Settings → Sales taxes. No deploy
needed. Use the real combined state-plus-local rate for the shop's location, not
the 6.5% Kansas state rate on its own.

**The condition lives in code** — `shouldApplyKansasTax()` in
`src/pricing.js` — because who owes tax is a legal rule, not a setting. When
the shop approaches a nexus threshold in another state, that function becomes a
list of states rather than a single check.

Shipping is taxable in Kansas, so the shipping service charge is marked
`taxable: true` and is included in the taxed subtotal.

An unrecognised or missing state is treated as out-of-state and not taxed. That
undercharges rather than charging tax that was never owed.
```

- [ ] **Step 11: Commit**

```bash
git add workers/src/pricing.js workers/test/pricing.test.js workers/src/square.js \
  workers/wrangler.toml workers/README.md \
  hubspot-theme/src/theme/rainy-day-merch/components/islands/OrderConfirmationIsland.jsx
git commit -m "Charge Kansas sales tax to Kansas buyers

No tax was charged at all: the code reports whatever Square prices, and
no tax rule existed. Meanwhile the confirmation page hardcoded a Tax (8%)
label beside a value that was always \$0.00.

The rate lives in a Square catalog tax object so the owner can change it
without a deploy. The condition lives in code because who owes tax is a
legal rule rather than a setting - Kansas buyers are taxed, everyone else
is not until a nexus threshold is crossed in their state.

calculate-order and process-payment call the same buildOrderTaxes()
function. If they ever disagreed the price-mismatch guard would 409 and
checkout would break, so this must never become two copies."
```

---

### Task 3: Optional shipping fee

**Files:**
- Modify: `workers/src/pricing.js`
- Modify: `workers/test/pricing.test.js`
- Modify: `workers/src/square.js` (`handleCalculateOrder`, `handleProcessPayment`, `handleGetProducts`)
- Modify: `workers/wrangler.toml`
- Modify: `workers/README.md`

**Interfaces:**
- Consumes: `buildOrderTaxes` from Task 2.
- Produces:
  - `buildServiceCharges(cents: number|null) -> Array<object>`
  - `fetchShippingCents(cfg, squareFetch, env) -> Promise<number|null>`

Catalog `SERVICE_CHARGE` objects do not exist in Square 2024-12-18. The fee is
the price of a normal catalog item, read server-side and applied as an ad-hoc
order service charge in `SUBTOTAL_PHASE` with `taxable: true`.

- [ ] **Step 1: Write the failing test**

Append to `workers/test/pricing.test.js`:

```javascript
import { buildServiceCharges } from '../src/pricing.js';

test('no shipping configured means free shipping', () => {
  assert.deepEqual(buildServiceCharges(null), []);
  assert.deepEqual(buildServiceCharges(undefined), []);
});

test('zero shipping is also free, with no empty charge attached', () => {
  assert.deepEqual(buildServiceCharges(0), []);
});

test('a configured fee becomes a taxable subtotal-phase service charge', () => {
  assert.deepEqual(buildServiceCharges(500), [{
    name: 'Shipping',
    amount_money: { amount: 500, currency: 'USD' },
    calculation_phase: 'SUBTOTAL_PHASE',
    taxable: true,
  }]);
});

test('a negative fee is refused rather than credited', () => {
  assert.deepEqual(buildServiceCharges(-100), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workers && npm test`
Expected: FAIL — `buildServiceCharges is not a function`

- [ ] **Step 3: Write the implementation**

Append to `workers/src/pricing.js`:

```javascript
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
 * Returns null when unconfigured or unreadable, which means free shipping —
 * a misconfiguration undercharges rather than stranding a customer at checkout.
 */
export async function fetchShippingCents(cfg, squareFetch, env) {
  const id = env.SQUARE_SHIPPING_VARIATION_ID;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workers && npm test`
Expected: PASS.

- [ ] **Step 5: Add the config var**

In `workers/wrangler.toml`, add to both `[vars]` and `[env.sandbox.vars]`:

```toml
SQUARE_SHIPPING_VARIATION_ID = "FTI6NZQXSUZ5CVNBDDL45ALJ"
```

Leave it empty (`""`) in any environment where shipping should be free.

- [ ] **Step 6: Apply shipping in both order paths**

Update the import in `workers/src/square.js`:

```javascript
import { buildOrderTaxes, buildServiceCharges, fetchShippingCents } from './pricing.js';
```

In `handleCalculateOrder`, before building the request:

```javascript
    const taxes = buildOrderTaxes(env, shippingAddress?.state);
    const serviceCharges = buildServiceCharges(await fetchShippingCents(cfg, squareFetch, env));
```

and include it in the order object:

```javascript
        order: {
          location_id: cfg.locationId,
          line_items: lineItems,
          ...(taxes.length ? { taxes } : {}),
          ...(serviceCharges.length ? { service_charges: serviceCharges } : {}),
        },
```

Make the identical change in `handleProcessPayment`, reading the state from
`billingDetails?.state`.

- [ ] **Step 7: Hide the shipping item from the storefront**

`available_online: false` does not persist through the Catalog API, so the
shipping item would otherwise appear in the product grid as a purchasable
product. In `handleGetProducts`, immediately after the `items` array is
available, add:

```javascript
    const shippingVariationId = env.SQUARE_SHIPPING_VARIATION_ID;
    const sellableItems = shippingVariationId
      ? items.filter((item) => item.item_data?.variations?.[0]?.id !== shippingVariationId)
      : items;
```

Then use `sellableItems` everywhere `items` was used in the rest of that
function — the `variationIds` collection from Task 1 and the `products` map.

- [ ] **Step 8: Verify against sandbox**

```bash
cd workers && npm run deploy:sandbox
S=https://hsecommerce-api-sandbox.dennis-544.workers.dev/api
BODY='{"cartItems":[{"variationId":"H3OFQDJCCCOILEWLLJCGFTJX","quantity":1,"price":12,"name":"probe"}],"squareApplicationId":"sandbox-sq0idb-vzMCT08FEX4vNU_c0Yri6w"'
curl -s -X POST $S/calculate-order -H 'Content-Type: application/json' -d "$BODY,\"shippingAddress\":{\"state\":\"KS\"}}"
curl -s $S/square-products | python3 -c "import json,sys; d=json.load(sys.stdin); print('Shipping listed as a product:', any(p['name']=='Shipping' for p in d['products']))"
```

Expected: KS order totals `18.10` (item $12 + shipping $5 + 6.5% tax $1.10),
matching the sandbox matrix already verified. The product listing must print
`False`.

- [ ] **Step 9: Document it in `workers/README.md`**

Add after the Sales tax section:

```markdown
## Shipping

A flat fee applied to every order. **The amount is the price of a catalog item
called `Shipping`** — edit that price in Square Items to change what customers
pay. No deploy needed.

If no shipping item is configured, **shipping is free**. That makes the feature
safe to enable before a fee has been decided, and means a misconfiguration
undercharges rather than stranding a customer at checkout.

Square API 2024-12-18 has no catalog service-charge object, which is why the fee
lives on an item price and is applied as an ad-hoc order service charge. The
charge is `SUBTOTAL_PHASE` and `taxable: true` so it falls inside the taxed
subtotal — correct for Kansas, where shipping is taxable. Square rejects a
taxable charge in `TOTAL_PHASE`.

The shipping item is excluded from `/api/square-products` by variation ID.
Without that it appears in the storefront as a purchasable product;
`available_online: false` does not persist through the Catalog API.

There is no free-shipping threshold and no local-pickup option. Both are
straightforward to add and neither has been asked for.
```

- [ ] **Step 10: Commit**

```bash
git add workers/src/pricing.js workers/test/pricing.test.js workers/src/square.js \
  workers/wrangler.toml workers/README.md
git commit -m "Charge a flat shipping fee, defaulting to free when unconfigured

Items sell for \$5-\$12, so unpriced shipping erased the margin.

Catalog SERVICE_CHARGE objects do not exist in Square 2024-12-18, so the
fee is the price of a dedicated Shipping catalog item that the owner edits
in Square, read server-side and applied as an ad-hoc order service charge.
SUBTOTAL_PHASE and taxable, because shipping is taxable in Kansas and
Square rejects a taxable charge in TOTAL_PHASE.

An unconfigured or unreadable fee means free shipping, so this is safe to
deploy before a fee has been chosen and a misconfiguration undercharges
rather than breaking checkout.

The shipping item is excluded from the product listing by id -
available_online: false does not persist through the Catalog API."
```

---

### Task 4: Shipping address on the Square order

**Files:**
- Modify: `workers/src/square.js` (`handleProcessPayment`)
- Modify: `hubspot-theme/src/theme/rainy-day-merch/components/islands/CheckoutPaymentIsland.jsx`
- Modify: `workers/README.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: orders carrying `fulfillments[].shipment_details.recipient`, which Task 5 reads for the deal's `shipping_address`.

- [ ] **Step 1: Forward the missing fields from the theme**

`process-payment` receives `billingDetails` with only `address1`, `city`,
`state`, `zipCode`, `country`. The recipient also needs name and phone, which
are already in `shippingInfo` and simply not sent.

In `CheckoutPaymentIsland.jsx`, in the `body: JSON.stringify({...})` for the
`process-payment` call, extend `billingDetails`:

```javascript
            billingDetails: {
              firstName: checkoutData.shippingInfo.firstName,
              lastName: checkoutData.shippingInfo.lastName,
              phone: checkoutData.shippingInfo.phone,
              address1: checkoutData.shippingInfo.address,
              city: checkoutData.shippingInfo.city,
              state: checkoutData.shippingInfo.state,
              zipCode: checkoutData.shippingInfo.zipCode,
              country: 'US',
            },
```

- [ ] **Step 2: Attach a fulfillment to the order**

In `handleProcessPayment` in `workers/src/square.js`, immediately before the
`/v2/orders` call, build the fulfillment:

```javascript
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
```

and include it in the order object alongside `taxes` and `service_charges`:

```javascript
          ...(fulfillments.length ? { fulfillments } : {}),
```

- [ ] **Step 3: Verify against sandbox**

Complete a checkout on the staging storefront, then:

```bash
/usr/bin/python3 - <<'PY'
import json, os, urllib.request
T=os.environ['SQUARE_TOKEN']    # export SQUARE_TOKEN=<sandbox access token>
H={'Square-Version':'2024-12-18','Authorization':f'Bearer {T}','Content-Type':'application/json'}
r=urllib.request.Request('https://connect.squareupsandbox.com/v2/orders/search',
    data=json.dumps({'location_ids':['L63B6R6N6VHHM'],'limit':1}).encode(),headers=H,method='POST')
o=json.load(urllib.request.urlopen(r))['orders'][0]
print(json.dumps(o.get('fulfillments'), indent=2))
PY
```

Expected: a `SHIPMENT` fulfillment whose `recipient` carries the display name,
email, phone, and full address. Confirm the same address is visible on the order
in the Square sandbox Dashboard.

- [ ] **Step 4: Document it in `workers/README.md`**

Add to the shipping section:

```markdown
### Why orders carry a fulfillment

The shipping address is attached to the order as a `SHIPMENT` fulfillment with
a recipient. Without it the address exists only as `billing_address` on the
payment, and the Square Dashboard's Orders tab shows no destination — which is
why the shop owner could not see where anything shipped.
```

- [ ] **Step 5: Commit**

```bash
git add workers/src/square.js workers/README.md \
  hubspot-theme/src/theme/rainy-day-merch/components/islands/CheckoutPaymentIsland.jsx
git commit -m "Attach the shipping address to the Square order

The address was set as billing_address on the payment and never on the
order, so Square's Orders tab showed no destination and the shop owner
could not tell where anything was going.

Orders now carry a SHIPMENT fulfillment with a recipient - name, email,
phone, and address - which Square's own UI displays. The checkout island
forwards firstName, lastName, and phone, which it already collected and
simply was not sending."
```

---

### Task 5: Server-side deal creation with structured properties

**Files:**
- Modify: `workers/src/hubspot.js`
- Create: `workers/test/orders.test.js`
- Modify: `workers/src/square.js` (`handleProcessPayment`)
- Modify: `workers/src/index.js` (pass `ctx` through)
- Modify: `hubspot-theme/src/theme/rainy-day-merch/components/islands/CheckoutPaymentIsland.jsx`
- Modify: `workers/wrangler.toml`
- Modify: `workers/README.md`

**Interfaces:**
- Consumes: the Square order object from Task 4, including `fulfillments`.
- Produces:
  - `formatOrderItems(lineItems) -> string`
  - `formatShippingAddress(recipient) -> string`
  - `createOrderDeal(env, { email, firstName, lastName, phone, order, payment }) -> Promise<{dealId: string}>`

- [ ] **Step 1: Write the failing test**

Create `workers/test/orders.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderItems, formatShippingAddress } from '../src/hubspot.js';

test('order items render one readable line each', () => {
  const lineItems = [
    { name: 'Charm bracelets', quantity: '2', total_money: { amount: 2400 } },
    { name: 'Small earrings', quantity: '1', total_money: { amount: 500 } },
  ];
  assert.equal(formatOrderItems(lineItems),
    'Charm bracelets x2 - $24.00\nSmall earrings x1 - $5.00');
});

test('order items handle an empty or missing list', () => {
  assert.equal(formatOrderItems([]), '');
  assert.equal(formatOrderItems(undefined), '');
});

test('an item with no total renders as $0.00 rather than undefined', () => {
  assert.equal(formatOrderItems([{ name: 'Mystery', quantity: '1' }]), 'Mystery x1 - $0.00');
});

test('shipping address renders as a mailing label', () => {
  const recipient = {
    display_name: 'Dennis Edson',
    phone_number: '6467894233',
    address: {
      address_line_1: '20 S Cedar St',
      locality: 'Beacon',
      administrative_district_level_1: 'NY',
      postal_code: '12508',
    },
  };
  assert.equal(formatShippingAddress(recipient),
    'Dennis Edson\n20 S Cedar St\nBeacon, NY 12508\n6467894233');
});

test('shipping address omits missing parts without leaving stray punctuation', () => {
  assert.equal(formatShippingAddress({
    display_name: 'Jane', address: { address_line_1: '1 Main St' },
  }), 'Jane\n1 Main St');
});

test('a missing recipient renders empty', () => {
  assert.equal(formatShippingAddress(undefined), '');
  assert.equal(formatShippingAddress({}), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workers && npm test`
Expected: FAIL — `formatOrderItems is not a function`

- [ ] **Step 3: Write the formatters and the deal creator**

Append to `workers/src/hubspot.js`:

```javascript
function money(cents) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

/** One readable line per item, for the deal's order_items property. */
export function formatOrderItems(lineItems) {
  return (lineItems ?? [])
    .map((li) => `${li.name ?? 'Item'} x${li.quantity ?? '1'} - ${money(li.total_money?.amount)}`)
    .join('\n');
}

/** A mailing label, for the deal's shipping_address property. */
export function formatShippingAddress(recipient) {
  if (!recipient) return '';
  const a = recipient.address ?? {};
  const cityLine = [a.locality, [a.administrative_district_level_1, a.postal_code]
    .filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [recipient.display_name, a.address_line_1, a.address_line_2, cityLine,
    recipient.phone_number].filter(Boolean).join('\n');
}

/**
 * Creates the contact and deal for a completed order.
 *
 * The customer's identity and location go on the CONTACT using HubSpot's
 * standard fields; order-specific data goes on the DEAL. The address is stored
 * in both places deliberately - the contact holds where a person currently is,
 * the deal snapshots where THIS order shipped.
 *
 * Assigning an owner is what triggers the shop owner's HubSpot notification.
 */
export async function createOrderDeal(env, { email, firstName, lastName, phone, order, payment }) {
  const recipient = order?.fulfillments?.[0]?.shipment_details?.recipient;
  const address = recipient?.address ?? {};

  const contactId = await findOrCreateContact(env, email, {
    firstname: firstName,
    lastname: lastName,
    phone,
    address: address.address_line_1,
    city: address.locality,
    state: address.administrative_district_level_1,
    zip: address.postal_code,
  });

  const properties = {
    dealname: `Order ${order?.reference_id ?? order?.id ?? Date.now()}`,
    amount: ((order?.total_money?.amount ?? 0) / 100).toString(),
    dealstage: 'appointmentscheduled',
    pipeline: 'default',
    payment_id: payment?.id,
    order_id: order?.reference_id ?? order?.id,
    order_items: formatOrderItems(order?.line_items),
    shipping_address: formatShippingAddress(recipient),
    square_receipt_url: payment?.receipt_url,
  };
  if (env.HUBSPOT_OWNER_ID) properties.hubspot_owner_id = env.HUBSPOT_OWNER_ID;

  const deal = await hubspotFetch(env, '/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({ properties }),
  });

  await hubspotFetch(env, `/crm/v4/objects/deals/${deal.id}/associations/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify([{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]),
  });

  return { dealId: deal.id };
}
```

Also change `findOrCreateContact` so it updates an existing contact rather than
only setting properties on creation — a returning customer's address must
refresh. Replace its body with:

```javascript
async function findOrCreateContact(env, email, extraProperties = {}) {
  const clean = Object.fromEntries(
    Object.entries(extraProperties).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const existing = await findContactByEmail(env, email);
  if (existing) {
    if (Object.keys(clean).length) await updateContact(env, existing.id, clean);
    return existing.id;
  }
  const created = await createContact(env, { email: email.toLowerCase().trim(), ...clean });
  return created.id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd workers && npm test`
Expected: PASS.

- [ ] **Step 5: Call it from `handleProcessPayment`**

Add the import in `workers/src/square.js`:

```javascript
import { createOrderDeal } from './hubspot.js';
```

Change the handler signature to accept `ctx`:

```javascript
export async function handleProcessPayment(request, env, ctx) {
```

Then, after the payment succeeds and before the `return json({...})`, dispatch
the deal in the background so it never delays or fails a completed charge:

```javascript
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
```

`src/index.js` already calls `handler(request, env, ctx)`, so no router change
is needed — confirm this before moving on.

- [ ] **Step 6: Remove the client-side call**

In `CheckoutPaymentIsland.jsx`, delete the whole `// 3. Create Deal in HubSpot`
block — the `try { await fetch(`${API_BASE_URL}/create-deal`, {...}) } catch
(dealError) {...}` — and its comment. The Worker owns this now, and the
client-side version silently swallowed its own failures.

Leave the `/api/create-deal` route in place for now; nothing calls it, and
removing a public endpoint is a separate decision.

- [ ] **Step 7: Add the owner var**

In `workers/wrangler.toml`, add to `[env.sandbox.vars]`:

```toml
HUBSPOT_OWNER_ID = "11176268"
```

Leave it out of `[vars]` until the production owner ID is known — the code
omits the property when the var is unset, so an unknown owner means an
unassigned deal rather than a failed one.

- [ ] **Step 8: Verify against sandbox**

Complete a checkout on the staging storefront, then:

```bash
/usr/bin/python3 - <<'PY'
import json, os, urllib.request
T=os.environ['HUBSPOT_TOKEN']   # export HUBSPOT_TOKEN=<staging private app token>
r=urllib.request.Request('https://api.hubapi.com/crm/v3/objects/deals?limit=1&sort=-createdate'
  '&properties=dealname,amount,order_items,shipping_address,square_receipt_url,payment_id,hubspot_owner_id',
  headers={'Authorization':f'Bearer {T}'})
d=json.load(urllib.request.urlopen(r))['results'][0]
for k, v in d['properties'].items():
    if v: print(f'{k}:\n  ' + str(v).replace('\n', '\n  '))
PY
```

Expected: `order_items` lists each item on its own line, `shipping_address`
reads as a mailing label, `square_receipt_url` is a working Square link, and
`hubspot_owner_id` is `11176268`. Confirm the deal is associated to a contact
whose `address`, `city`, `state`, `zip`, and `phone` are populated.

If the deal fails to create, check `npx wrangler tail --env sandbox` for the
logged error — an invalid `HUBSPOT_OWNER_ID` is rejected by HubSpot and is the
most likely cause.

- [ ] **Step 9: Document it in `workers/README.md`**

Extend the HubSpot portal setup section:

```markdown
### Order notification

No confirmation email is sent by this code. Two things cover it:

- **The customer** gets Square's own payment receipt, sent automatically to the
  buyer email in production. Sandbox does not send email — that is a Square
  behaviour, not a defect. Confirm receipts are enabled in the Square Dashboard.
- **The shop owner** is notified by HubSpot. Deals are created with
  `hubspot_owner_id` set, and HubSpot notifies an owner when a deal is assigned
  to them. Sales Hub Starter also supports a pipeline-stage automation that
  emails on entry to the first stage. Either works; both are configured in
  HubSpot, not here.

The notification only has to say a sale happened. The detail lives on the
records: `order_items`, `shipping_address`, and `square_receipt_url` on the
deal, and the customer's address and phone on the associated contact.

Deals are created server-side in `process-payment` via `ctx.waitUntil()`, so a
closed browser cannot lose one and a HubSpot outage cannot fail a charge that
already succeeded. Failures are logged; look for `[Order]` in `wrangler tail`.

Set `HUBSPOT_OWNER_ID` per environment in `wrangler.toml`. If it is unset the
deal is still created, just unassigned — and nobody is notified.
```

- [ ] **Step 10: Commit**

```bash
git add workers/src/hubspot.js workers/test/orders.test.js workers/src/square.js \
  workers/wrangler.toml workers/README.md \
  hubspot-theme/src/theme/rainy-day-merch/components/islands/CheckoutPaymentIsland.jsx
git commit -m "Create the HubSpot deal server-side with structured order data

create-deal was called from the browser after payment and wrapped in a
try/catch that swallowed failures, so a closed browser meant no deal and
therefore no notification to the shop owner. The deal also carried only a
name and an amount - no items, no address - so a notification built on it
would say almost nothing.

Deals are now created inside process-payment via ctx.waitUntil(), which
cannot be lost to a closed browser and cannot fail a charge that already
succeeded. They carry order_items, shipping_address, and
square_receipt_url, and are assigned to an owner, which is what triggers
HubSpot's own notification.

The customer's address and phone go on the contact using HubSpot's
standard fields, and a returning customer's details are refreshed rather
than only set at creation."
```

---

## After all tasks

Repeat the configuration in production, in this order:

1. Create the Kansas tax object in the production Square Dashboard, at the real
   combined state-plus-local rate. Set `SQUARE_KS_TAX_ID` in `[vars]`.
2. Create the `Shipping` item in production Square once Dani has chosen a fee.
   Set `SQUARE_SHIPPING_VARIATION_ID`. Leaving it empty keeps shipping free.
3. Create the three custom deal properties on the production portal:
   `order_items` (textarea), `shipping_address` (textarea),
   `square_receipt_url` (text).
4. Set `HUBSPOT_OWNER_ID` in `[vars]` to Dani's production owner ID.
5. Confirm Square receipts are enabled in the production Dashboard.
6. Have Dani configure her HubSpot notification — deal assignment or
   pipeline-stage automation.

Only then merge `dev` into `mom`, which is the Cloudflare cutover. `ROLLBACK.md`
covers reverting it.
