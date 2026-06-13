/**
 * Smart System — public barrel.
 *
 * MSS-inspired, human-in-the-loop data-fusion capability for Third Eye.
 * Entirely gated behind `ENABLE_MSS_SMART_SYSTEM_MODULE`; decision-support only.
 *
 * Layers: ingestion (real feeds) → ontology → models (advisory) →
 * operational apps → human review. See docs/SMART_SYSTEM.md.
 */

export { SMART_SYSTEM_FLAG, isSmartSystemEnabled, smartSystemStatusReason } from './config';
export { createSmartSystem, getSmartSystem, resetSmartSystem, SmartSystem } from './system';
export type { SmartSystemOptions, AnalysisResult } from './system';

// Types most likely needed by consumers (API routes, tests).
export type {
  Classification,
  SourceType,
  Provenance,
  AuditTrail,
  ReviewLevel,
  ValidationResult,
} from './types';
export type {
  AnyEntity,
  EntityKind,
  Detection,
  SatelliteImage,
  AreaOfInterest,
  DroneAsset,
  Unit,
  Task,
  CourseOfAction,
  IntelligenceReport,
  OperationalEvent,
  HumanReviewDecision,
  HumanDecision,
} from './ontology/entities';
export type { ModelOutput } from './models/base_model';
export type { ReviewItem, ReviewStatus } from './review/review_service';
export type { AuditLogEntry } from './review/audit_log';
export type { IngestionRuntime } from './ingestion/ingestion_service';
