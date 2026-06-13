import { describe, expect, it } from 'vitest';
import { OntologyRepository } from '../ontology/repository';
import { AuditLog } from '../review/audit_log';
import { ReviewService } from '../review/review_service';
import { compareDecision } from '../review/decision_comparison';
import type { ModelOutput } from '../models/base_model';
import { deterministic } from './helpers';

function fakeOutput(idGen: { next: (p?: string) => string }, clock: { iso: () => string }): ModelOutput {
  return {
    id: idGen.next('rec'),
    modelName: 'unit-model',
    modelVersion: '0.0.1',
    task: 'unit_task',
    inputRefs: ['x1'],
    createdAt: clock.iso(),
    confidence: 0.7,
    explanation: 'because reasons',
    uncertaintyNotes: 'limited data',
    recommendedReviewLevel: 'analyst',
    recommendation: { decision: 'observe', value: 1 },
    advisoryOnly: true,
  };
}

function buildReview() {
  const { clock, idGen, logger } = deterministic();
  const repository = new OntologyRepository(clock, logger);
  const auditLog = new AuditLog(clock);
  const review = new ReviewService({ repository, auditLog, clock, idGen, logger });
  return { review, repository, auditLog, clock, idGen };
}

describe('human-in-the-loop review', () => {
  it('submitted recommendations enter a PENDING queue', () => {
    const { review, idGen, clock } = buildReview();
    const item = review.submit(fakeOutput(idGen, clock));
    expect(item.status).toBe('pending');
    expect(review.queue()).toHaveLength(1);
  });

  it('supports approve / reject / request_changes / needs_more_info', () => {
    const cases: Array<[string, string]> = [
      ['approve', 'approved'],
      ['reject', 'rejected'],
      ['request_changes', 'changes_requested'],
      ['needs_more_info', 'needs_more_info'],
    ];
    for (const [decision, expected] of cases) {
      const { review, idGen, clock } = buildReview();
      const item = review.submit(fakeOutput(idGen, clock));
      const updated = review.decide(item.id, { decidedBy: 'analyst-1', decision: decision as never });
      expect(updated.status).toBe(expected);
      expect(review.queue()).toHaveLength(0); // no longer pending
    }
  });

  it('logs every decision and persists a HumanReviewDecision entity', () => {
    const { review, repository, auditLog, idGen, clock } = buildReview();
    const item = review.submit(fakeOutput(idGen, clock));
    review.decide(item.id, { decidedBy: 'analyst-1', decision: 'approve', rationale: 'looks fine' });

    expect(auditLog.query({ type: 'recommendation_submitted' })).toHaveLength(1);
    expect(auditLog.query({ type: 'review_decided' })).toHaveLength(1);
    expect(repository.counts().HumanReviewDecision).toBe(1);
  });

  it('preserves both AI and human-modified versions and compares them', () => {
    const { review, idGen, clock } = buildReview();
    const item = review.submit(fakeOutput(idGen, clock));
    review.decide(item.id, {
      decidedBy: 'analyst-1',
      decision: 'request_changes',
      humanVersion: { decision: 'observe', value: 2 }, // value 1 -> 2
    });
    const stored = review.get(item.id)!;
    expect(stored.aiVersion.recommendation).toEqual({ decision: 'observe', value: 1 });
    expect(stored.humanVersion).toEqual({ decision: 'observe', value: 2 });

    const cmp = review.comparison(item.id);
    expect(cmp.changed).toBe(true);
    expect(cmp.changes.some((c) => c.path === 'value' && c.kind === 'changed')).toBe(true);
  });

  it('compareDecision reports no change when human accepts verbatim', () => {
    const cmp = compareDecision({ a: 1 }, undefined);
    expect(cmp.changed).toBe(false);
  });

  it('throws on an unknown review id', () => {
    const { review } = buildReview();
    expect(() => review.decide('missing', { decidedBy: 'x', decision: 'approve' })).toThrow();
  });
});
