/**
 * GET /api/smart-system/recommendations — AI recommendations and their review
 * status. Read-only. 404 when the feature flag is disabled.
 */

import { NextResponse } from 'next/server';
import { getSmartSystem } from '@/smart_system';
import { disabledResponse } from '../_guard';

export async function GET() {
  const off = disabledResponse();
  if (off) return off;

  const ss = getSmartSystem();
  await ss.hydrate();
  const items = ss.review.list().map((item) => ({
    reviewId: item.id,
    recommendationId: item.recommendationId,
    model: `${item.modelName}@${item.modelVersion}`,
    task: item.task,
    status: item.status,
    reviewLevel: item.reviewLevel,
    createdAt: item.createdAt,
    confidence: item.aiVersion.confidence,
    explanation: item.aiVersion.explanation,
    uncertaintyNotes: item.aiVersion.uncertaintyNotes,
    recommendation: item.aiVersion.recommendation,
    advisoryOnly: item.aiVersion.advisoryOnly,
  }));
  return NextResponse.json({ count: items.length, items });
}
