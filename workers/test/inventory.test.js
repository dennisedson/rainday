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
