/**
 * Smart System — canonical ontology entities.
 *
 * These are the normalized domain objects that downstream apps, models and the
 * human-review loop reason over. Raw feed records are mapped into these shapes
 * by `mappers.ts`. Every entity carries id / source / timestamp / provenance /
 * classification / audit, plus `confidence` where meaningful.
 *
 * Nothing here encodes kinetic action. `Task` and `CourseOfAction` are planning
 * and analysis artifacts only — they are explicitly decision-support, never
 * execution.
 */

import type {
  AuditTrail,
  Classification,
  Provenance,
  ReviewLevel,
} from '../types';
import type { Clock } from '../runtime';

/** Discriminator for the entity union. */
export type EntityKind =
  | 'Detection'
  | 'SatelliteImage'
  | 'AreaOfInterest'
  | 'DroneAsset'
  | 'Unit'
  | 'Task'
  | 'CourseOfAction'
  | 'IntelligenceReport'
  | 'OperationalEvent'
  | 'HumanReviewDecision';

export const ENTITY_KINDS: readonly EntityKind[] = [
  'Detection',
  'SatelliteImage',
  'AreaOfInterest',
  'DroneAsset',
  'Unit',
  'Task',
  'CourseOfAction',
  'IntelligenceReport',
  'OperationalEvent',
  'HumanReviewDecision',
] as const;

/** Simple WGS84 point. */
export interface GeoPoint {
  lat: number;
  lng: number;
  altMeters?: number;
}

/** Fields shared by every ontology entity. */
export interface EntityBase {
  id: string;
  kind: EntityKind;
  /** Human-readable source label, e.g. "Mock Satellite Feed". */
  source: string;
  /** Observation/event time (ISO-8601). */
  timestamp: string;
  /** 0..1 confidence where applicable. */
  confidence?: number;
  classification: Classification;
  provenance: Provenance;
  audit: AuditTrail;
  /** Free-form labels for filtering/search. */
  tags?: string[];
}

// ── Concrete entities ───────────────────────────────────────────────────────

export interface Detection extends EntityBase {
  kind: 'Detection';
  /** Classified object label, e.g. "vehicle", "vessel", "aircraft". */
  label: string;
  location: GeoPoint;
  /** Originating sensor/asset id, if known. */
  sensorId?: string;
  /** Bounding box in normalized image coords [x, y, w, h], if from imagery. */
  bbox?: [number, number, number, number];
}

export interface SatelliteImage extends EntityBase {
  kind: 'SatelliteImage';
  satellite: string;
  footprint: GeoPoint[]; // polygon corners
  /** Ground sample distance in meters. */
  resolutionMeters: number;
  cloudCoverPct: number;
  band?: string;
  sceneUrl?: string; // mock/placeholder only
}

export interface AreaOfInterest extends EntityBase {
  kind: 'AreaOfInterest';
  name: string;
  polygon: GeoPoint[];
  priority: 'low' | 'medium' | 'high';
}

export interface DroneAsset extends EntityBase {
  kind: 'DroneAsset';
  callsign: string;
  platform: string;
  location: GeoPoint;
  headingDeg?: number;
  speedKts?: number;
  /** Sensor/observation status only — never control state. */
  status: 'idle' | 'observing' | 'transiting' | 'offline';
  enduranceMinutes?: number;
}

export interface Unit extends EntityBase {
  kind: 'Unit';
  designation: string;
  /** Friendly-force affiliation only (blue-force visibility). */
  affiliation: 'friendly' | 'unknown';
  echelon?: string;
  location: GeoPoint;
  readiness?: 'green' | 'amber' | 'red';
}

export interface Task extends EntityBase {
  kind: 'Task';
  title: string;
  description: string;
  /** Planning lifecycle — not an execution trigger. */
  status: 'proposed' | 'under_review' | 'approved' | 'rejected';
  assignedTo?: string; // Unit/DroneAsset id reference
  relatedAoi?: string; // AreaOfInterest id
  /** Decision-support category — analysis/observation/logistics only. */
  category: 'observation' | 'analysis' | 'logistics' | 'reporting';
}

export interface CourseOfActionStep {
  order: number;
  description: string;
  estimatedDurationMin?: number;
}

export interface CourseOfAction extends EntityBase {
  kind: 'CourseOfAction';
  name: string;
  summary: string;
  steps: CourseOfActionStep[];
  /** Planning factors used for comparison. */
  riskScore?: number; // 0..1
  estimatedDurationMin?: number;
  resourceFootprint?: string;
  /** Always true — generated options are recommendations to be reviewed. */
  decisionSupportOnly: true;
}

export interface IntelligenceReport extends EntityBase {
  kind: 'IntelligenceReport';
  title: string;
  body: string;
  reportType: 'sigint' | 'osint' | 'humint' | 'imint' | 'general';
  location?: GeoPoint;
  /** Optional model-generated summary (recommendation, not ground truth). */
  summary?: string;
}

export interface OperationalEvent extends EntityBase {
  kind: 'OperationalEvent';
  title: string;
  eventType: string;
  location?: GeoPoint;
  severity: 'info' | 'low' | 'medium' | 'high';
  /** Ids of related entities for timeline correlation. */
  relatedEntityIds?: string[];
}

export type HumanDecision =
  | 'approve'
  | 'reject'
  | 'request_changes'
  | 'needs_more_info';

export interface HumanReviewDecision extends EntityBase {
  kind: 'HumanReviewDecision';
  /** The review item this decision resolves. */
  reviewId: string;
  /** Id of the AI recommendation under review. */
  recommendationId: string;
  decidedBy: string;
  decision: HumanDecision;
  rationale?: string;
  reviewLevel: ReviewLevel;
  /** Snapshot of the AI version at decision time. */
  aiVersionRef: string;
  /** Snapshot of the human-modified version, if any. */
  humanVersionRef?: string;
}

/** Union of every concrete ontology entity. */
export type AnyEntity =
  | Detection
  | SatelliteImage
  | AreaOfInterest
  | DroneAsset
  | Unit
  | Task
  | CourseOfAction
  | IntelligenceReport
  | OperationalEvent
  | HumanReviewDecision;

// ── Factory helpers ─────────────────────────────────────────────────────────

/**
 * Build the shared base for a new entity. Centralizes audit-trail and
 * classification defaults so every entity is consistent and traceable.
 */
export function makeEntityBase(args: {
  id: string;
  kind: EntityKind;
  source: string;
  timestamp: string;
  provenance: Provenance;
  classification?: Classification;
  confidence?: number;
  createdBy?: string;
  clock: Clock;
  tags?: string[];
}): EntityBase {
  const nowIso = args.clock.iso();
  const actor = args.createdBy ?? 'system';
  return {
    id: args.id,
    kind: args.kind,
    source: args.source,
    timestamp: args.timestamp,
    confidence: args.confidence,
    classification: args.classification ?? 'SIMULATED',
    provenance: args.provenance,
    tags: args.tags,
    audit: {
      createdAt: nowIso,
      createdBy: actor,
      updatedAt: nowIso,
      updatedBy: actor,
      history: [{ at: nowIso, actor, action: `created:${args.kind}` }],
    },
  };
}

/** Append an audit event to an entity (returns a new audit trail). */
export function appendAudit(
  trail: AuditTrail,
  entry: { at: string; actor: string; action: string; notes?: string },
): AuditTrail {
  return {
    ...trail,
    updatedAt: entry.at,
    updatedBy: entry.actor,
    history: [...trail.history, entry],
  };
}
