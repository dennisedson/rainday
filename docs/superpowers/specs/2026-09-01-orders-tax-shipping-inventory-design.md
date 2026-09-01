# Orders, tax, shipping, and inventory

**Date:** 2026-09-01
**Status:** approved, not yet implemented
**Applies to:** `workers/` (Cloudflare Worker) and `hubspot-theme/`

## Why

Four gaps surfaced during the first successful sandbox checkout on the Cloudflare
Worker. All four exist identically on the Vercel deployment — none is a
regression from the port.

1. Nobody is notified when an order is placed. The confirmation page claims
   *"A confirmation email has been sent"*; nothing sends one.
2. No sales tax is charged. The confirmation page hardcodes the label
   `Tax (8%)` beside whatever Square returns, which is always `$0.00`.
3. No shipping is charged. Items sell for $5-$12, so unpriced shipping erases
   the margin.
4. Out-of-stock items can be purchased.

## Guiding principle

**Money rules belong in Square; the code reads them.**

Tax rates and shipping fees are business decisions the shop owner must be able
to change without a deploy. Square's Dashboard already owns both. The Worker
references them and charges what Square prices, which keeps the owner in
control and keeps the client untrusted — the same principle as the server-side
pricing fix.

The one exception is the *nexus rule* (who gets taxed), which is a legal
condition rather than a rate, and is not something to expose as an editable
setting.

## 1. Order notification

### Decision

No email is written. HubSpot notifies the owner natively.

Sales Hub Starter supports deal-assignment notifications and basic pipeline
stage automation, either of which emails the owner when a deal is created. The
notification only has to say *a sale happened* and link to the deal — all the
detail lives on the records.

The customer continues to receive Square's own payment receipt, which is sent
automatically to `buyer_email_address` in production. Sandbox does not send
email; that is a platform behaviour, not a defect.

**Prerequisite to verify:** that receipts are enabled in the production Square
Dashboard. If they are not, the customer currently gets nothing, and that is a
setting change rather than code.

### Data model

The customer's identity and location go on the **Contact**, using HubSpot's
standard fields — no custom properties needed:

```
email, firstname, lastname     already set
phone, address, city, state, zip   to add
```

Order-specific data goes on the **Deal**:

```
dealname, amount, dealstage, pipeline   already set
payment_id, order_id                    already exist
order_items         textarea   name x qty @ price, one per line
shipping_address    textarea   ship-to snapshot for THIS order
square_receipt_url  text       direct link to the Square receipt
hubspot_owner_id    standard   assigns the deal, which triggers the notification
```

The address is stored in both places deliberately. The Contact holds where a
person currently is; the Deal snapshots where *this order* shipped. A customer
who moves must not retroactively change the address a past order went to.

### Reliability

`create-deal` is currently called from the browser after payment and wrapped in
a `try/catch` that swallows failures, so a closed browser or a failed request
means no deal, and therefore no notification.

Deal creation moves server-side into `process-payment`, dispatched with
`ctx.waitUntil()` so it never delays the payment response and never fails a
charge that has already succeeded. Failures are logged loudly enough to find in
`wrangler tail`.

## 1b. Shipping address visible in Square

### Decision

Attach a `fulfillment` with `shipment_details.recipient` when the order is
created.

Today the order carries only `location_id`, `reference_id`, and `line_items`.
The shipping address is set as `billing_address` on the *payment*, never on the
order — which is why the owner cannot see where anything ships from Square's
Orders tab. Attaching the recipient puts the name, address, email, and phone on
the order itself, where Square's own UI displays it.

This is a few lines in `process-payment` and it resolves a reported complaint
directly, independently of anything else in this document.

### Requires a small theme change

`process-payment` currently receives `billingDetails` with only `address1`,
`city`, `state`, `zipCode`, and `country`. The recipient also needs
`firstName`, `lastName`, and `phone` — all present in `shippingInfo` in the
checkout island, simply not forwarded.

## 2. Sales tax

### Decision

Collect Kansas tax for Kansas buyers. Charge nothing to buyers in other states
until an economic nexus threshold is crossed there (commonly $100k gross or 200
transactions annually per state).

Split by who owns what:

- **The rate** lives in a Square catalog tax object. The owner changes the
  percentage in Square with no deploy.
- **The condition** lives in the Worker: ship-to state is `KS` -> apply the tax,
  otherwise do not.

The state is read from `billingDetails.state` in `process-payment` and from
`shippingAddress.state` in `calculate-order`, both populated from the same
checkout form. Matching is case-insensitive and whitespace-trimmed: `ks`, `KS`,
and ` Ks ` all mean Kansas. A missing or unrecognised state is treated as
out-of-state and not taxed, which fails toward undercharging rather than
charging tax that was never owed.

