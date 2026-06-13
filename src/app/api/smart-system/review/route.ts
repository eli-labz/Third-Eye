/**
 * Smart System — human review queue.
 *   GET  /api/smart-system/review            → pending review items
 *   POST /api/smart-system/review            → record a human decision
 *
 * A decision only updates review status + stored record; it executes nothing.
 * 404 when the feature flag is disabled.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSmartSystem } from '@/smart_system';
import type { HumanDecision } from '@/smart_system';
import { disabledResponse } from '../_guard';

const VALID_DECISIONS: HumanDecision[] = ['approve', 'reject', 'request_changes', 'needs_more_info'];

export async function GET() {
  const off = disabledResponse();
  if (off) return off;

  const ss = getSmartSystem();
  const queue = ss.review.queue().map((item) => ({
    reviewId: item.id,
    model: `${item.modelName}@${item.modelVersion}`,
    task: item.task,
    reviewLevel: item.reviewLevel,
    confidence: item.aiVersion.confidence,
    explanation: item.aiVersion.explanation,
    createdAt: item.createdAt,
  }));
  return NextResponse.json({ pending: queue.length, items: queue });
}

export async function POST(request: NextRequest) {
  const off = disabledResponse();
  if (off) return off;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const reviewId = typeof body.reviewId === 'string' ? body.reviewId : '';
  const decidedBy = typeof body.decidedBy === 'string' && body.decidedBy.trim() ? body.decidedBy : 'operator';
  const decision = body.decision as HumanDecision;
  const rationale = typeof body.rationale === 'string' ? body.rationale : undefined;
  const humanVersion = 'humanVersion' in body ? body.humanVersion : undefined;

  if (!reviewId) return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
  if (!VALID_DECISIONS.includes(decision)) {
    return NextResponse.json(
      { error: `decision must be one of ${VALID_DECISIONS.join(', ')}` },
      { status: 400 },
    );
  }

  const ss = getSmartSystem();
  try {
    const item = ss.review.decide(reviewId, { decidedBy, decision, rationale, humanVersion });
    const comparison = ss.review.comparison(reviewId);
    return NextResponse.json({
      ok: true,
      reviewId: item.id,
      status: item.status,
      decisions: item.decisions,
      comparison,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'decision failed' },
      { status: 404 },
    );
  }
}
