import { json } from './lib.js';
import { requireSession } from './session.js';
import { hubspotFetch } from './hubspot.js';

/**
 * Order history: the deals a signed-in customer has bought.
 *
 * Nothing new is captured at checkout — createOrderDeal already writes the
 * items, address, and Square receipt onto the deal, associated to the contact.
 * This reads that back.
 */

// A customer with more orders than this pages, which is out of scope for a shop
// this size. Capping keeps one contact from returning an unbounded response.
const MAX_ORDERS = 50;

function money(amount) {
  const parsed = Number(amount);
  return `$${(Number.isFinite(parsed) ? parsed : 0).toFixed(2)}`;
}

/**
 * Deals as the account page wants them: newest first, money already formatted,
 * absent fields normalised so the UI never renders "undefined".
 */
export function toOrderList(deals) {
  return (deals || [])
    .map((deal) => {
      const p = deal.properties || {};
      return {
        id: deal.id,
        orderId: p.order_id || null,
        placedAt: p.createdate || null,
        // Stored as a dollar string by createOrderDeal, so "30.9" is $30.90.
        total: money(p.amount),
        items: (p.order_items || '').split('\n').filter(Boolean),
        shippingAddress: p.shipping_address || '',
        receiptUrl: p.square_receipt_url || null,
      };
    })
    // ISO timestamps sort correctly as strings; an undated deal sorts last
    // rather than throwing.
    .sort((a, b) => (b.placedAt || '').localeCompare(a.placedAt || ''))
    .slice(0, MAX_ORDERS);
}

const ORDER_PROPERTIES = [
  'amount',
  'createdate',
  'order_id',
  'order_items',
  'shipping_address',
  'square_receipt_url',
];

// HubSpot's batch/read accepts at most 100 inputs, and the associations
// response carries only ids — there is no createdate to sort on before the
// read. So the cap lands on ids, not on sorted orders. A contact with more
// than 100 deals could miss one; the honest fix is pagination.
const BATCH_READ_LIMIT = 100;

/** GET /api/orders */
export async function handleOrders(request, env) {
  const session = await requireSession(request, env);
  if (!session?.contactId) {
    return json({ error: 'Sign in to view your orders' }, { status: 401 });
  }

  try {
    // Associations, not the deals search API: search is eventually consistent,
    // and someone who just checked out to look at their receipt is exactly the
    // person who would hit that window.
    const associated = await hubspotFetch(
      env,
      `/crm/v4/objects/contacts/${session.contactId}/associations/deals`,
      { method: 'GET' }
    );

    const ids = (associated.results || [])
      .map((r) => r.toObjectId)
      .filter(Boolean)
      .slice(0, BATCH_READ_LIMIT);

    // No orders is a normal state for a new customer, not an error.
    if (ids.length === 0) return json({ success: true, orders: [] });

    const batch = await hubspotFetch(env, '/crm/v3/objects/deals/batch/read', {
      method: 'POST',
      body: JSON.stringify({
        properties: ORDER_PROPERTIES,
        inputs: ids.map((id) => ({ id: String(id) })),
      }),
    });

    return json({ success: true, orders: toOrderList(batch.results || []) });
  } catch (error) {
    console.error('[Orders] Fetch failed:', error.message);
    return json({ error: 'Could not load orders' }, { status: 500 });
  }
}
