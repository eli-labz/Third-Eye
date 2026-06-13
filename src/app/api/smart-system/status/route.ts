/**
 * GET /api/smart-system/status — Data Feed Status + module overview.
 * Read-only. 404 when the feature flag is disabled.
 */

import { NextResponse } from 'next/server';
import { getSmartSystem, isRunKeyConfigured, smartSystemStatusReason } from '@/smart_system';
import { disabledResponse } from '../_guard';

export async function GET() {
  const off = disabledResponse();
  if (off) return off;

  const ss = getSmartSystem();
  await ss.hydrate();
  return NextResponse.json({
    enabled: true,
    reason: smartSystemStatusReason(),
    decisionSupportOnly: true,
    persistence: ss.persistenceKind,
    runRequiresKey: isRunKeyConfigured(),
    feeds: ss.ingestion.feedStatus(),
    ontologyCounts: ss.ontologyCounts(),
    ontologyTotal: ss.ontologyTotal(),
    models: ss.models.list(),
    reviewQueue: ss.review.queue().length,
    reviewTotal: ss.review.list().length,
    auditEntries: ss.auditLog.size(),
    timestamp: new Date().toISOString(),
  });
}
