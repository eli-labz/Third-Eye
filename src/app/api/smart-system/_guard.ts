/**
 * Shared guard for Smart System API routes.
 *
 * Every route is gated by `ENABLE_MSS_SMART_SYSTEM_MODULE`. When the flag is
 * off the routes behave as if they do not exist (HTTP 404), so the feature is
 * fully invisible by default. This file is not a route (it does not export
 * HTTP handlers), so Next ignores it for routing.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRunKey, isSmartSystemEnabled } from '@/smart_system';

/** Returns a 404 response when the module is disabled, else null. */
export function disabledResponse(): NextResponse | null {
  if (isSmartSystemEnabled()) return null;
  return NextResponse.json(
    { error: 'Not found', reason: 'ENABLE_MSS_SMART_SYSTEM_MODULE is not enabled' },
    { status: 404 },
  );
}

/** Resolve the request origin for server-side feed fetches. */
export function originOf(request: NextRequest): string {
  return new URL(request.url).origin;
}

/**
 * Guards the heavy /run endpoint. When SMART_SYSTEM_RUN_KEY is set, the caller
 * must supply it via `x-smart-system-key` header or `?key=`. Returns a 401
 * response on mismatch, else null. Open (null) when no key is configured.
 */
export function runKeyResponse(request: NextRequest): NextResponse | null {
  const headerKey = request.headers.get('x-smart-system-key');
  const queryKey = new URL(request.url).searchParams.get('key');
  if (checkRunKey(headerKey ?? queryKey)) return null;
  return NextResponse.json(
    { error: 'Unauthorized', reason: 'valid SMART_SYSTEM_RUN_KEY required for /run' },
    { status: 401 },
  );
}
