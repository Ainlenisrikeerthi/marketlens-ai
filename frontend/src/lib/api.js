/**
 * API client helper to interact with Django backend.
 * All requests are routed through /api (proxied to Django in dev,
 * or the configured VITE_API_URL in production).
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * @param {string} endpoint
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export async function fetchApi(endpoint, options) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

