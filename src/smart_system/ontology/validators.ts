/**
 * Smart System — ontology validators.
 *
 * Lightweight, dependency-free validation. Each entity has structural rules
 * (required fields, value ranges, geo bounds). Returns an aggregated
 * `ValidationResult` rather than throwing, so the ingestion pipeline can skip
 * and log bad records without crashing.
 */

import type { ValidationResult } from '../types';
import { CLASSIFICATIONS } from '../types';
import { fail } from '../types';
import type {
  AnyEntity,
  EntityBase,
  GeoPoint,
} from './entities';
import { ENTITY_KINDS } from './entities';

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function isNonEmptyString(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

function isIsoTimestamp(s: unknown): boolean {
  if (!isNonEmptyString(s)) return false;
  const t = Date.parse(s);
  return !Number.isNaN(t);
}

function geoErrors(p: GeoPoint | undefined, field: string): string[] {
  const errs: string[] = [];
  if (!p) {
    errs.push(`${field} is required`);
    return errs;
  }
  if (!isFiniteNumber(p.lat) || p.lat < -90 || p.lat > 90) {
    errs.push(`${field}.lat out of range (-90..90)`);
  }
  if (!isFiniteNumber(p.lng) || p.lng < -180 || p.lng > 180) {
    errs.push(`${field}.lng out of range (-180..180)`);
  }
  return errs;
}

function confidenceErrors(c: number | undefined, field = 'confidence'): string[] {
  if (c === undefined) return [];
  if (!isFiniteNumber(c) || c < 0 || c > 1) return [`${field} must be 0..1`];
  return [];
}

/** Validate the fields shared by all entities. */
export function validateBase(e: Partial<EntityBase>): string[] {
  const errs: string[] = [];
  if (!isNonEmptyString(e.id)) errs.push('id is required');
  if (!e.kind || !ENTITY_KINDS.includes(e.kind)) errs.push('kind is invalid');
  if (!isNonEmptyString(e.source)) errs.push('source is required');
  if (!isIsoTimestamp(e.timestamp)) errs.push('timestamp must be ISO-8601');
  if (!e.classification || !CLASSIFICATIONS.includes(e.classification)) {
    errs.push('classification is invalid');
  }
  if (!e.provenance) {
    errs.push('provenance is required');
  } else {
    if (!isNonEmptyString(e.provenance.adapterId)) errs.push('provenance.adapterId is required');
    if (!isIsoTimestamp(e.provenance.ingestedAt)) errs.push('provenance.ingestedAt must be ISO-8601');
    if (typeof e.provenance.simulated !== 'boolean') errs.push('provenance.simulated must be boolean');
  }
  if (!e.audit) {
    errs.push('audit is required');
  } else if (!Array.isArray(e.audit.history) || e.audit.history.length === 0) {
    errs.push('audit.history must be non-empty');
  }
  errs.push(...confidenceErrors(e.confidence));
  return errs;
}

/**
 * Validate any ontology entity. Dispatches on `kind` for entity-specific rules
 * after checking the shared base.
 */
export function validateEntity(e: AnyEntity): ValidationResult {
  const errs = validateBase(e);

  switch (e.kind) {
    case 'Detection':
      if (!isNonEmptyString(e.label)) errs.push('Detection.label is required');
      errs.push(...geoErrors(e.location, 'Detection.location'));
      break;
    case 'SatelliteImage':
      if (!isNonEmptyString(e.satellite)) errs.push('SatelliteImage.satellite is required');
      if (!isFiniteNumber(e.resolutionMeters) || e.resolutionMeters <= 0) {
        errs.push('SatelliteImage.resolutionMeters must be > 0');
      }
      if (!isFiniteNumber(e.cloudCoverPct) || e.cloudCoverPct < 0 || e.cloudCoverPct > 100) {
        errs.push('SatelliteImage.cloudCoverPct must be 0..100');
      }
      if (!Array.isArray(e.footprint) || e.footprint.length < 3) {
        errs.push('SatelliteImage.footprint needs >= 3 points');
      }
      break;
    case 'AreaOfInterest':
      if (!isNonEmptyString(e.name)) errs.push('AreaOfInterest.name is required');
      if (!Array.isArray(e.polygon) || e.polygon.length < 3) {
        errs.push('AreaOfInterest.polygon needs >= 3 points');
      }
      if (!['low', 'medium', 'high'].includes(e.priority)) {
        errs.push('AreaOfInterest.priority is invalid');
      }
      break;
    case 'DroneAsset':
      if (!isNonEmptyString(e.callsign)) errs.push('DroneAsset.callsign is required');
      errs.push(...geoErrors(e.location, 'DroneAsset.location'));
      if (!['idle', 'observing', 'transiting', 'offline'].includes(e.status)) {
        errs.push('DroneAsset.status is invalid');
      }
      break;
    case 'Unit':
      if (!isNonEmptyString(e.designation)) errs.push('Unit.designation is required');
      if (!['friendly', 'unknown'].includes(e.affiliation)) {
        errs.push('Unit.affiliation must be friendly|unknown (decision-support, blue-force only)');
      }
      errs.push(...geoErrors(e.location, 'Unit.location'));
      break;
    case 'Task':
      if (!isNonEmptyString(e.title)) errs.push('Task.title is required');
      if (!['proposed', 'under_review', 'approved', 'rejected'].includes(e.status)) {
        errs.push('Task.status is invalid');
      }
      if (!['observation', 'analysis', 'logistics', 'reporting'].includes(e.category)) {
        errs.push('Task.category must be a non-kinetic, decision-support category');
      }
      break;
    case 'CourseOfAction':
      if (!isNonEmptyString(e.name)) errs.push('CourseOfAction.name is required');
      if (!Array.isArray(e.steps) || e.steps.length === 0) {
        errs.push('CourseOfAction.steps must be non-empty');
      }
      if (e.decisionSupportOnly !== true) {
        errs.push('CourseOfAction.decisionSupportOnly must be true');
      }
      errs.push(...confidenceErrors(e.riskScore, 'CourseOfAction.riskScore'));
      break;
    case 'IntelligenceReport':
      if (!isNonEmptyString(e.title)) errs.push('IntelligenceReport.title is required');
      if (!isNonEmptyString(e.body)) errs.push('IntelligenceReport.body is required');
      break;
    case 'OperationalEvent':
      if (!isNonEmptyString(e.title)) errs.push('OperationalEvent.title is required');
      if (!['info', 'low', 'medium', 'high'].includes(e.severity)) {
        errs.push('OperationalEvent.severity is invalid');
      }
      break;
    case 'HumanReviewDecision':
      if (!isNonEmptyString(e.reviewId)) errs.push('HumanReviewDecision.reviewId is required');
      if (!isNonEmptyString(e.recommendationId)) errs.push('HumanReviewDecision.recommendationId is required');
      if (!isNonEmptyString(e.decidedBy)) errs.push('HumanReviewDecision.decidedBy is required');
      if (!['approve', 'reject', 'request_changes', 'needs_more_info'].includes(e.decision)) {
        errs.push('HumanReviewDecision.decision is invalid');
      }
      break;
    default:
      // Exhaustiveness guard — unreachable for AnyEntity.
      errs.push('unknown entity kind');
  }

  return fail(errs);
}
