/**
 * API Utility with Retry Logic
 * Handles intermittent failures and retries failed requests
 */

import { API_BASE_URL } from './config';

/**
 * Fetch with retry logic
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(endpoint, options = {}, maxRetries = 3, retryDelay = 1000) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // If successful, return immediately
      if (response.ok) {
        return response;
      }

      // If 404 and not last attempt, retry (might be cold start)
      if (response.status === 404 && attempt < maxRetries) {
        console.warn(`[API] ${endpoint} returned 404, retrying (attempt ${attempt + 1}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      // For other errors, return the response (let caller handle it)
      return response;
    } catch (error) {
      // Network errors or timeouts - retry if not last attempt
      if (attempt < maxRetries && (error.name === 'TypeError' || error.name === 'AbortError')) {
        console.warn(`[API] ${endpoint} failed: ${error.message}, retrying (attempt ${attempt + 1}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      // Last attempt failed or non-retryable error
      console.error(`[API] ${endpoint} failed after ${attempt + 1} attempts:`, error);
      throw error;
    }
  }

  // Should never reach here, but just in case
  throw new Error(`Failed to fetch ${endpoint} after ${maxRetries + 1} attempts`);
}

/**
 * Fetch JSON with retry logic
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @param {number} maxRetries - Maximum retries
 * @returns {Promise<any>}
 */
export async function fetchJSON(endpoint, options = {}, maxRetries = 3) {
  const response = await fetchWithRetry(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }, maxRetries);

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || `HTTP ${response.status}` };
    }
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * GET request with retry
 */
export async function get(endpoint, options = {}) {
  return fetchJSON(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request with retry
 */
export async function post(endpoint, data, options = {}) {
  return fetchJSON(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request with retry
 */
export async function del(endpoint, data, options = {}) {
  return fetchJSON(endpoint, {
    ...options,
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  });
}

