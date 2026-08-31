import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  corsHeaders,
  randomHex,
  readJson,
  sha256Hex,
  timingSafeEqual,
} from '../src/lib.js';

function req(url = 'https://api.example.com/api/health', init = {}) {
  return new Request(url, init);
}

test('randomHex returns the requested byte length as hex', () => {
  assert.equal(randomHex(32).length, 64);
  assert.equal(randomHex(16).length, 32);
  assert.match(randomHex(32), /^[0-9a-f]+$/);
});

test('randomHex does not repeat', () => {
  const seen = new Set(Array.from({ length: 200 }, () => randomHex(32)));
  assert.equal(seen.size, 200);
});

test('sha256Hex matches known SHA-256 vectors', async () => {
  assert.equal(
    await sha256Hex(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  assert.equal(
    await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});

test('sha256Hex is stable, so idempotency keys survive a retry', async () => {
  const a = (await sha256Hex('ORD-1:token-xyz')).slice(0, 24);
  const b = (await sha256Hex('ORD-1:token-xyz')).slice(0, 24);
  assert.equal(a, b);
  assert.equal(a.length, 24);
});

test('sha256Hex separates distinct checkout attempts', async () => {
  const a = await sha256Hex('ORD-1:token-a');
  const b = await sha256Hex('ORD-1:token-b');
  assert.notEqual(a, b);
});

test('timingSafeEqual accepts only exact matches', () => {
  assert.equal(timingSafeEqual('abc123', 'abc123'), true);
  assert.equal(timingSafeEqual('abc123', 'abc124'), false);
  assert.equal(timingSafeEqual('abc123', 'abc12'), false);
  assert.equal(timingSafeEqual('abc', 'abcdef'), false);
});

test('timingSafeEqual rejects empty and missing tokens', () => {
  // The Vercel version required storedBuf.length > 0 so a contact with a
  // cleared magic-link token could not be logged into with an empty string.
  assert.equal(timingSafeEqual('', ''), false);
  assert.equal(timingSafeEqual(undefined, undefined), false);
  assert.equal(timingSafeEqual(null, ''), false);
  assert.equal(timingSafeEqual('', 'anything'), false);
});

test('CORS echoes an allowlisted origin', () => {
  const env = { ALLOWED_ORIGINS: 'https://www.rainydaymerchandise.com,https://rainydaymerchandise.com' };
  const h = corsHeaders(req('https://api.example.com/', {
    headers: { Origin: 'https://rainydaymerchandise.com' },
  }), env);
  assert.equal(h['Access-Control-Allow-Origin'], 'https://rainydaymerchandise.com');
  assert.equal(h.Vary, 'Origin');
});

test('CORS refuses to echo an unlisted origin', () => {
  const env = { ALLOWED_ORIGINS: 'https://www.rainydaymerchandise.com' };
  const h = corsHeaders(req('https://api.example.com/', {
    headers: { Origin: 'https://evil.example' },
  }), env);
  assert.equal(h['Access-Control-Allow-Origin'], 'https://www.rainydaymerchandise.com');
});

test('CORS falls back to * when unconfigured, matching the old behaviour', () => {
  const h = corsHeaders(req(), {});
  assert.equal(h['Access-Control-Allow-Origin'], '*');
});

test('readJson tolerates empty and malformed bodies', async () => {
  assert.deepEqual(await readJson(req('https://x/', { method: 'POST', body: '' })), {});
  assert.deepEqual(await readJson(req('https://x/', { method: 'POST', body: 'not json' })), {});
  assert.deepEqual(
    await readJson(req('https://x/', { method: 'POST', body: '{"a":1}' })),
    { a: 1 }
  );
});
