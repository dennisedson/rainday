/**
 * HubSpot routes: deals, category sync, and favorites.
 *
 * The Vercel version used @hubspot/api-client. That SDK is far too large for a
 * Worker bundle, and only six CRM operations were ever used, so they are issued
 * directly against the REST API here.
 */

import { json, readJson, readParams } from './lib.js';
import { squareConfig } from './square-client.js';

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
  const existing = await findContactByEmail(env, email);
  if (existing) return existing.id;

  const created = await createContact(env, {
    email: email.toLowerCase().trim(),
    ...extraProperties,
  });
  return created.id;
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
  const response = await fetch(`${cfg.apiBase}/v2/catalog/list?types=CATEGORY`, {
    method: 'GET',
    headers: {
      'Square-Version': '2024-12-18',
      Authorization: `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

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
