/**
 * Smart System — ontology mappers.
 *
 * Translate raw adapter records (`RawRecord`) into canonical ontology entities.
 * Mapping is total and defensive: an unmappable record returns `null` (logged
 * by the caller) rather than throwing, so one bad record never breaks a batch.
 */

import type { Classification, Provenance } from '../types';
import type { Clock, IdGen } from '../runtime';
import type { Logger } from '../logger';
import type { RawRecord } from '../ingestion/base_adapter';
import type {
  AnyEntity,
  Detection,
  DroneAsset,
  GeoPoint,
  IntelligenceReport,
  OperationalEvent,
  SatelliteImage,
  Unit,
} from './entities';
import { makeEntityBase } from './entities';

export interface MapContext {
  clock: Clock;
  idGen: IdGen;
  logger: Logger;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function geo(v: unknown): GeoPoint | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.lat !== 'number' || typeof o.lng !== 'number') return undefined;
  return { lat: o.lat, lng: o.lng, altMeters: typeof o.altMeters === 'number' ? o.altMeters : undefined };
}

function provenanceFor(r: RawRecord, ctx: MapContext): Provenance {
  return {
    adapterId: r.adapterId,
    sourceType: r.sourceType,
    originalId: r.originalId,
    ingestedAt: ctx.clock.iso(),
    pipeline: ['ingest', `adapter:${r.adapterId}`, 'normalize'],
    simulated: true,
  };
}

/** All mock data is tagged SIMULATED unless a record explicitly says otherwise. */
function classificationFor(r: RawRecord): Classification {
  const c = r.payload.classification;
  if (typeof c === 'string') {
    const up = c.toUpperCase();
    if (['SIMULATED', 'UNCLASSIFIED', 'OFFICIAL', 'CONFIDENTIAL', 'SECRET'].includes(up)) {
      return up as Classification;
    }
  }
  return 'SIMULATED';
}

/**
 * Map a single raw record to an entity, or null if unmappable.
 * Dispatches on `sourceType` (the canonical feed category).
 */
export function mapRecord(r: RawRecord, ctx: MapContext): AnyEntity | null {
  const p = r.payload;
  const ts = r.observedAt ?? ctx.clock.iso();
  const base = (kind: AnyEntity['kind'], source: string, confidence?: number) =>
    makeEntityBase({
      id: ctx.idGen.next(kind.toLowerCase()),
      kind,
      source,
      timestamp: ts,
      confidence,
      classification: classificationFor(r),
      provenance: provenanceFor(r, ctx),
      clock: ctx.clock,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });

  try {
    switch (r.sourceType) {
      case 'satellite': {
        const img: SatelliteImage = {
          ...base('SatelliteImage', 'Mock Satellite Feed', num(p.confidence, 0.9)),
          kind: 'SatelliteImage',
          satellite: str(p.satellite, 'SIM-SAT'),
          footprint: Array.isArray(p.footprint) ? (p.footprint as GeoPoint[]) : [],
          resolutionMeters: num(p.resolutionMeters, 0.5),
          cloudCoverPct: num(p.cloudCoverPct, 0),
          band: str(p.band) || undefined,
          sceneUrl: str(p.sceneUrl) || undefined,
        };
        return img;
      }
      case 'drone': {
        const loc = geo(p.location);
        if (!loc) return null;
        const d: DroneAsset = {
          ...base('DroneAsset', 'Mock Drone/Sensor Feed', num(p.confidence, 0.95)),
          kind: 'DroneAsset',
          callsign: str(p.callsign, 'SIM-UAS'),
          platform: str(p.platform, 'mock-platform'),
          location: loc,
          headingDeg: typeof p.headingDeg === 'number' ? p.headingDeg : undefined,
          speedKts: typeof p.speedKts === 'number' ? p.speedKts : undefined,
          status: (['idle', 'observing', 'transiting', 'offline'].includes(str(p.status))
            ? p.status
            : 'observing') as DroneAsset['status'],
          enduranceMinutes: typeof p.enduranceMinutes === 'number' ? p.enduranceMinutes : undefined,
        };
        return d;
      }
      case 'live_tracks': {
        const loc = geo(p.location);
        if (!loc) return null;
        const det: Detection = {
          ...base('Detection', 'Mock Live Tracks', num(p.confidence, 0.8)),
          kind: 'Detection',
          label: str(p.label, 'track'),
          location: loc,
          sensorId: str(p.sensorId) || undefined,
          bbox: Array.isArray(p.bbox) && p.bbox.length === 4 ? (p.bbox as [number, number, number, number]) : undefined,
        };
        return det;
      }
      case 'reports': {
        const rep: IntelligenceReport = {
          ...base('IntelligenceReport', 'Mock Intelligence Reports', num(p.confidence, 0.6)),
          kind: 'IntelligenceReport',
          title: str(p.title, 'Untitled report'),
          body: str(p.body, ''),
          reportType: (['sigint', 'osint', 'humint', 'imint', 'general'].includes(str(p.reportType))
            ? p.reportType
            : 'general') as IntelligenceReport['reportType'],
          location: geo(p.location),
        };
        return rep;
      }
      case 'blue_force': {
        const loc = geo(p.location);
        if (!loc) return null;
        const u: Unit = {
          ...base('Unit', 'Mock Blue-Force Feed', num(p.confidence, 0.99)),
          kind: 'Unit',
          designation: str(p.designation, 'SIM-UNIT'),
          affiliation: 'friendly',
          echelon: str(p.echelon) || undefined,
          location: loc,
          readiness: (['green', 'amber', 'red'].includes(str(p.readiness))
            ? p.readiness
            : undefined) as Unit['readiness'],
        };
        return u;
      }
      case 'operational': {
        const ev: OperationalEvent = {
          ...base('OperationalEvent', 'Mock Operational Dataset', num(p.confidence, 0.7)),
          kind: 'OperationalEvent',
          title: str(p.title, 'Operational event'),
          eventType: str(p.eventType, 'generic'),
          location: geo(p.location),
          severity: (['info', 'low', 'medium', 'high'].includes(str(p.severity))
            ? p.severity
            : 'info') as OperationalEvent['severity'],
          relatedEntityIds: Array.isArray(p.relatedEntityIds) ? (p.relatedEntityIds as string[]) : undefined,
        };
        return ev;
      }
      default:
        ctx.logger.warn('mapRecord: unknown sourceType', r.sourceType);
        return null;
    }
  } catch (err) {
    ctx.logger.warn('mapRecord failed (suppressed)', err instanceof Error ? err.message : err);
    return null;
  }
}
