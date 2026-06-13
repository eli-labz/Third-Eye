/**
 * GET /api/smart-system/ontology — list canonical ontology objects.
 * Query: ?kind=Detection&limit=50  (read-only). 404 when flag disabled.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSmartSystem } from '@/smart_system';
import type { EntityKind } from '@/smart_system';
import { disabledResponse } from '../_guard';

const VALID_KINDS = new Set<EntityKind>([
  'Detection', 'SatelliteImage', 'AreaOfInterest', 'DroneAsset', 'Unit',
  'Task', 'CourseOfAction', 'IntelligenceReport', 'OperationalEvent', 'HumanReviewDecision',
]);

export async function GET(request: NextRequest) {
  const off = disabledResponse();
  if (off) return off;

  const ss = getSmartSystem();
  await ss.hydrate();
  const url = new URL(request.url);
  const kindParam = url.searchParams.get('kind') as EntityKind | null;
  const kind = kindParam && VALID_KINDS.has(kindParam) ? kindParam : undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100));

  const entities = ss.repository.query({ kind, limit });
  return NextResponse.json({
    counts: ss.repository.counts(),
    total: ss.repository.size(),
    kind: kind ?? 'all',
    entities,
  });
}
