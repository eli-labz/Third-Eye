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
import { isSmartSystemEnabled } from '@/smart_system';

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
