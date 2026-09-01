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
 *   undefined - Square isn't tracking this variation, leave it unconstrained
 */
export function resolveStockLevel(variation, stockLevels, locationId) {
  const data = variation?.item_variation_data;
  if (isSoldOutAtLocation(data, locationId)) return 0;
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
 * Inventory is advisory. If the API is unavailable we fall back to "stock
 * unknown" rather than showing an entire catalog as sold out.
 */
export async function fetchInventoryLevelsSafely(cfg, variationIds) {
  try {
    return await fetchInventoryLevels(cfg, variationIds);
  } catch (error) {
    console.error('[Inventory] fetch failed, treating stock as unknown:', error.message);
    return new Map();
  }
}
