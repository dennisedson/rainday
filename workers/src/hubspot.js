/**
 * HubSpot routes: deals, category sync, and favorites.
 *
 * The Vercel version used @hubspot/api-client. That SDK is far too large for a
 * Worker bundle, and only six CRM operations were ever used, so they are issued
 * directly against the REST API here.
 */

import { json, readJson, readParams } from './lib.js';
import { squareConfig, squareFetch } from './square-client.js';

const HUBSPOT_API = 'https://api.hubapi.com';

async function hubspotFetch(env, path, init = {}) {
  const response = await fetch(`${HUBSPOT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const err = new Error(data.message || `HubSpot request failed (${response.status})`);
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return data;
}

async function findContactByEmail(env, email, properties = ['email']) {
  const data = await hubspotFetch(env, '/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [
        { filters: [{ propertyName: 'email', operator: 'EQ', value: email.toLowerCase().trim() }] },
      ],
      properties,
      limit: 1,
    }),
  });
  return data.results?.[0] || null;
}

async function createContact(env, properties) {
  return hubspotFetch(env, '/crm/v3/objects/contacts', {
    method: 'POST',
    body: JSON.stringify({ properties }),
  });
}

export async function updateContact(env, contactId, properties) {
  return hubspotFetch(env, `/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

export async function getContact(env, contactId, properties = []) {
  const qs = properties.length ? `?properties=${properties.join(',')}` : '';
  return hubspotFetch(env, `/crm/v3/objects/contacts/${contactId}${qs}`, { method: 'GET' });
}

export { findContactByEmail, createContact };

async function findOrCreateContact(env, email, extraProperties = {}) {
  const clean = Object.fromEntries(
    Object.entries(extraProperties).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const existing = await findContactByEmail(env, email);
  if (existing) {
    if (Object.keys(clean).length) await updateContact(env, existing.id, clean);
    return existing.id;
  }
  const created = await createContact(env, { email: email.toLowerCase().trim(), ...clean });
  return created.id;
}

function money(cents) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

/** One readable line per item, for the deal's order_items property. */
export function formatOrderItems(lineItems) {
  return (lineItems ?? [])
    .map((li) => `${li.name ?? 'Item'} x${li.quantity ?? '1'} - ${money(li.total_money?.amount)}`)
    .join('\n');
}

/** A mailing label, for the deal's shipping_address property. */
export function formatShippingAddress(recipient) {
  if (!recipient) return '';
  const a = recipient.address ?? {};
  const cityLine = [a.locality, [a.administrative_district_level_1, a.postal_code]
    .filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [recipient.display_name, a.address_line_1, a.address_line_2, cityLine,
    recipient.phone_number].filter(Boolean).join('\n');
}

/**
 * Creates the contact and deal for a completed order.
 *
 * The customer's identity and location go on the CONTACT using HubSpot's
 * standard fields; order-specific data goes on the DEAL. The address is stored
 * in both places deliberately - the contact holds where a person currently is,
 * the deal snapshots where THIS order shipped.
 *
 * Assigning an owner is what triggers the shop owner's HubSpot notification.
 */
export async function createOrderDeal(env, { email, firstName, lastName, phone, order, payment }) {
  const recipient = order?.fulfillments?.[0]?.shipment_details?.recipient;
  const address = recipient?.address ?? {};

  const contactId = await findOrCreateContact(env, email, {
    firstname: firstName,
    lastname: lastName,
    phone,
    address: address.address_line_1,
    city: address.locality,
    state: address.administrative_district_level_1,
    zip: address.postal_code,
  });

  const properties = {
    dealname: `Order ${order?.reference_id ?? order?.id ?? Date.now()}`,
    amount: ((order?.total_money?.amount ?? 0) / 100).toString(),
    dealstage: 'appointmentscheduled',
    pipeline: 'default',
    payment_id: payment?.id,
    order_id: order?.reference_id ?? order?.id,
    order_items: formatOrderItems(order?.line_items),
    shipping_address: formatShippingAddress(recipient),
    square_receipt_url: payment?.receipt_url,
  };
  if (env.HUBSPOT_OWNER_ID) properties.hubspot_owner_id = env.HUBSPOT_OWNER_ID;

  const deal = await hubspotFetch(env, '/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({ properties }),
  });

  await hubspotFetch(env, `/crm/v4/objects/deals/${deal.id}/associations/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify([{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]),
  });

  return { dealId: deal.id };
}

/** POST /api/create-deal */
export async function handleCreateDeal(request, env) {
  const { email, firstName, lastName, orderTotal, paymentId, orderId } = await readJson(request);
  if (!email || !orderTotal) {
    return json({ error: 'Email and orderTotal are required' }, { status: 400 });
  }

  try {
    const contactId = await findOrCreateContact(env, email, {
      firstname: firstName,
      lastname: lastName,
    });

    const deal = await hubspotFetch(env, '/crm/v3/objects/deals', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          dealname: `Order ${orderId || Date.now()}`,
          amount: String(orderTotal),
          dealstage: 'appointmentscheduled',
          pipeline: 'default',
          payment_id: paymentId,
          order_id: orderId,
        },
      }),
    });

    // v4 associations: HUBSPOT_DEFINED type 3 is deal -> contact.
    await hubspotFetch(
      env,
      `/crm/v4/objects/deals/${deal.id}/associations/contacts/${contactId}`,
      {
        method: 'PUT',
        body: JSON.stringify([{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]),
      }
    );

    return json({ success: true, dealId: deal.id });
  } catch (error) {
    return json({ error: 'Failed to create deal', message: error.message }, { status: 500 });
  }
}

/** POST /api/sync-categories — also the target of the nightly cron. */
export async function handleSyncCategories(request, env) {
  try {
    const count = await syncCategories(env);
    return json({ success: true, message: 'Categories fetched for sync', count });
  } catch (error) {
    return json({ error: 'Sync failed', message: error.message }, { status: 500 });
  }
}

/** Shared by the HTTP route and the scheduled handler. */
export async function syncCategories(env) {
  const cfg = squareConfig(env);
  const response = await squareFetch(cfg, '/v2/catalog/list?types=CATEGORY', { method: 'GET' });

  const data = await response.json();
  if (!response.ok) throw new Error(`Square category fetch failed: ${JSON.stringify(data.errors || data)}`);

  return (data.objects || []).length;
}

async function resolveContactId(env, { contactId, email }) {
  if (contactId) return contactId;
  if (!email) return null;
  const contact = await findContactByEmail(env, email);
  return contact?.id || null;
}

/**
 * GET/POST /api/favorites
 *
 * Reads for an unknown user return an empty list; writes require a signed-in
 * email so favorites cannot be written to an arbitrary contact.
 */
export async function handleFavorites(request, env) {
  const params = await readParams(request);
  const { contactId, email, productId, action } = params;
  const isWrite = request.method === 'POST';

  try {
    const resolvedId = await resolveContactId(env, { contactId, email });

    if (!resolvedId) {
      if (isWrite) return json({ error: 'Sign in to save favorites' }, { status: 401 });
      return json({ success: true, favorites: [], count: 0 });
    }

    const contact = await getContact(env, resolvedId, ['favorite_products']);
    let favorites = (contact.properties.favorite_products || '').split(',').filter(Boolean);

    if (isWrite) {
      if (!productId || !action) {
        return json({ error: 'productId and action are required' }, { status: 400 });
      }

      if (action === 'toggle') {
        favorites = favorites.includes(productId)
          ? favorites.filter((id) => id !== productId)
          : [...favorites, productId];
      } else if (action === 'add' && !favorites.includes(productId)) {
        favorites.push(productId);
      } else if (action === 'remove') {
        favorites = favorites.filter((id) => id !== productId);
      }

      await updateContact(env, resolvedId, { favorite_products: favorites.join(',') });

      return json({
        success: true,
        favorites,
        count: favorites.length,
        isFavorite: favorites.includes(productId),
      });
    }

    return json({ success: true, favorites, count: favorites.length });
  } catch (error) {
    return json({ error: 'Favorites operation failed', message: error.message }, { status: 500 });
  }
}
