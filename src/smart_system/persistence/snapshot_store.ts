/**
 * Smart System — snapshot persistence.
 *
 * On serverless (Vercel) each request may run in a different isolate, so an
 * in-memory store does not survive across requests. This module persists a
 * compact snapshot of Smart System state to a shared KV store so the panel
 * stays consistent across isolates/requests.
 *
 * The snapshot is intentionally bounded (caps on entity/review/audit counts) to
 * stay well under KV value-size limits — high-volume raw entities are sampled,
 * while the durable human state (review queue + audit + recommendations) is kept
 * whole. True totals/counts are stored in `meta` so the UI shows real numbers.
 *
 * When no KV store is configured, `NullSnapshotStore` makes hydrate/persist
 * no-ops and the module behaves exactly as before (in-memory singleton).
 */

import type { AnyEntity } from '../ontology/entities';
import type { ReviewItem } from '../review/review_service';
import type { AuditLogEntry } from '../review/audit_log';
import type { KvClient } from './kv';
import { createKvClient } from './kv';

/** Caps that bound snapshot size (KV value limits). */
export const SNAPSHOT_ENTITY_CAP = 500;
export const SNAPSHOT_REVIEW_CAP = 200;
export const SNAPSHOT_AUDIT_CAP = 500;

const SNAPSHOT_KEY = 'thirdeye:smart_system:snapshot:v1';

export interface SnapshotMeta {
  savedAt: string;
  /** True ontology counts at save time (the entity list may be sampled). */
  counts: Record<string, number>;
  total: number;
}

export interface SmartSystemSnapshot {
  meta: SnapshotMeta;
  entities: AnyEntity[]; // newest-first, capped
  reviewItems: ReviewItem[]; // capped
  audit: AuditLogEntry[]; // capped
}

export interface SnapshotStore {
  readonly kind: 'kv' | 'null' | 'memory';
  load(): Promise<SmartSystemSnapshot | null>;
  save(snapshot: SmartSystemSnapshot): Promise<void>;
}

/** No persistence — hydrate/persist become no-ops (in-memory singleton). */
export class NullSnapshotStore implements SnapshotStore {
  readonly kind = 'null' as const;
  async load(): Promise<SmartSystemSnapshot | null> {
    return null;
  }
  async save(): Promise<void> {
    /* no-op */
  }
}

/** KV-backed persistence (Upstash/Vercel KV REST). */
export class KvSnapshotStore implements SnapshotStore {
  readonly kind = 'kv' as const;
  constructor(private readonly kv: KvClient, private readonly key = SNAPSHOT_KEY) {}

  async load(): Promise<SmartSystemSnapshot | null> {
    const raw = await this.kv.get(this.key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SmartSystemSnapshot;
    } catch {
      return null;
    }
  }

  async save(snapshot: SmartSystemSnapshot): Promise<void> {
    await this.kv.set(this.key, JSON.stringify(snapshot));
  }
}

/** In-process store for tests (round-trips through memory, not the network). */
export class MemorySnapshotStore implements SnapshotStore {
  readonly kind = 'memory' as const;
  private data: string | null = null;
  async load(): Promise<SmartSystemSnapshot | null> {
    return this.data ? (JSON.parse(this.data) as SmartSystemSnapshot) : null;
  }
  async save(snapshot: SmartSystemSnapshot): Promise<void> {
    this.data = JSON.stringify(snapshot);
  }
}

/** Pick a store from the environment: KV when configured, else Null. */
export function createSnapshotStore(): SnapshotStore {
  const kv = createKvClient();
  return kv ? new KvSnapshotStore(kv) : new NullSnapshotStore();
}
