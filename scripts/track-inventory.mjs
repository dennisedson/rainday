#!/usr/bin/env node
/**
 * Switches on Square stock tracking for items that don't have it, each with a
 * starting count.
 *
 * On this site a tracked item with no count shows as Out of Stock, so tracking
 * is never switched on without a count. The work is two steps, so the shop
 * owner can check the counts in between:
 *
 *   1. plan    Lists every untracked item and writes a spreadsheet giving each
 *              a count of 1. Changes nothing.
 *
 *        node scripts/track-inventory.mjs plan [--out untracked-items.csv]
 *
 *      Edit the "count" column. Set "track" to "no" for anything made to order
 *      that should never sell out.
 *
 *   2. apply   Sets each count, switches tracking on, then reads both back,
 *              re-sends any count that didn't take, and reports the result.
 *
 *        node scripts/track-inventory.mjs apply untracked-items.csv
 *
 * Environment:
 *   SQUARE_ENVIRONMENT   sandbox (the default) or production
 *   SQUARE_ACCESS_TOKEN  that environment's access token
 *   SQUARE_LOCATION_ID   the location the shop sells from
 *
 * apply against production also needs --confirm-production, so a command meant
 * for sandbox can never change the live catalog.
 *
 * "Tracked" uses the Worker's own rule (workers/src/inventory.js), so the
 * script and the website always agree about which items are tracked.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { chunk, parseInventoryQuantity, tracksInventory } from '../workers/src/inventory.js';

const SQUARE_VERSION = '2024-12-18';
const CSV_COLUMNS = ['variation_id', 'item', 'variation', 'current_count', 'count', 'track'];

// --- Pure helpers (tested in scripts/track-inventory.test.mjs) --------------

/** The Shipping item prices the shipping fee; it isn't stock. */
function isShippingItem(item) {
  return item?.item_data?.name?.trim().toLowerCase() === 'shipping';
}

/** One row per sellable variation that isn't tracked at the location. */
export function planRows(items, locationId, countsById = new Map()) {
  const rows = [];
  for (const item of items) {
    if (item.is_deleted || isShippingItem(item)) continue;
    for (const variation of item.item_data?.variations ?? []) {
      if (variation.is_deleted) continue;
      if (tracksInventory(variation.item_variation_data, locationId)) continue;
      rows.push({
        variation_id: variation.id,
        item: item.item_data?.name ?? '',
        variation: variation.item_variation_data?.name ?? '',
        current_count: countsById.has(variation.id) ? String(countsById.get(variation.id)) : '',
        count: '1',
        track: 'yes',
      });
    }
  }
  return rows.sort((a, b) => a.item.localeCompare(b.item));
}

function csvField(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of rows) lines.push(CSV_COLUMNS.map((column) => csvField(row[column])).join(','));
  return `${lines.join('\n')}\n`;
}

/** A small RFC 4180 reader: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { record.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.some((value) => value !== '')) records.push(record);
      record = [];
    } else field += ch;
  }
  record.push(field);
  if (record.some((value) => value !== '')) records.push(record);
  if (records.length === 0) return [];

  const header = records[0].map((name) => name.trim().toLowerCase());
  return records.slice(1).map((values) => Object.fromEntries(header.map((name, i) => [name, (values[i] ?? '').trim()])));
}

/**
 * The rows to apply, checked. Throws with every problem listed at once, so a
 * spreadsheet with mistakes changes nothing.
 */
