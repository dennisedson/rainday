import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { requireSession } from '../src/session.js';
import { resolveBaseUrl } from '../src/lib.js';

const SECRET = 'test-secret-for-unit-tests-only-not-a-real-key';

async function signToken(claims, { secret = SECRET, expiresIn = '30d' } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

function requestWith(token) {
  return new Request('https://example.com/api/orders', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

test('a session signed with the configured secret resolves to its claims', async () => {
  const token = await signToken({ contactId: '12345', email: 'buyer@example.com' });

  const session = await requireSession(requestWith(token), { JWT_SECRET: SECRET });

  assert.deepEqual(session, { contactId: '12345', email: 'buyer@example.com' });
});

test('an unconfigured worker fails closed, returning null rather than throwing', async () => {
  const token = await signToken({ contactId: '12345', email: 'buyer@example.com' });

  const session = await requireSession(requestWith(token), {});

  assert.equal(session, null);
});

// These three pass the moment requireSession calls jwtVerify — jose provides
// the behaviour. They are here as regression protection: they fail loudly if
// anyone ever swaps the verification for a decode.

test('a token signed with a different secret is not a session', async () => {
  const token = await signToken({ contactId: '12345' }, { secret: 'some-other-secret-entirely' });
  assert.equal(await requireSession(requestWith(token), { JWT_SECRET: SECRET }), null);
});

test('an expired token is not a session', async () => {
  const token = await signToken({ contactId: '12345' }, { expiresIn: '-1h' });
  assert.equal(await requireSession(requestWith(token), { JWT_SECRET: SECRET }), null);
});

test('a request carrying no Authorization header is not a session', async () => {
  assert.equal(await requireSession(requestWith(null), { JWT_SECRET: SECRET }), null);
});

// --- resolveBaseUrl -------------------------------------------------------
//
// Sandbox must build magic links back to the preview host that asked for one,
// or every dev-portal login walks the tester to production. Production must
// never do that: an origin-derived link is a phishing vector.

function requestFrom(origin) {
  return new Request('https://worker.example/api/auth/magic-link', {
    method: 'POST',
    headers: origin ? { Origin: origin } : {},
  });
}

const SANDBOX = {
  SQUARE_ENVIRONMENT: 'sandbox',
  BASE_URL: 'https://www.rainydaymerchandise.com',
  ALLOWED_ORIGINS: '',
};

const PRODUCTION = {
  SQUARE_ENVIRONMENT: 'production',
  BASE_URL: 'https://www.rainydaymerchandise.com',
  ALLOWED_ORIGINS: 'https://www.rainydaymerchandise.com,https://rainydaymerchandise.com',
};

test('sandbox builds the link back to the HubSpot preview host that asked', () => {
  assert.equal(
    resolveBaseUrl(requestFrom('https://144033062.hs-sites.com'), SANDBOX),
    'https://144033062.hs-sites.com'
  );
});

test('sandbox refuses an unrecognised origin and falls back to BASE_URL', () => {
  assert.equal(
    resolveBaseUrl(requestFrom('https://evil.example'), SANDBOX),
    'https://www.rainydaymerchandise.com'
  );
});

test('a lookalike host does not pass as a preview host', () => {
  assert.equal(
    resolveBaseUrl(requestFrom('https://hs-sites.com.evil.example'), SANDBOX),
    'https://www.rainydaymerchandise.com'
  );
});

test('sandbox requires https, so a plaintext preview origin is refused', () => {
  assert.equal(
    resolveBaseUrl(requestFrom('http://144033062.hs-sites.com'), SANDBOX),
    'https://www.rainydaymerchandise.com'
  );
});

test('production ignores the request origin entirely', () => {
  assert.equal(
    resolveBaseUrl(requestFrom('https://144033062.hs-sites.com'), PRODUCTION),
    'https://www.rainydaymerchandise.com'
  );
});

test('a request with no Origin header falls back to BASE_URL', () => {
  assert.equal(resolveBaseUrl(requestFrom(null), SANDBOX), 'https://www.rainydaymerchandise.com');
});