Square's Orders API is not relied on to infer jurisdiction from the shipping
address; that behaviour is unverified outside Square Online, and an explicit
condition is predictable and testable.

### Constraint

`calculate-order` and `process-payment` must apply the identical rule. They
already both receive the ship-to state. If they ever disagree, the existing
price-mismatch guard returns 409 and the customer cannot pay — a safe failure,
but a broken checkout. The rule is therefore **one shared function** called by
both, never two copies.

### Also

Shipping is generally taxable in Kansas when the sale is taxable, so the service
charge below is configured as taxable in Square.

The hardcoded `Tax (8%)` label in `OrderConfirmationIsland.jsx:134` becomes
plain `Tax`, since the real rate now comes from Square.

## 3. Shipping

### Decision

A **Service Charge** defined in the Square Dashboard, referenced by catalog ID
when the order is created. The owner sets and changes the amount in Square.

The fee must never be supplied by the client — that is the tampering vector the
server-side pricing fix closed.

Applied in both `calculate-order` and `process-payment`, for the same
price-mismatch reason as tax.

Scope is order-level, not per line item, and it is applied to every order — no
free-shipping threshold and no local pickup option. Both are easy to add later
and neither has been asked for.

**If no shipping service charge is configured in Square, shipping is free.**
The Worker looks the charge up and omits it when absent rather than erroring or
blocking checkout. This makes the feature safe to deploy before the owner has
decided on a fee: behaviour is unchanged from today until she creates one, and
it starts applying the moment she does, with no deploy. It also means a
misconfiguration undercharges rather than stranding a customer at checkout.

Flat rate only. Weight- and zone-based shipping needs the full address and
interacts with tax sourcing; not worth building before there is evidence it is
needed.

## 4. Inventory

### Decision

Gate purchasability on real Square inventory counts via
`inventoryApi.batchRetrieveInventoryCounts`, filtered to `IN_STOCK` at the
configured location, batched and cursor-paginated.

Resolution is deliberately three-way:

- `0` -> out of stock, blocked
- a number -> gate on it
- `undefined` -> Square is not tracking this variation; stays purchasable

A per-location `soldOut` override beats a positive count. A per-location
`trackInventory` override beats the variation-level flag.

Inventory is advisory: if the Inventory API call fails, fall back to "stock
unknown" rather than rendering the whole catalog sold out.

### No theme changes

The UI already exists. `ProductDetailIsland` renders "Out of Stock", disables
the quantity stepper and the Add to Cart button, all gated on
`product.available` (lines 249, 273, 290, 303, 344, 349). The favourite button
is independent of availability, so favouriting an out-of-stock item already
works as required.

Only the data behind `available` changes.

### Operational note

This only takes effect for items where inventory tracking is enabled in Square.
At time of writing only one item in the catalog has tracking on, so enabling
this will not take the store offline — but out-of-stock will also do nothing
for untracked items until the owner turns tracking on.

## Out of scope

- A custom customer-facing confirmation email. Square's receipt covers it.
- Square webhooks. Considered for delivery robustness; unnecessary once the
  notification is HubSpot-native and the deal is created server-side.
- Weight- or zone-based shipping.
- Multi-state tax. Revisit at nexus.
- Backporting any of this to the Vercel deployment, which is being retired.

## Testing

- Pure logic (tax condition, inventory resolution, order-item formatting) gets
  unit tests in `workers/test/`, run by `node --test` with no credentials.
- The tax condition is tested at the boundary: `KS` taxed, `NY` not, missing
  state not, lowercase `ks` taxed.
- End-to-end verification is a sandbox checkout against Square sandbox and
  HubSpot portal 51953677: taxed KS order, untaxed out-of-state order,
  out-of-stock item blocked, deal created with all properties populated.
- No payment testing against production Square. Any such test is a real charge.

## Documentation deliverables

`README.md` and `workers/README.md` gain guidance covering:

- **Tax** — that the rate lives in a Square catalog tax object and how to change
  it; that the KS-only condition lives in code and why; what to do when
  approaching nexus in another state; that shipping is taxable in Kansas.
- **Inventory** — that out-of-stock only applies to items with tracking enabled
  in Square; how to enable it per item; the three-way resolution and why
  untracked means purchasable rather than sold out.
- **Shipping** — where the service charge is defined and how to change the fee.
- The HubSpot properties and notification setup required on a fresh portal,
  extending the existing portal-setup section.

## Prerequisites before implementation

Configuration that must exist before the code has anything to reference:

1. A Kansas tax object in the Square catalog (sandbox and production).
2. A shipping Service Charge in the Square catalog (sandbox and production).
3. The three custom Deal properties on both HubSpot portals.
4. The owner ID for deal assignment.
5. Confirmation that Square receipts are enabled in production.
