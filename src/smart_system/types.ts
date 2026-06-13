/**
 * Smart System — shared primitive types.
 *
 * Cross-cutting value types used by every layer: classification markers,
 * provenance, audit trails and confidence/review semantics.
 */

/**
 * Sensitivity / classification marker. The project does not (yet) ship a
 * security-label system, so we provide a conservative, simulation-safe set.
 * All mock data is tagged `SIMULATED`.
 */
export type Classification =
  | 'SIMULATED'
  | 'UNCLASSIFIED'
  | 'OFFICIAL'
  | 'CONFIDENTIAL'
  | 'SECRET';

export const CLASSIFICATIONS: readonly Classification[] = [
  'SIMULATED',
  'UNCLASSIFIED',
  'OFFICIAL',
  'CONFIDENTIAL',
  'SECRET',
] as const;

/** Canonical feed/source categories the ingestion layer understands. */
export type SourceType =
  | 'satellite'
  | 'drone'
  | 'live_tracks'
  | 'reports'
  | 'blue_force'
  | 'operational';

export const SOURCE_TYPES: readonly SourceType[] = [
  'satellite',
  'drone',
  'live_tracks',
  'reports',
  'blue_force',
  'operational',
] as const;

/** Where a piece of data came from and how it was processed. */
export interface Provenance {
  /** Id of the adapter that produced the raw record. */
  adapterId: string;
  /** Canonical source category. */
  sourceType: SourceType;
  /** Original/native id from the upstream feed, if any. */
  originalId?: string;
  /** When the record entered the pipeline (ISO-8601). */
  ingestedAt: string;
  /** Ordered processing steps applied to this record. */
  pipeline: string[];
  /** True for all mock/simulated data — never real-world tasking. */
  simulated: boolean;
}

/** A single audit-trail event. */
export interface AuditEntry {
  at: string; // ISO-8601
  actor: string; // 'system' or a user id
  action: string;
  notes?: string;
}

/** Creation/modification audit metadata carried by every entity. */
export interface AuditTrail {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  history: AuditEntry[];
}

/** Required human-review level for an AI recommendation. */
export type ReviewLevel = 'none' | 'analyst' | 'supervisor' | 'command';

export const REVIEW_LEVELS: readonly ReviewLevel[] = [
  'none',
  'analyst',
  'supervisor',
  'command',
] as const;

/** Result of a validation pass. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

export function fail(errors: string[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}
