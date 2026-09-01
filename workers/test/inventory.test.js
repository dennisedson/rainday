import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunk, findInsufficientStock, parseInventoryQuantity, resolveStockLevel, tracksInventory,
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

test('stockLevels === null (Inventory API failure) reports unknown stock for a tracked variation, not zero', () => {
  assert.equal(
    resolveStockLevel(variation({ track_inventory: true }), null, LOC), undefined);
});

test('stockLevels === null (Inventory API failure) reports unknown stock for an untracked variation', () => {
  assert.equal(resolveStockLevel(variation({}), null, LOC), undefined);
});

test('a sold_out override still resolves to 0 even when stockLevels is null (Inventory API failure)', () => {
  assert.equal(resolveStockLevel(variation({
    track_inventory: true,
    location_overrides: [{ location_id: LOC, sold_out: true }],
  }), null, LOC), 0);
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

const LOC2 = 'LOC1';
const tracked = { id: 'V1', item_variation_data: { track_inventory: true } };
const untracked = { id: 'V2', item_variation_data: {} };
const byId = new Map([['V1', tracked], ['V2', untracked]]);

test('an untracked item is always allowed', () => {
  const r = findInsufficientStock(
    [{ variationId: 'V2', quantity: 99, name: 'Earrings' }], byId, new Map(), LOC2);
  assert.equal(r, null);
});

test('a tracked item within stock is allowed', () => {
  const r = findInsufficientStock(
    [{ variationId: 'V1', quantity: 3, name: 'Bracelet' }], byId, new Map([['V1', 5]]), LOC2);
  assert.equal(r, null);
});

test('requesting exactly the remaining stock is allowed', () => {
  const r = findInsufficientStock(
    [{ variationId: 'V1', quantity: 5, name: 'Bracelet' }], byId, new Map([['V1', 5]]), LOC2);
  assert.equal(r, null);
});

test('requesting more than remains is blocked, and reports the shortfall', () => {
  const r = findInsufficientStock(
    [{ variationId: 'V1', quantity: 6, name: 'Bracelet' }], byId, new Map([['V1', 5]]), LOC2);
  assert.deepEqual(r, { name: 'Bracelet', requested: 6, available: 5 });
});

test('a tracked item at zero is blocked', () => {
  const r = findInsufficientStock(
    [{ variationId: 'V1', quantity: 1, name: 'Bracelet' }], byId, new Map(), LOC2);
  assert.deepEqual(r, { name: 'Bracelet', requested: 1, available: 0 });
});

test('unknown stock allows the sale — inventory is advisory', () => {
  const r = findInsufficientStock(
    [{ variationId: 'V1', quantity: 99, name: 'Bracelet' }], byId, null, LOC2);
  assert.equal(r, null);
});

test('a variation missing from the catalog lookup is allowed rather than blocked', () => {
  const r = findInsufficientStock(
    [{ variationId: 'GONE', quantity: 1, name: 'Mystery' }], byId, new Map(), LOC2);
  assert.equal(r, null);
});

test('with several items, the first insufficient one is reported', () => {
  const r = findInsufficientStock([
    { variationId: 'V2', quantity: 10, name: 'Earrings' },
    { variationId: 'V1', quantity: 4, name: 'Bracelet' },
  ], byId, new Map([['V1', 2]]), LOC2);
  assert.deepEqual(r, { name: 'Bracelet', requested: 4, available: 2 });
});

test('an item falls back to its id when it has no name', () => {
  const r = findInsufficientStock(
    [{ variationId: 'V1', quantity: 2 }], byId, new Map([['V1', 1]]), LOC2);
  assert.equal(r.name, 'V1');
});
