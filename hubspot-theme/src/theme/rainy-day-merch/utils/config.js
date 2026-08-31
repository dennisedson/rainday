/**
 * Single source of truth for the storefront's API host.
 *
 * This used to be hardcoded in nine files, which meant moving the backend was a
 * nine-file edit plus a theme deploy. Import API_BASE_URL from here instead of
 * writing a URL literal, so the next move is a one-line change.
 *
 * The host is a custom domain rather than a platform-generated one
 * (*.vercel.app, *.workers.dev) so the backend can move between providers with
 * only a DNS change.
 */
export const API_BASE_URL = 'https://api.rainydaymerchandise.com/api';
