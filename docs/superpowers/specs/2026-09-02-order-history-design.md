# Order history, and the session check it forces

**Date:** 2026-09-02
**Status:** approved, not yet implemented
**Applies to:** `workers/` (Cloudflare Worker) and `hubspot-theme/`

## Why

Sign-in exists, but it gates almost nothing:

- **Checkout never touches it.** Neither checkout island references auth. The
  contact is created server-side from the checkout email by
  `findOrCreateContact`, so the entire revenue path is guest-based.
- **The account page is empty.** `loadOrders()` in `AccountIsland.jsx` is
  `setOrders([])` beside a comment saying it needs an endpoint that does not
  exist. The page's headline feature renders nothing.
- **Favorites do not need it.** They resolve identity from a client-supplied
  `email` parameter, which is not a session.

So the delivered value of signing in is that the header says *Account* instead
of *Sign In*. That is the real reason the login flow feels shaky: there is no
payoff at the end of it to justify the friction, and every rough edge is felt
without compensation.

The fix is not to polish the front door. It is to put something behind it.

Order history is the obvious candidate because **the data is already there**.
Every completed order writes a deal carrying `order_items`,
`shipping_address`, `square_receipt_url`, and `amount`, associated to the
contact. Nothing new needs to be captured at checkout — only read back.

It also works retroactively. Because checkout calls
`findOrCreateContact(email)`, a *guest* order placed with the same address the
customer later signs in with is already attached to that contact. The first
time anyone signs in, their existing orders are simply there. There is no
"you needed an account when you bought it" gap to explain.

## Guiding principle

**Identity comes from the verified session token, never from a request
parameter.**

This is the whole difference between the new endpoint and the existing
favorites route. `/api/favorites` resolves whoever the client names:

```js
const { contactId, email } = params;          // client-supplied
const resolvedId = await resolveContactId(env, { contactId, email });
```

Applied to orders, that would hand any caller another customer's purchase
history, shipping address, and receipts by guessing an email. Every route added
or changed here derives the contact id from a verified JWT and ignores any
contact identity in the request.

## 1. Session verification helper

`handleVerifySession` currently performs the JWT check inline. Extract it:

```js
// workers/src/session.js
export async function requireSession(request, env, params = {})
  // -> { contactId, email } | null
```

Two details settled during implementation:

**It lives in its own module, not `auth.js`.** `hubspot.js` needs it for
favorites, and `auth.js` already imports `hubspot.js`, so putting it in
`auth.js` creates the same import cycle the Square client extraction was done
to break.

**It accepts already-parsed params.** A `Request` body can only be consumed
once, and `handleFavorites` reads the body before it needs the session, so it
passes what it already parsed rather than having the helper re-read it.

It reads `Authorization: Bearer <token>`, falling back to a `token` parameter
for parity with today's behaviour, verifies against `JWT_SECRET`, and returns
the claims. `handleVerifySession` is refactored to call it, so "is this person
signed in" is decided in exactly one place.

A missing `JWT_SECRET` returns `null` rather than throwing. There is already a
deliberate no-fallback rule for the signing key (`secretKey()` returns null and
the route 500s); an unconfigured worker must fail closed, never open.

## 2. `GET /api/orders`

New module `workers/src/orders.js`, registered in the route table.

1. `requireSession` — `401` if absent. No contact id is read from the request.
2. `GET /crm/v4/objects/contacts/{contactId}/associations/deals` for deal ids.
3. `POST /crm/v3/objects/deals/batch/read` for `dealname`, `amount`,
   `order_id`, `order_items`, `shipping_address`, `square_receipt_url`,
   `createdate`, `dealstage`.
4. Map to a view model, sort by `createdate` descending, display up to 50.

The order of those last two steps is forced by the APIs. `batch/read` accepts
at most 100 inputs, and the associations response carries only ids — no
`createdate` to sort on. So the cap has to be applied to *ids*, before the
read, not to sorted orders after it: take the first 100 association ids, read
those, sort, and show the newest 50. A contact with more than 100 deals could
therefore miss an order. For a POC store that is not a real case, and the
honest fix is pagination, which is out of scope.

**Associations, not search.** The deals *search* API is eventually consistent,
so an order placed a minute ago can be missing from its results. Someone who
just checked out and signed in to look at their receipt is precisely the person
most likely to hit that window. Associations are immediate.

`amount` is written by `createOrderDeal` as a dollar string
(`(cents / 100).toString()`), so it arrives as `"30.88"` or `"30.9"`. The
mapper parses and formats to two decimals rather than trusting the stored
shape.

