/**
 * Single source of truth for the storefront's API host.
 *
 * This used to be hardcoded in nine files, which meant moving the backend was a
 * nine-file edit plus a theme deploy. Import API_BASE_URL from here instead of
 * writing a URL literal, so a move is a one-line change.
 *
 * CUTOVER: this still points at the Vercel deployment, which is what is live.
 * Switch it to the Worker's URL only once that Worker is deployed and
 * answering, then run `hs project upload`. Keeping this pointed at the live
 * backend means the theme is safe to upload at any moment.
 *
 * Longer term this wants to be a custom domain (api.rainydaymerchandise.com)
 * rather than any platform hostname, so the next move is a DNS change instead
 * of a code change. That needs the domain on Cloudflare DNS; see
 * workers/README.md.
 */
export const API_BASE_URL = 'https://hsecommerce-api.vercel.app/api';
