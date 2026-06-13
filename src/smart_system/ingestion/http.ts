/**
 * Smart System — default JSON fetcher for ingestion.
 *
 * Mirrors the project's existing fetch convention (`fetch(url, { cache:
 * 'no-store' })`). App-relative paths are resolved against the request origin
 * so server-side ingestion can read the platform's own `/api/*` routes.
 */

import type { FetchJson } from './base_adapter';

/** Build a `FetchJson` bound to a base origin (e.g. "http://localhost:3000"). */
export function createHttpFetchJson(baseUrl: string): FetchJson {
  const origin = baseUrl.replace(/\/+$/, '');
  return async (path: string, init?: RequestInit) => {
    const url = /^https?:\/\//i.test(path) ? path : `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, { cache: 'no-store', ...init });
    if (!res.ok) {
      throw new Error(`fetch ${path} -> HTTP ${res.status}`);
    }
    return res.json();
  };
}