export function readPlan(rows) {
  const problems = [];
  const toTrack = [];
  let skipped = 0;
  rows.forEach((row, index) => {
    const line = index + 2; // the header is line 1
    if (!row.variation_id) { problems.push(`line ${line}: no variation_id`); return; }
    const track = (row.track || 'yes').toLowerCase();
    if (track === 'no') { skipped++; return; }
    if (track !== 'yes') { problems.push(`line ${line} (${row.item}): track must be yes or no, not "${row.track}"`); return; }
    if (!/^\d+$/.test(row.count ?? '')) {
      problems.push(`line ${line} (${row.item}): count must be a whole number, not "${row.count}"`);
      return;
    }
    toTrack.push({ variationId: row.variation_id, item: row.item, count: Number(row.count) });
  });
  const seen = new Set();
  for (const row of toTrack) {
    if (seen.has(row.variationId)) problems.push(`${row.item}: listed twice`);
    seen.add(row.variationId);
  }
  if (problems.length) throw new Error(`The spreadsheet has problems, so nothing was changed:\n  ${problems.join('\n  ')}`);
  return { toTrack, skipped };
}

/**
 * The variation with tracking switched on at the location. A per-location
 * override beats the variation-level flag, so an override that turns tracking
 * off must be flipped too.
 */
export function withTrackingOn(variation, locationId) {
  const copy = structuredClone(variation);
  const data = copy.item_variation_data;
  data.track_inventory = true;
  for (const override of data.location_overrides ?? []) {
    if (override.location_id === locationId && override.track_inventory === false) override.track_inventory = true;
  }
  return copy;
}

// --- Square ----------------------------------------------------------------

function config() {
  const environment = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
  if (!['sandbox', 'production'].includes(environment)) throw new Error('SQUARE_ENVIRONMENT must be sandbox or production');
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) throw new Error('Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID for that environment.');
  return {
    environment,
    token,
    locationId,
    base: environment === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com',
  };
}

async function square(cfg, path, body) {
  const response = await fetch(`${cfg.base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Square-Version': SQUARE_VERSION,
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Square ${path} failed (${response.status}): ${JSON.stringify(data.errors ?? data)}`);
  return data;
}

