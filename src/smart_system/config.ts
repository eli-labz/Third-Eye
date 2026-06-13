/**
 * Smart System — feature-flag configuration.
 *
 * The entire MSS-inspired data-fusion capability is gated behind a single
 * feature flag so it is fully reversible and invisible by default:
 *
 *     ENABLE_MSS_SMART_SYSTEM_MODULE=true
 *
 * The flag is read from `process.env`. It is also surfaced to the client
 * bundle via the `env` mapping in `next.config.ts`, so the exact same name
 * works on both server (API routes) and client (GUI nav visibility).
 *
 * Decision-support only: nothing in this module performs autonomous,
 * kinetic, or real-world operational tasking. All outputs are simulation-safe
 * recommendations that require explicit human confirmation.
 */

export const SMART_SYSTEM_FLAG = 'ENABLE_MSS_SMART_SYSTEM_MODULE' as const;

/** Truthy values accepted for the flag (case-insensitive). */
const TRUTHY = new Set(['1', 'true', 'yes', 'on', 'enabled']);

/**
 * Returns true when the Smart System module is enabled.
 *
 * Reads `process.env.ENABLE_MSS_SMART_SYSTEM_MODULE`. Safe to call on both
 * server and client (the value is inlined client-side at build time).
 */
export function isSmartSystemEnabled(): boolean {
  // IMPORTANT: use the *literal* `process.env.ENABLE_MSS_SMART_SYSTEM_MODULE`.
  // Next's `env` config in next.config.ts statically inlines this exact token
  // into both the server and client bundles at build time, so the same flag
  // controls server routes and client nav visibility. (A dynamic
  // `process.env[var]` would NOT be inlined into the browser bundle.)
  // In Node/test runtime this simply reads the live environment variable.
  const raw = process.env.ENABLE_MSS_SMART_SYSTEM_MODULE;
  if (!raw) return false;
  return TRUTHY.has(String(raw).trim().toLowerCase());
}

/** Human-readable reason string for status surfaces / diagnostics. */
export function smartSystemStatusReason(): string {
  return isSmartSystemEnabled()
    ? `enabled via ${SMART_SYSTEM_FLAG}`
    : `disabled (set ${SMART_SYSTEM_FLAG}=true to enable)`;
}

// ── /run guard (server-only secret) ──────────────────────────────────────────
// SMART_SYSTEM_RUN_KEY protects the heavy POST /api/smart-system/run endpoint
// from public abuse. Bracket access keeps it OUT of the client bundle — it is
// only ever read server-side. When unset, /run is open (recommended to set it
// on any public deployment).

export const SMART_SYSTEM_RUN_KEY_VAR = 'SMART_SYSTEM_RUN_KEY' as const;

/** True when a run key is configured (so /run requires authorization). */
export function isRunKeyConfigured(): boolean {
  return Boolean(process.env[SMART_SYSTEM_RUN_KEY_VAR]);
}

/**
 * Validate a caller-supplied run key. Returns true when no key is configured
 * (open) or when the supplied value matches the configured secret.
 */
export function checkRunKey(provided: string | null | undefined): boolean {
  const expected = process.env[SMART_SYSTEM_RUN_KEY_VAR];
  if (!expected) return true; // no key set → endpoint is open
  return typeof provided === 'string' && provided.length > 0 && provided === expected;
}
