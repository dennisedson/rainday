/**
 * Email address checks for checkout and sign-in.
 *
 * isValidEmail is the same rule the Worker applies before charging a card
 * (workers/src/email-address.js): HubSpot refuses an address whose domain
 * doesn't end in a real top-level domain, and an order whose address HubSpot
 * refuses never reaches the shop owner. Checking here lets the shopper fix it
 * on the shipping step instead of at payment.
 *
 * suggestEmail only offers a correction. A real address that looks like a typo
 * (someone on mail.com, not gmail.com) must never be blocked.
 */

import { TLDS } from './tlds';

const EMAIL_SHAPE = /^[^\s@"]+@[^\s@"]+\.[^\s@"]+$/;

export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const email = value.trim();
  if (email.length > 254 || !EMAIL_SHAPE.test(email)) return false;

  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;

  return TLDS.has(domain.slice(domain.lastIndexOf('.') + 1));
}

// The providers most shoppers use. A domain one or two letters away from one of
// these is probably a slip.
const COMMON_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com',
  'live.com', 'msn.com', 'me.com', 'mac.com', 'ymail.com', 'protonmail.com',
  'comcast.net', 'att.net', 'sbcglobal.net', 'cox.net', 'charter.net', 'verizon.net',
];

// When the ending isn't a real domain at all, these are what people meant.
const COMMON_ENDINGS = ['com', 'net', 'org', 'edu', 'us'];

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }
  return row[b.length];
}

function closest(word, candidates, maxDistance) {
  let best = null;
  let bestDistance = maxDistance + 1;
  for (const candidate of candidates) {
    const distance = editDistance(word, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * A likely correction for a mistyped address, or null.
 *
 *   pat@gmial.com          -> pat@gmail.com
 *   dennis@dennisedson.cpm -> dennis@dennisedson.com
 */
export function suggestEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (COMMON_DOMAINS.includes(domain)) return null;

  const provider = closest(domain, COMMON_DOMAINS, 2);
  if (provider) return `${local}@${provider}`;

  const dot = domain.lastIndexOf('.');
  if (dot < 1) return null;
  const ending = domain.slice(dot + 1);
  if (TLDS.has(ending)) return null;

  const fixed = closest(ending, COMMON_ENDINGS, 1);
  return fixed ? `${local}@${domain.slice(0, dot + 1)}${fixed}` : null;
}
