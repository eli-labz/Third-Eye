/**
 * Course-of-Action comparison service.
 *
 * Generates non-kinetic, decision-support COAs via the planner and presents a
 * ranked comparison (risk / duration / footprint) for human selection. Nothing
 * here executes — output is a comparison artifact for review.
 */

import type { Clock, IdGen } from '../runtime';
import type { Logger } from '../logger';
import type { OntologyRepository } from '../ontology/repository';
import type {
  AreaOfInterest,
  CourseOfAction,
  IntelligenceReport,
  OperationalEvent,
} from '../ontology/entities';
import type { ModelContext, ModelOutput } from '../models/base_model';
import type { CoaSet, MockLlmPlanner } from '../models/mock_llm_planner';

export interface CoaComparisonRow {
  id: string;
  name: string;
  summary: string;
  riskScore: number;
  estimatedDurationMin: number;
  resourceFootprint: string;
  rank: number;
}

export interface CoaComparison {
  generated: ModelOutput<CoaSet>;
  /** Ranked low-risk-first; advisory only — selection requires human approval. */
  comparison: CoaComparisonRow[];
}

export class CourseOfActionService {
  constructor(
    private readonly repo: OntologyRepository,
    private readonly planner: MockLlmPlanner,
    private readonly clock: Clock,
    private readonly idGen: IdGen,
    private readonly logger: Logger,
  ) {}

  private modelCtx(): ModelContext {
    return { clock: this.clock, idGen: this.idGen, logger: this.logger };
  }

  /** Generate COAs from current real context and return a ranked comparison. */
  compare(): CoaComparison {
    const aoi = (this.repo.query({ kind: 'AreaOfInterest', limit: 1 })[0] as AreaOfInterest) ?? undefined;
    const reports = this.repo.query({ kind: 'IntelligenceReport', limit: 20 }) as IntelligenceReport[];
    const events = this.repo.query({ kind: 'OperationalEvent', limit: 50 }) as OperationalEvent[];

    const generated = this.planner.generateCoursesOfAction({ aoi, reports, events }, this.modelCtx());

    const rows: CoaComparisonRow[] = generated.recommendation.coursesOfAction
      .map((coa: CourseOfAction) => ({
        id: coa.id,
        name: coa.name,
        summary: coa.summary,
        riskScore: coa.riskScore ?? 0,
        estimatedDurationMin: coa.estimatedDurationMin ?? 0,
        resourceFootprint: coa.resourceFootprint ?? 'n/a',
        rank: 0,
      }))
      .sort((a, b) => a.riskScore - b.riskScore)
      .map((row, i) => ({ ...row, rank: i + 1 }));

    this.logger.info(`COA comparison: ${rows.length} option(s) ranked (advisory)`);
    return { generated, comparison: rows };
  }
}
