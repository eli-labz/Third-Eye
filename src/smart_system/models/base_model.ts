/**
 * Smart System — model layer base types.
 *
 * Every model output is an *advisory recommendation*, never a decision. The
 * `ModelOutput` envelope makes that explicit and carries the metadata required
 * for explainability and human review:
 *   - model name + version
 *   - input references (entity ids)
 *   - confidence score
 *   - explanation + uncertainty notes
 *   - recommended human review level
 *   - `advisoryOnly: true` invariant
 */

import type { ReviewLevel } from '../types';
import type { Clock, IdGen } from '../runtime';
import type { Logger } from '../logger';

export interface ModelContext {
  clock: Clock;
  idGen: IdGen;
  logger: Logger;
}

/** Metadata describing a registered model. */
export interface ModelInfo {
  name: string;
  version: string;
  /** Capability, e.g. 'object_detection_summary', 'anomaly_detection'. */
  task: string;
  description: string;
}

/** Advisory recommendation envelope produced by every model call. */
export interface ModelOutput<T = unknown> {
  id: string;
  modelName: string;
  modelVersion: string;
  task: string;
  /** Ontology entity ids that informed this output. */
  inputRefs: string[];
  createdAt: string;
  /** 0..1 overall confidence. */
  confidence: number;
  /** Plain-language rationale (explainability). */
  explanation: string;
  /** Known limitations / sources of uncertainty. */
  uncertaintyNotes: string;
  /** How much human scrutiny this recommendation warrants. */
  recommendedReviewLevel: ReviewLevel;
  /** The recommendation payload — decision-support content only. */
  recommendation: T;
  /** Hard invariant: model output is advisory, never executed. */
  advisoryOnly: true;
}

/** A model: metadata + (optionally) a registry-uniform describe(). */
export interface Model extends ModelInfo {
  info(): ModelInfo;
}

/**
 * Base class providing the shared output-envelope builder. Concrete models
 * extend this and expose typed domain methods that return `ModelOutput<T>`.
 */
export abstract class BaseModel implements Model {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly task: string;
  abstract readonly description: string;

  info(): ModelInfo {
    return { name: this.name, version: this.version, task: this.task, description: this.description };
  }

  /** Build a fully-populated advisory output envelope. */
  protected buildOutput<T>(
    ctx: ModelContext,
    args: {
      task?: string;
      inputRefs: string[];
      confidence: number;
      explanation: string;
      uncertaintyNotes: string;
      recommendedReviewLevel: ReviewLevel;
      recommendation: T;
    },
  ): ModelOutput<T> {
    const clamped = Math.max(0, Math.min(1, args.confidence));
    return {
      id: ctx.idGen.next('rec'),
      modelName: this.name,
      modelVersion: this.version,
      task: args.task ?? this.task,
      inputRefs: args.inputRefs,
      createdAt: ctx.clock.iso(),
      confidence: clamped,
      explanation: args.explanation,
      uncertaintyNotes: args.uncertaintyNotes,
      recommendedReviewLevel: args.recommendedReviewLevel,
      recommendation: args.recommendation,
      advisoryOnly: true,
    };
  }
}