async function listItems(cfg) {
  const items = [];
  let cursor;
  do {
    const data = await square(cfg, `/v2/catalog/list?types=ITEM${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    items.push(...(data.objects ?? []));
    cursor = data.cursor;
  } while (cursor);
  return items;
}

async function fetchCounts(cfg, variationIds) {
  const counts = new Map();
  for (const ids of chunk(variationIds, 500)) {
    let cursor;
    do {
      const data = await square(cfg, '/v2/inventory/counts/batch-retrieve', {
        catalog_object_ids: ids, location_ids: [cfg.locationId], states: ['IN_STOCK'], ...(cursor ? { cursor } : {}),
      });
      for (const count of data.counts ?? []) {
        const quantity = parseInventoryQuantity(count.quantity);
        if (quantity !== null) counts.set(count.catalog_object_id, (counts.get(count.catalog_object_id) ?? 0) + quantity);
      }
      cursor = data.cursor;
    } while (cursor);
  }
  return counts;
}

async function fetchVariations(cfg, variationIds) {
  const byId = new Map();
  for (const ids of chunk(variationIds, 1000)) {
    const data = await square(cfg, '/v2/catalog/batch-retrieve', { object_ids: ids });
    for (const object of data.objects ?? []) if (object.type === 'ITEM_VARIATION') byId.set(object.id, object);
  }
  return byId;
}

async function setCounts(cfg, rows) {
  const occurredAt = new Date().toISOString();
  for (const batch of chunk(rows, 100)) {
    await square(cfg, '/v2/inventory/changes/batch-create', {
      idempotency_key: crypto.randomUUID(),
      ignore_unchanged_counts: true,
      changes: batch.map((row) => ({
        type: 'PHYSICAL_COUNT',
        physical_count: {
          catalog_object_id: row.variationId,
          state: 'IN_STOCK',
          location_id: cfg.locationId,
          quantity: String(row.count),
          occurred_at: occurredAt,
        },
      })),
    });
  }
}

async function switchTrackingOn(cfg, variations) {
  for (const batch of chunk(variations, 1000)) {
    await square(cfg, '/v2/catalog/batch-upsert', {
      idempotency_key: crypto.randomUUID(),
      batches: [{ objects: batch.map((variation) => withTrackingOn(variation, cfg.locationId)) }],
    });
  }
}

// --- Commands --------------------------------------------------------------

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export async function plan(args) {
  const cfg = config();
  const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'untracked-items.csv';
  console.log(`Reading the ${cfg.environment} catalog...`);
  const items = await listItems(cfg);
  const untracked = planRows(items, cfg.locationId);
  const counts = await fetchCounts(cfg, untracked.map((row) => row.variation_id));
  const rows = planRows(items, cfg.locationId, counts);
  await writeFile(out, toCsv(rows));
  console.log(`${plural(items.length, 'item')} in the catalog; ${plural(rows.length, 'untracked variation')} written to ${out}.`);
  console.log('Nothing in Square was changed. Edit the count column (and track, for made-to-order items), then run apply.');
}

export async function apply(args) {
  const cfg = config();
  const file = args.find((arg) => !arg.startsWith('--'));
  if (!file) throw new Error('Usage: node scripts/track-inventory.mjs apply untracked-items.csv');
  if (cfg.environment === 'production' && !args.includes('--confirm-production')) {
    throw new Error('This would change the PRODUCTION catalog. Run it again with --confirm-production.');
  }

  const { toTrack, skipped } = readPlan(parseCsv(await readFile(file, 'utf8')));
  const zeros = toTrack.filter((row) => row.count === 0);
  console.log(`${cfg.environment}: ${plural(toTrack.length, 'variation')} to track, ${skipped} left untracked.`);
  if (zeros.length) console.log(`  ${zeros.length} start at 0 and will show Out of Stock: ${zeros.map((r) => r.item).join(', ')}`);

  // Fresh copies: an upsert must carry the current version of each object.
  const variations = await fetchVariations(cfg, toTrack.map((row) => row.variationId));
  const missing = toTrack.filter((row) => !variations.has(row.variationId));
  if (missing.length) {
    throw new Error(`Not in this catalog, so nothing was changed: ${missing.map((r) => `${r.item} (${r.variationId})`).join(', ')}`);
  }

  // Counts first: tracking a variation with no count shows it as Out of Stock.
  console.log('Setting counts...');
  await setCounts(cfg, toTrack);
  console.log('Switching tracking on...');
  await switchTrackingOn(cfg, [...variations.values()]);

  console.log('Checking...');
  const after = await fetchVariations(cfg, toTrack.map((row) => row.variationId));
  const notTracked = toTrack.filter((row) => !tracksInventory(after.get(row.variationId)?.item_variation_data, cfg.locationId));
  let counts = await fetchCounts(cfg, toTrack.map((row) => row.variationId));
  let wrong = toTrack.filter((row) => (counts.get(row.variationId) ?? 0) !== row.count);
  if (wrong.length) {
    console.log(`Re-sending ${plural(wrong.length, 'count')} that didn't take...`);
    await setCounts(cfg, wrong);
    counts = await fetchCounts(cfg, toTrack.map((row) => row.variationId));
    wrong = toTrack.filter((row) => (counts.get(row.variationId) ?? 0) !== row.count);
  }

  console.log(`Done: ${toTrack.length - notTracked.length} of ${toTrack.length} now tracked.`);
  for (const row of notTracked) console.log(`  NOT TRACKED: ${row.item} (${row.variationId})`);
  for (const row of wrong) console.log(`  WRONG COUNT: ${row.item} has ${counts.get(row.variationId) ?? 0}, expected ${row.count}`);
  if (notTracked.length || wrong.length) process.exitCode = 1;
  else console.log('The website shows the new stock within about five minutes.');
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isMain) {
  const [command, ...args] = process.argv.slice(2);
  const run = { plan, apply }[command];
  if (!run) {
    console.error('Usage: node scripts/track-inventory.mjs plan [--out file.csv]\n       node scripts/track-inventory.mjs apply file.csv [--confirm-production]');
    process.exit(1);
  }
  run(args).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
