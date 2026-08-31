/**
 * Shared helpers: CORS, JSON responses, and the Web Crypto equivalents of the
 * Node APIs the Vercel functions used.
 */

/**
 * The Vercel functions sent `Access-Control-Allow-Origin: *` on every route,
 * including payments and auth. Here the storefront origins are allowlisted via
 * the ALLOWED_ORIGINS var. If it is unset we fall back to `*` so a
 * misconfiguration degrades to the old behaviour rather than taking the store
 * offline.
 *
 * Note this is defence in depth only: CORS constrains browsers, not curl. The
 * real protection for /process-payment is that the server prices the order.
 */
export function corsHeaders(request, env) {
  const configured = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const origin = request.headers.get('Origin');
  let allowOrigin = '*';

  if (configured.length > 0) {
    allowOrigin = origin && configured.includes(origin) ? origin : configured[0];
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/** Body parser that tolerates an empty or malformed body instead of throwing. */
export async function readJson(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return {};
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** Merge query params and JSON body the way the Vercel handlers did. */
export async function readParams(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams);
  const body = await readJson(request);
  return { ...query, ...body, __query: query, __body: body };
}

function toHex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Replaces crypto.randomBytes(n).toString('hex'). */
export function randomHex(byteLength = 32) {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** Replaces crypto.createHash('sha256').update(s).digest('hex'). */
export async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return toHex(digest);
}

/**
 * Replaces Buffer + crypto.timingSafeEqual. Compares in time proportional to
 * the input length only, so a mismatched magic-link token cannot be recovered
 * by measuring how fast the comparison fails.
 */
export function timingSafeEqual(a, b) {
  const aBytes = new TextEncoder().encode(String(a ?? ''));
  const bBytes = new TextEncoder().encode(String(b ?? ''));
  if (aBytes.length === 0 || aBytes.length !== bBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}
