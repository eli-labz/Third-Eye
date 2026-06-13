/**
 * Operational event timeline service.
 *
 * Read-only chronological view over real ingested OperationalEvents (and,
 * optionally, other timestamped entities). Pure presentation/analysis.
 */

import type { OntologyRepository } from '../ontology/repository';
import type { OperationalEvent } from '../ontology/entities';

export interface TimelineEntry {
  id: string;
  at: string; // ISO
  title: string;
  eventType: string;
  severity: OperationalEvent['severity'];
  location?: { lat: number; lng: number };
  source: string;
}

export interface Timeline {
  entries: TimelineEntry[];
  bySeverity: Record<string, number>;
  windowStart?: string;
  windowEnd?: string;
}

export class TimelineService {
  constructor(private readonly repo: OntologyRepository) {}

  /** Newest-first timeline of operational events, optionally limited. */
  build(limit = 100): Timeline {
    const events = this.repo.query({ kind: 'OperationalEvent', limit }) as OperationalEvent[];

    const entries: TimelineEntry[] = events.map((e) => ({
      id: e.id,
      at: e.timestamp,
      title: e.title,
      eventType: e.eventType,
      severity: e.severity,
      location: e.location ? { lat: e.location.lat, lng: e.location.lng } : undefined,
      source: e.source,
    }));

    const bySeverity: Record<string, number> = {};
    for (const e of entries) bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;

    return {
      entries,
      bySeverity,
      windowStart: entries.length ? entries[entries.length - 1].at : undefined,
      windowEnd: entries.length ? entries[0].at : undefined,
    };
  }
}
