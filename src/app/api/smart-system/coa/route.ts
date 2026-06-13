/**
 * GET /api/smart-system/coa — generate + rank non-kinetic, decision-support
 * Courses of Action for human comparison. Read/analysis only; selection
 * requires human approval via the review endpoint. 404 when flag disabled.
 */

import { NextResponse } from 'next/server';
import { getSmartSystem } from '@/smart_system';
import { disabledResponse } from '../_guard';

export async function GET() {
  const off = disabledResponse();
  if (off) return off;

  const ss = getSmartSystem();
  await ss.hydrate();
  const { generated, comparison } = ss.coa.compare();
  return NextResponse.json({
    decisionSupportOnly: true,
    explanation: generated.explanation,
    uncertaintyNotes: generated.uncertaintyNotes,
    recommendedReviewLevel: generated.recommendedReviewLevel,
    comparison,
    coursesOfAction: generated.recommendation.coursesOfAction,
  });
}
