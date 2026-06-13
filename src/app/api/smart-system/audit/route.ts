/**
 * GET /api/smart-system/audit — append-only audit log of AI + human decision
 * events. Read-only. 404 when the feature flag is disabled.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSmartSystem } from '@/smart_system';
import { disabledResponse } from '../_guard';

export async function GET(request: NextRequest) {
  const off = disabledResponse();
  if (off) return off;

  const ss = getSmartSystem();
  await ss.hydrate();
  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100));
  const entries = ss.auditLog.query({ limit });
  return NextResponse.json({ total: ss.auditLog.size(), entries });
}
