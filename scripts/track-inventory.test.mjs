// Run with: node --test scripts/track-inventory.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, planRows, readPlan, toCsv, withTrackingOn } from './track-inventory.mjs';

const LOC = 'LOC1';
const item = (name, variations, extra = {}) => ({ type: 'ITEM', id: `I_${name}`, ...extra, item_data: { name, variations } });
const variation = (id, data = {}) => ({ type: 'ITEM_VARIATION', id, version: 7, item_variation_data: { name: 'Regular', ...data } });

test('only untracked variations are planned, each starting at a count of 1', () => {
  const rows = planRows([
    item('Silver Stardust Bracelet', [variation('V_TRACKED', { track_inventory: true })]),
    item('Hidden Treasure Earrings', [variation('V_UNTRACKED')]),
  ], LOC);
  assert.deepEqual(rows, [{
    variation_id: 'V_UNTRACKED', item: 'Hidden Treasure Earrings', variation: 'Regular',
    current_count: '', count: '1', track: 'yes',
  }]);
});

test('a location override that switches tracking off makes the variation untracked there', () => {
  const rows = planRows([item('Keychain', [variation('V1', {
    track_inventory: true, location_overrides: [{ location_id: LOC, track_inventory: false }],
  })])], LOC);
  assert.equal(rows.length, 1);
});

test('the Shipping item and deleted items are left out', () => {
  const rows = planRows([
    item('Shipping', [variation('V_SHIP')]),
    item('Old necklace', [variation('V_OLD')], { is_deleted: true }),
  ], LOC);
  assert.deepEqual(rows, []);
});

test('the current count is shown when Square has one', () => {
  const rows = planRows([item('Keychain', [variation('V1')])], LOC, new Map([['V1', 3]]));
  assert.equal(rows[0].current_count, '3');
});

test('the spreadsheet survives commas and quotes in product names', () => {
  const rows = [{ variation_id: 'V1', item: 'Coffee, "Cream" & Sugar', variation: 'Regular', current_count: '', count: '2', track: 'yes' }];
  const parsed = parseCsv(toCsv(rows));
  assert.equal(parsed[0].item, 'Coffee, "Cream" & Sugar');
  assert.equal(parsed[0].count, '2');
});

test('a spreadsheet saved by Excel, with a byte-order mark and Windows line endings, still reads', () => {
  const parsed = parseCsv('﻿variation_id,item,variation,current_count,count,track\r\nV1,Keychain,Regular,,1,yes\r\n');
  assert.deepEqual(parsed, [{ variation_id: 'V1', item: 'Keychain', variation: 'Regular', current_count: '', count: '1', track: 'yes' }]);
});

test('track "no" rows are skipped, and the rest come back with numeric counts', () => {
  const { toTrack, skipped } = readPlan([
    { variation_id: 'V1', item: 'Bracelet', count: '1', track: 'yes' },
    { variation_id: 'V2', item: 'Made to order', count: '1', track: 'no' },
    { variation_id: 'V3', item: 'Earrings', count: '4', track: 'YES' },
  ]);
  assert.equal(skipped, 1);
  assert.deepEqual(toTrack, [
    { variationId: 'V1', item: 'Bracelet', count: 1 },
    { variationId: 'V3', item: 'Earrings', count: 4 },
  ]);
});

test('mistakes are all reported at once and nothing is returned to apply', () => {
  assert.throws(() => readPlan([
    { variation_id: 'V1', item: 'Bracelet', count: 'one', track: 'yes' },
    { variation_id: 'V2', item: 'Earrings', count: '-1', track: 'yes' },
    { variation_id: 'V3', item: 'Necklace', count: '1', track: 'maybe' },
    { variation_id: '', item: 'Mystery', count: '1', track: 'yes' },
  ]), (error) => {
    for (const fragment of ['"one"', '"-1"', '"maybe"', 'no variation_id', 'nothing was changed']) {
      assert.ok(error.message.includes(fragment), fragment);
    }
    return true;
  });
});

test('a variation listed twice is refused', () => {
  assert.throws(() => readPlan([
    { variation_id: 'V1', item: 'Bracelet', count: '1', track: 'yes' },
    { variation_id: 'V1', item: 'Bracelet', count: '2', track: 'yes' },
  ]), /listed twice/);
});

test('switching tracking on also flips an override that turned it off, and keeps the version', () => {
  const original = variation('V1', {
    track_inventory: false,
    location_overrides: [{ location_id: LOC, track_inventory: false }, { location_id: 'OTHER', track_inventory: false }],
  });
  const updated = withTrackingOn(original, LOC);
  assert.equal(updated.item_variation_data.track_inventory, true);
  assert.equal(updated.item_variation_data.location_overrides[0].track_inventory, true);
  assert.equal(updated.item_variation_data.location_overrides[1].track_inventory, false);
  assert.equal(updated.version, 7);
  assert.equal(original.item_variation_data.track_inventory, false, 'the original is not modified');
});