A contact with no deals returns `{ success: true, orders: [] }` — not a 404.
An empty history is a normal state for a new customer, not an error.

## 3. Account page

Replace the `loadOrders()` stub with a real fetch sending
`Authorization: Bearer <token>`, rendering per order: date, total, the
`order_items` block, and the Square receipt as a link when
`square_receipt_url` is present.

The empty state reads "No orders yet" with a link to `/shop`. This is what
every new signup sees, so it must not look like a failure.

## 4. Favorites gets the same check

`/api/favorites` currently accepts a client-supplied `email` and reads or
writes that contact's favorites. Anyone can pass any address.

The client sends `hubspotutk` for anonymous visitors, but the worker never
reads that parameter — it destructures only `contactId, email, productId,
action`. So anonymous reads already return an empty list, anonymous writes
already 401, and the client silently falls back to localStorage. **There is no
working server-side anonymous path to preserve.**

So: `handleFavorites` uses `requireSession`. Signed-in users read and write
their own favorites, keyed by the session's contact id. Anonymous users get
what they get today — localStorage only, via the existing client fallback.
`resolveContactId` and the `email`/`contactId` parameters are deleted.

This closes the hole without removing any behaviour that currently works.

## 5. Two reliability fixes, and only two

The account page is now worth reaching, so the sign-in path being reliable
stops being cosmetic.

**Reload after a successful login shows "Invalid link."** The token stays in
the address bar and is never scrubbed, so a refresh re-runs verification
against an already-burned token. Fix: `history.replaceState({}, '', '/login')`
*before* verification runs, plus a ref guard so verification fires once per
mount. With the query string gone, a reload re-renders the page with empty
HubL data attributes and nothing re-verifies.

**Sandbox magic links point at production.** `[env.sandbox.vars]` sets
`BASE_URL` to `https://www.rainydaymerchandise.com`, so a link requested from
the dev portal emails the user to the production site, which resolves to the
production Worker and a different HubSpot portal. Every sandbox test login
fails. Fix: a `resolveBaseUrl(request, env)` helper in `lib.js`, accepting the
request `Origin` only when it parses as a URL with `https:` protocol and a
hostname that is either listed in `ALLOWED_ORIGINS` or ends in
`.hs-sites.com`; otherwise `env.BASE_URL`.

**Production ignores `Origin` entirely** and always uses `env.BASE_URL`. An
origin-derived link is a phishing vector: someone who can set that header could
have a link emailed pointing at a host they control, and a victim clicking it
hands over the token. Confining derivation to the sandbox Worker means the real
storefront's links can only ever point at the real storefront. It costs
nothing, because the dev portal is the only place the hostname varies.

## 6. Tests

`workers/test/auth.test.js` — the first auth coverage in the repo. `jose` is
already a worker dependency, so tests sign real tokens; no mocks, matching the
existing pure-unit style.

- `requireSession` accepts a JWT signed with the configured secret
- rejects one signed with a different secret
- rejects an expired token
- rejects a missing or malformed `Authorization` header
- returns `null`, not a throw, when `JWT_SECRET` is unset
- `resolveBaseUrl` accepts an allowlisted preview origin
- rejects a foreign origin and falls back to `BASE_URL`
- ignores `Origin` entirely when the environment is production

`workers/test/orders.test.js` — the deal-to-view-model mapper: money
formatting from both `"30.9"` and `"30.88"`, a missing `square_receipt_url`,
an empty `order_items`, and newest-first ordering.

## Deliberately out of scope

- **Magic-link token hashing.** `magic_link_token` is stored in plaintext, so
  anyone with CRM access can read a live token for 15 minutes and sign in as
  that customer. Real, but it does not block this feature. `sha256Hex` already
  exists in `lib.js` for when we do it.
- **Link-prefetch hardening.** A JS-executing mail scanner can burn a token
  before the human clicks. Mitigated in practice by section 5's URL scrub and
  the existing error path; a proper fix needs a click-to-confirm step.
- **Rate limiting and method checks** on the auth routes.
- **Revocable sessions.** Logout is client-side only; a 30-day JWT stays valid.
- **Order detail pages.** The list plus a receipt link is enough.
- **Pagination.** Capped at 50; this is a POC store.

## Prerequisites to verify

- The deal properties `order_id`, `order_items`, `shipping_address`, and
  `square_receipt_url` exist in the **production** portal, not only sandbox.
  They are created by `scripts/`, but confirm before relying on batch-read.
- `JWT_SECRET` is set on both Workers. Order history fails closed without it.
