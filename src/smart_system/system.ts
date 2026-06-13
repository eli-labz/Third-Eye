/**
 * Smart System — composition root (dependency injection).
 *
 * Wires every layer together and exposes high-level orchestration:
 *   ingest (real feeds) → ontology → model recommendations → human review.
 *
 * `createSmartSystem()` builds a fresh, fully-injected instance (used by tests).
 * `getSmartSystem()` returns a lazy module-singleton for API routes so review
 * state and the audit log persist across requests within a server instance.
 *
 * Everything here is decision-support only: model outputs are advisory and are
 * routed into a human-review queue, never executed.
 */

import type { Clock, IdGen } from './runtime';
import { systemClock, systemIdGen } from './runtime';
import type { Logger } from './logger';
import { createLogger } from './logger';

import { OntologyRepository } from './ontology/repository';

import type { IngestionRuntime } from './ingestion/ingestion_service';
import { IngestionService } from './ingestion/ingestion_service';
import { FlightsAdapter } from './ingestion/flights_adapter';
import { MaritimeAdapter } from './ingestion/maritime_adapter';
import { SatellitesAdapter } from './ingestion/satellites_adapter';
import { EarthquakesAdapter } from './ingestion/earthquakes_adapter';
import { GdeltAdapter } from './ingestion/gdelt_adapter';
import { NewsAdapter } from './ingestion/news_adapter';

import type { ModelContext, ModelOutput } from './models/base_model';
import { ModelRegistry } from './models/model_registry';
import { MockCvModel } from './models/mock_cv_model';
import { MockAnomalyModel } from './models/mock_anomaly_model';
import { MockLlmPlanner } from './models/mock_llm_planner';
import { RiskScoringService } from './models/risk_scoring_service';

import { ImageryService } from './apps/imagery_service';
import { AssetTrackingService } from './apps/asset_tracking_service';
import { CourseOfActionService } from './apps/course_of_action_service';
import { TimelineService } from './apps/timeline_service';

import { AuditLog } from './review/audit_log';
import { ReviewService } from './review/review_service';

import type { Detection, OperationalEvent } from './ontology/entities';

export interface SmartSystemOptions {
  clock?: Clock;
  idGen?: IdGen;
  logger?: Logger;
}

/** Result of an end-to-end analysis pass. */
export interface AnalysisResult {
  recommendations: ModelOutput[];
  reviewItemIds: string[];
}

export class SmartSystem {
  readonly clock: Clock;
  readonly idGen: IdGen;
  readonly logger: Logger;

  readonly repository: OntologyRepository;
  readonly ingestion: IngestionService;
  readonly models: ModelRegistry;

  readonly cv: MockCvModel;
  readonly anomaly: MockAnomalyModel;
  readonly planner: MockLlmPlanner;
  readonly risk: RiskScoringService;

  readonly imagery: ImageryService;
  readonly assets: AssetTrackingService;
  readonly coa: CourseOfActionService;
  readonly timeline: TimelineService;

  readonly auditLog: AuditLog;
  readonly review: ReviewService;

  constructor(opts: SmartSystemOptions = {}) {
    this.clock = opts.clock ?? systemClock;
    this.idGen = opts.idGen ?? systemIdGen;
    this.logger = opts.logger ?? createLogger();

    // Ontology
    this.repository = new OntologyRepository(this.clock, this.logger);

    // Ingestion — register the real internal-feed adapters.
    this.ingestion = new IngestionService({
      repository: this.repository,
      clock: this.clock,
      idGen: this.idGen,
      logger: this.logger,
    });
    this.ingestion
      .registerAdapter(new FlightsAdapter())
      .registerAdapter(new MaritimeAdapter())
      .registerAdapter(new SatellitesAdapter())
      .registerAdapter(new EarthquakesAdapter())
      .registerAdapter(new GdeltAdapter())
      .registerAdapter(new NewsAdapter());

    // Models
    this.cv = new MockCvModel();
    this.anomaly = new MockAnomalyModel();
    this.planner = new MockLlmPlanner();
    this.risk = new RiskScoringService();
    this.models = new ModelRegistry(this.logger);
    this.models
      .register(this.cv)
      .register(this.anomaly)
      .register(this.planner)
      .register(this.risk);

    // Operational apps
    this.imagery = new ImageryService(this.repository, this.cv, this.clock, this.idGen, this.logger);
    this.assets = new AssetTrackingService(this.repository, this.logger);
    this.coa = new CourseOfActionService(this.repository, this.planner, this.clock, this.idGen, this.logger);
    this.timeline = new TimelineService(this.repository);

    // Human-in-the-loop review
    this.auditLog = new AuditLog(this.clock);
    this.review = new ReviewService({
      repository: this.repository,
      auditLog: this.auditLog,
      clock: this.clock,
      idGen: this.idGen,
      logger: this.logger,
    });
  }

  private modelCtx(): ModelContext {
    return { clock: this.clock, idGen: this.idGen, logger: this.logger };
  }

  /** Pull all real feeds into the ontology. */
  async ingest(runtime: IngestionRuntime) {
    const summary = await this.ingestion.ingestAll(runtime);
    this.auditLog.record({
      actor: 'system',
      type: 'ingestion_run',
      subjectId: 'ingestion',
      summary: `ingested ${summary.entitiesStored} entities from ${summary.adaptersRun} feed(s)`,
      details: { rawRecords: summary.rawRecords, rejected: summary.entitiesRejected },
    });
    return summary;
  }

  /**
   * Run all models over current ontology data and route each output into the
   * human-review queue as PENDING. Returns the recommendations + review ids.
   */
  analyze(): AnalysisResult {
    const ctx = this.modelCtx();
    const detections = this.repository.query({ kind: 'Detection' }) as Detection[];
    const images = this.repository.query({ kind: 'SatelliteImage' }) as never[];
    const events = this.repository.query({ kind: 'OperationalEvent' }) as OperationalEvent[];
    const reports = this.repository.query({ kind: 'IntelligenceReport' }) as never[];

    const cvOut = this.cv.summarize(detections, images, ctx);
    const anomalyOut = this.anomaly.detect(detections, ctx);
    const reportOut = this.planner.summarizeReports(reports, ctx);
    const riskOut = this.risk.score(
      { events, detections, anomalyCount: anomalyOut.recommendation.anomalies.length },
      ctx,
    );

    const recommendations: ModelOutput[] = [cvOut, anomalyOut, reportOut, riskOut];
    const reviewItemIds = recommendations.map((r) => this.review.submit(r).id);
    return { recommendations, reviewItemIds };
  }

  /** Convenience: ingest then analyze. */
  async ingestAndAnalyze(runtime: IngestionRuntime): Promise<AnalysisResult> {
    await this.ingest(runtime);
    return this.analyze();
  }
}

/** Build a fresh, fully-wired Smart System (used by tests + per-need callers). */
export function createSmartSystem(opts: SmartSystemOptions = {}): SmartSystem {
  return new SmartSystem(opts);
}

// ── Module singleton for API routes ─────────────────────────────────────────
let singleton: SmartSystem | null = null;

/** Lazy singleton so review state / audit log persist across requests. */
export function getSmartSystem(): SmartSystem {
  if (!singleton) singleton = createSmartSystem();
  return singleton;
}

/** Test helper — reset the singleton. */
export function resetSmartSystem(): void {
  singleton = null;
}
