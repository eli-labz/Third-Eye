/**
 * Smart System — append-only audit log.
 *
 * Captures every AI recommendation event and every human decision event. The
 * log is immutable from the outside (no update/delete API) so it can serve as a
 * defensible record of who decided what, when, and why.
 */

import type { Clock } from '../runtime';

export type AuditEventType =
  | 'recommendation_submitted'
  | 'review_decided'
  | 'human_version_saved'
  | 'ingestion_run';

export interface AuditLogEntry {
  id: string;
  at: string; // ISO
  actor: string; // 'system' or user id
  type: AuditEventType;
  /** Id of the subject (review item / recommendation / decision). */
  subjectId: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface AuditLogQuery {
  type?: AuditEventType;
  subjectId?: string;
  actor?: string;
  limit?: number;
}

export class AuditLog {
  private readonly entries: AuditLogEntry[] = [];
  private seq = 0;

  constructor(private readonly clock: Clock) {}

  /** Append an entry. Returns the stored (frozen) entry. */
  record(e: Omit<AuditLogEntry, 'id' | 'at'> & { at?: string }): AuditLogEntry {
    this.seq += 1;
    const entry: AuditLogEntry = Object.freeze({
      id: `audit_${String(this.seq).padStart(6, '0')}`,
      at: e.at ?? this.clock.iso(),
      actor: e.actor,
      type: e.type,
      subjectId: e.subjectId,
      summary: e.summary,
      details: e.details,
    });
    this.entries.push(entry);
    return entry;
  }

  /** Newest-first, filtered query. */
  query(q: AuditLogQuery = {}): AuditLogEntry[] {
    let items = this.entries.slice().reverse();
    if (q.type) items = items.filter((e) => e.type === q.type);
    if (q.subjectId) items = items.filter((e) => e.subjectId === q.subjectId);
    if (q.actor) items = items.filter((e) => e.actor === q.actor);
    if (q.limit && q.limit > 0) items = items.slice(0, q.limit);
    return items;
  }

  size(): number {
    return this.entries.length;
  }
}
