/**
 * Inventory counts and stock resolution.
 *
 * Square's catalog does not carry stock levels; only the Inventory API does.
 * Availability was previously inferred from `inventory_alert_type`, which is a
 * low-stock alert threshold, not "out of stock" — so zero-count items stayed
 * purchasable.
 */

import { squareFetch } from './square-client.js';

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
 *   undefined - Square isn't tracking this variation (or the Inventory API
 *               call failed), leave it unconstrained
 *
 * `stockLevels === null` signals an Inventory API failure rather than a
 * legitimate empty result (nothing tracked). It must not be confused with a
 * tracked variation whose count row is simply missing, which is why the null
 * check runs before the tracking check but after `sold_out` — a catalog-level
 * override is real regardless of whether the Inventory API is reachable.
 */
export function resolveStockLevel(variation, stockLevels, locationId) {
  const data = variation?.item_variation_data;
  if (isSoldOutAtLocation(data, locationId)) return 0;
  if (stockLevels === null) return undefined;
  if (!tracksInventory(data, locationId)) return undefined;
  return stockLevels.get(variation.id) ?? 0;
}

/** Current IN_STOCK counts keyed by variation id. Untracked ids simply won't appear. */
export async function fetchInventoryLevels(cfg, variationIds) {
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
 * Inventory is advisory. If the API is unavailable we return `null` rather
 * than an empty Map, so callers (via `resolveStockLevel`) can tell "the API
 * failed" apart from "the API succeeded and nothing is tracked" — both would
 * otherwise miss on `stockLevels.get(id)` and be indistinguishable from a
 * tracked-but-zero-count variation, which would wrongly mark the whole
 * catalog sold out during an outage.
 */
export async function fetchInventoryLevelsSafely(cfg, variationIds) {
  try {
    return await fetchInventoryLevels(cfg, variationIds);
  } catch (error) {
    console.error('[Inventory] fetch failed, treating stock as unknown:', error.message);
    return null;
  }
}

/**
 * Reads the catalog variations for a cart, so stock can be resolved.
 *
 * resolveStockLevel needs `item_variation_data` — `track_inventory` and the
 * per-location overrides — to tell "untracked" apart from "tracked at zero".
 * The cart only carries ids, so the payment path has to look them up.
 *
 * Returns an empty Map on failure, which findInsufficientStock treats as
 * "cannot tell" and therefore allows.
 */
export async function fetchVariationsById(cfg, variationIds) {
  const byId = new Map();
  const unique = [...new Set(variationIds.filter(Boolean))];
  if (unique.length === 0) return byId;

  try {
    for (const ids of chunk(unique, BATCH_SIZE)) {
      const response = await squareFetch(cfg, '/v2/catalog/batch-retrieve', {
        method: 'POST',
        body: JSON.stringify({ object_ids: ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(data.errors || data));
      for (const obj of data.objects ?? []) {
        if (obj.type === 'ITEM_VARIATION') byId.set(obj.id, obj);
      }
    }
  } catch (error) {
    console.error('[Inventory] variation lookup failed, stock cannot be checked:', error.message);
    return new Map();
  }
  return byId;
}

/**
 * Returns the first cart item whose requested quantity exceeds available
 * stock, or null when every item can be fulfilled.
 *
 * Deliberately permissive: an untracked variation, an unknown stock level, or
 * a variation missing from the catalog lookup all allow the sale. Blocking
 * every checkout because Square is unreachable is worse than a rare oversell.
 */
export function findInsufficientStock(cartItems, variationsById, stockLevels, locationId) {
  for (const item of cartItems) {
    const vid = item.variationId || item.id;
    const variation = variationsById.get(vid);
    if (!variation) continue;

    const available = resolveStockLevel(variation, stockLevels, locationId);
    if (available === undefined) continue;

    const requested = Number(item.quantity);
    if (requested > available) {
      return { name: item.name || vid, requested, available };
    }
  }
  return null;
}
