/**
 * Smart System — human-in-the-loop review service.
 *
 * AI recommendations enter a PENDING state. A human reviewer can approve,
 * reject, request changes, or mark needs-more-information. Every decision is
 * logged (audit) and recorded as a `HumanReviewDecision` ontology entity. Both
 * the AI-generated version and any human-modified version are preserved, and a
 * side-by-side comparison is available.
 *
 * Nothing here executes anything in the real world — a decision only changes
 * review status and the stored record.
 */

import type { ReviewLevel } from '../types';
import type { Clock, IdGen } from '../runtime';
import type { Logger } from '../logger';
import type { OntologyRepository } from '../ontology/repository';
import type { HumanDecision, HumanReviewDecision } from '../ontology/entities';
import { makeEntityBase } from '../ontology/entities';
import type { ModelOutput } from '../models/base_model';
import type { AuditLog } from './audit_log';
import type { DecisionComparison } from './decision_comparison';
import { compareDecision } from './decision_comparison';

export type ReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'needs_more_info';

const DECISION_TO_STATUS: Record<HumanDecision, ReviewStatus> = {
  approve: 'approved',
  reject: 'rejected',
  request_changes: 'changes_requested',
  needs_more_info: 'needs_more_info',
};

export interface ReviewDecisionRecord {
  at: string;
  decidedBy: string;
  decision: HumanDecision;
  rationale?: string;
  /** Id of the persisted HumanReviewDecision entity. */
  decisionEntityId: string;
}

export interface ReviewItem {
  id: string;
  recommendationId: string;
  modelName: string;
  modelVersion: string;
  task: string;
  createdAt: string;
  status: ReviewStatus;
  reviewLevel: ReviewLevel;
  /** Immutable snapshot of the AI recommendation under review. */
  aiVersion: ModelOutput;
  /** Human-modified recommendation payload, if a reviewer supplied one. */
  humanVersion?: unknown;
  decisions: ReviewDecisionRecord[];
}

export interface DecideInput {
  decidedBy: string;
  decision: HumanDecision;
  rationale?: string;
  /** Optional human-edited recommendation payload to preserve alongside the AI one. */
  humanVersion?: unknown;
}

export interface ReviewServiceDeps {
  repository: OntologyRepository;
  auditLog: AuditLog;
  clock: Clock;
  idGen: IdGen;
  logger: Logger;
}

export class ReviewService {
  private readonly items = new Map<string, ReviewItem>();

  constructor(private readonly deps: ReviewServiceDeps) {}

  /** Submit an AI recommendation for human review (enters PENDING). */
  submit(output: ModelOutput): ReviewItem {
    const item: ReviewItem = {
      id: this.deps.idGen.next('review'),
      recommendationId: output.id,
      modelName: output.modelName,
      modelVersion: output.modelVersion,
      task: output.task,
      createdAt: this.deps.clock.iso(),
      status: 'pending',
      reviewLevel: output.recommendedReviewLevel,
      aiVersion: output,
      decisions: [],
    };
    this.items.set(item.id, item);
    this.deps.auditLog.record({
      actor: 'system',
      type: 'recommendation_submitted',
      subjectId: item.id,
      summary: `${output.modelName}@${output.modelVersion} ${output.task} submitted for review (level=${output.recommendedReviewLevel})`,
      details: { recommendationId: output.id, confidence: output.confidence },
    });
    this.deps.logger.info(`review submitted ${item.id} (${output.task})`);
    return item;
  }

  /** Pending queue (newest-first), optionally limited by review level. */
  queue(level?: ReviewLevel): ReviewItem[] {
    let items = Array.from(this.items.values()).filter((i) => i.status === 'pending');
    if (level) items = items.filter((i) => i.reviewLevel === level);
    return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  list(): ReviewItem[] {
    return Array.from(this.items.values()).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }

  get(reviewId: string): ReviewItem | undefined {
    return this.items.get(reviewId);
  }

  /**
   * Record a human decision. Preserves AI + human versions, persists a
   * HumanReviewDecision entity, and logs the event. Returns the updated item.
   */
  decide(reviewId: string, input: DecideInput): ReviewItem {
    const item = this.items.get(reviewId);
    if (!item) throw new Error(`review item not found: ${reviewId}`);

    const at = this.deps.clock.iso();
    if (input.humanVersion !== undefined) {
      item.humanVersion = input.humanVersion;
      this.deps.auditLog.record({
        actor: input.decidedBy,
        type: 'human_version_saved',
        subjectId: item.id,
        summary: 'human-modified version saved alongside AI recommendation',
      });
    }

    // Persist the decision as an ontology entity (auditable, queryable).
    const decisionEntity: HumanReviewDecision = {
      ...makeEntityBase({
        id: this.deps.idGen.next('decision'),
        kind: 'HumanReviewDecision',
        source: 'human-review',
        timestamp: at,
        classification: 'SIMULATED',
        provenance: {
          adapterId: 'review-service',
          sourceType: 'operational',
          ingestedAt: at,
          pipeline: ['human-review', input.decision],
          simulated: true,
        },
        createdBy: input.decidedBy,
        clock: this.deps.clock,
        tags: ['review', input.decision],
      }),
      kind: 'HumanReviewDecision',
      reviewId: item.id,
      recommendationId: item.recommendationId,
      decidedBy: input.decidedBy,
      decision: input.decision,
      rationale: input.rationale,
      reviewLevel: item.reviewLevel,
      aiVersionRef: item.recommendationId,
      humanVersionRef: input.humanVersion !== undefined ? item.id : undefined,
    };
    this.deps.repository.upsert(decisionEntity);

    item.status = DECISION_TO_STATUS[input.decision];
    item.decisions.push({
      at,
      decidedBy: input.decidedBy,
      decision: input.decision,
      rationale: input.rationale,
      decisionEntityId: decisionEntity.id,
    });

    this.deps.auditLog.record({
      actor: input.decidedBy,
      type: 'review_decided',
      subjectId: item.id,
      summary: `decision=${input.decision} -> status=${item.status}`,
      details: { rationale: input.rationale, decisionEntityId: decisionEntity.id },
    });
    this.deps.logger.info(`review ${item.id} decided: ${input.decision}`);
    return item;
  }

  /** Side-by-side AI-vs-human comparison for a review item. */
  comparison(reviewId: string): DecisionComparison {
    const item = this.items.get(reviewId);
    if (!item) throw new Error(`review item not found: ${reviewId}`);
    return compareDecision(item.aiVersion.recommendation, item.humanVersion);
  }

  /** Export all review items (newest-first) — for snapshot persistence. */
  exportItems(): ReviewItem[] {
    return this.list();
  }

  /** Replace all review items from a persisted snapshot. */
  replaceItems(items: ReviewItem[]): void {
    this.items.clear();
    for (const item of items) this.items.set(item.id, item);
  }
}
