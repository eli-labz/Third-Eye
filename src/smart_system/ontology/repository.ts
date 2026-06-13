/**
 * Smart System — ontology repository.
 *
 * In-memory canonical store. Deliberately storage-agnostic: it does not touch
 * the project's existing database/state — Smart System keeps its own isolated
 * store so it cannot disturb current app behavior. Swapping in a persistent
 * backend later only requires reimplementing this class.
 */

import type { Clock } from '../runtime';
import type { Logger } from '../logger';
import type { AnyEntity, EntityKind } from './entities';
import { appendAudit } from './entities';
import { validateEntity } from './validators';

export interface RepositoryQuery {
  kind?: EntityKind;
  source?: string;
  tag?: string;
  /** Only entities at/after this ISO time. */
  since?: string;
  limit?: number;
}

export interface UpsertResult {
  stored: boolean;
  id: string;
  errors: string[];
}

export class OntologyRepository {
  private readonly store = new Map<string, AnyEntity>();

  constructor(
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  /**
   * Validate then store an entity. Invalid entities are rejected (not stored)
   * and their errors returned, so the ingestion pipeline can log and skip.
   */
  upsert(entity: AnyEntity): UpsertResult {
    const result = validateEntity(entity);
    if (!result.valid) {
      this.logger.warn(`rejected invalid ${entity.kind} ${entity.id}`, result.errors.join('; '));
      return { stored: false, id: entity.id, errors: result.errors };
    }
    const existing = this.store.get(entity.id);
    const next = existing
      ? {
          ...entity,
          audit: appendAudit(entity.audit, {
            at: this.clock.iso(),
            actor: 'system',
            action: `updated:${entity.kind}`,
          }),
        }
      : entity;
    this.store.set(entity.id, next);
    return { stored: true, id: entity.id, errors: [] };
  }

  /** Upsert many; returns per-record results. */
  upsertMany(entities: AnyEntity[]): UpsertResult[] {
    return entities.map((e) => this.upsert(e));
  }

  get(id: string): AnyEntity | undefined {
    return this.store.get(id);
  }

  /** Filtered, optionally limited list (newest-first by timestamp). */
  query(q: RepositoryQuery = {}): AnyEntity[] {
    let items = Array.from(this.store.values());
    if (q.kind) items = items.filter((e) => e.kind === q.kind);
    if (q.source) items = items.filter((e) => e.source === q.source);
    if (q.tag) items = items.filter((e) => (e.tags ?? []).includes(q.tag!));
    if (q.since) {
      const t = Date.parse(q.since);
      items = items.filter((e) => Date.parse(e.timestamp) >= t);
    }
    items.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    if (q.limit && q.limit > 0) items = items.slice(0, q.limit);
    return items;
  }

  /** Count by entity kind — used by the status surface. */
  counts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const e of this.store.values()) {
      out[e.kind] = (out[e.kind] ?? 0) + 1;
    }
    return out;
  }

  size(): number {
    return this.store.size;
  }

  /** Test/maintenance helper. */
  clear(): void {
    this.store.clear();
  }
}
