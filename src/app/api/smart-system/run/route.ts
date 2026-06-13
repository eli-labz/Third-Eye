/**
 * POST /api/smart-system/run — ingest real feeds, then run advisory models and
 * enqueue recommendations for human review. This is the only "action" endpoint
 * and it performs NO real-world tasking — it reads feeds and produces review
 * items. 404 when the feature flag is disabled.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSmartSystem } from '@/smart_system';
import { disabledResponse, originOf, runKeyResponse } from '../_guard';

export async function POST(request: NextRequest) {
  const off = disabledResponse();
  if (off) return off;
  const unauthorized = runKeyResponse(request);
  if (unauthorized) return unauthorized;

  try {
    const ss = getSmartSystem();
    await ss.hydrate(); // load persisted state so review/audit survive the run
    const ingestion = await ss.ingest({ baseUrl: originOf(request) });
    const analysis = ss.analyze();
    await ss.persist(); // snapshot new state so it survives across requests
    return NextResponse.json({
      ok: true,
      ingestion,
      recommendations: analysis.recommendations.length,
      reviewItemIds: analysis.reviewItemIds,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'fusion run failed' },
      { status: 500 },
    );
  }
}
