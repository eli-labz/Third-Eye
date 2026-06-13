/**
 * Smart System — minimal Upstash/Vercel-KV REST client.
 *
 * Uses the Upstash Redis REST API (the same backend Vercel KV provisions),
 * driven entirely by two env vars that Vercel KV / Upstash inject:
 *   KV_REST_API_URL, KV_REST_API_TOKEN
 *
 * No new SDK dependency — just `fetch` (the project's existing pattern). When
 * the vars are absent the client is unavailable and the Smart System falls back
 * to its in-memory store, so default behavior is unchanged.
 */

export interface KvClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

// Accept either naming convention so any provisioning path works:
//   Vercel KV → KV_REST_API_URL / KV_REST_API_TOKEN
//   Upstash   → UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
function kvUrl(): string | undefined {
  return process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
}
function kvToken(): string | undefined {
  return process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
}

/** True when KV credentials are configured in the environment. */
export function isKvConfigured(): boolean {
  return Boolean(kvUrl() && kvToken());
}

/** Build a KV client from env, or null when not configured. */
export function createKvClient(): KvClient | null {
  const url = kvUrl();
  const token = kvToken();
  if (!url || !token) return null;
  const base = url.replace(/\/+$/, '');

  async function command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`KV command failed: HTTP ${res.status}`);
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) throw new Error(`KV error: ${json.error}`);
    return json.result;
  }

  return {
    async get(key: string): Promise<string | null> {
      const result = await command(['GET', key]);
      return typeof result === 'string' ? result : null;
    },
    async set(key: string, value: string): Promise<void> {
      await command(['SET', key, value]);
    },
  };
}
