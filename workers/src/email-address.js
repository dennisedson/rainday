/**
 * Whether an email address is one HubSpot will accept.
 *
 * HubSpot refuses an address whose domain doesn't end in a real top-level
 * domain, and one with quotation marks in the part before the @. An address it
 * refuses means no contact and no deal, so no new-order alert for the shop
 * owner, which is why checkout must be stopped before the card is charged
 * rather than after. The theme runs the same rule on the shipping step; this
 * is the backstop for anything that skips it.
 */

import { TLDS } from './tlds.js';

// One @, no spaces, no quotation marks, and a dot somewhere after the @.
const EMAIL_SHAPE = /^[^\s@"]+@[^\s@"]+\.[^\s@"]+$/;

export function isValidEmailAddress(value) {
  if (typeof value !== 'string') return false;
  const email = value.trim();
  if (email.length > 254 || !EMAIL_SHAPE.test(email)) return false;

  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;

  return TLDS.has(domain.slice(domain.lastIndexOf('.') + 1));
}
