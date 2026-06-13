/**
 * Smart System — ingestion adapter contract.
 *
 * Adapters isolate "where the data comes from" from "how the app uses it".
 * The bundled adapters ingest the platform's OWN live feeds (its internal
 * `/api/*` routes), so the Smart System runs on real OSINT data — no fabricated
 * fixtures. This reuses an existing project pattern (the GUI fetches the same
 * routes), satisfying constraint #7.
 *
 * `fetchJson` is injected via the adapter context so production uses real HTTP
 * while tests supply a deterministic double (no network in unit tests).
 */

import type { SourceType } from '../types';
import type { Clock, IdGen } from '../runtime';
import type { Logger } from '../logger';

/** Fetch a JSON document by absolute URL or app-relative path. */
export type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

/** Normalized-but-untyped record emitted by an adapter, pre-ontology. */
export interface RawRecord {
  sourceType: SourceType;
  adapterId: string;
  /** Native id from the upstream feed, if any. */
  originalId?: string;
  /** Observation time (ISO-8601). Defaults to ingest time if omitted. */
  observedAt?: string;
  /** A hint that helps the mapper pick the target entity kind. */
  entityHint?: string;
  /** Feed-specific fields, shaped for `mappers.mapRecord`. */
  payload: Record<string, unknown>;
}

/** Health snapshot for the Data Feed Status view. */
export interface AdapterHealth {
  adapterId: string;
  sourceType: SourceType;
  /** Operational status derived from the last poll. */
  status: 'online' | 'degraded' | 'offline' | 'idle';
  route: string;
  lastPollAt?: string;
  recordsLastPoll: number;
  message?: string;
}

/** Context handed to adapters so they stay deterministic and observable. */
export interface AdapterContext {
  clock: Clock;
  idGen: IdGen;
  logger: Logger;
  /** Base origin for app-relative fetches, e.g. "http://localhost:3000". */
  baseUrl: string;
  /** Injected JSON fetcher (real HTTP in prod, double in tests). */
  fetchJson: FetchJson;
}

/** The interface every ingestion source implements. */
export interface IngestionAdapter {
  readonly id: string;
  readonly sourceType: SourceType;
  /** Pull a batch of raw records. Must never throw — return [] on failure. */
  poll(ctx: AdapterContext): Promise<RawRecord[]>;
  /** Report current health for the status surface. */
  health(): AdapterHealth;
}

/**
 * Base class. Guarantees `poll` never throws (errors are logged and surfaced as
 * `degraded`) and tracks health bookkeeping.
 */
export abstract class BaseAdapter implements IngestionAdapter {
  abstract readonly id: string;
  abstract readonly sourceType: SourceType;
  /** App-relative route this adapter ingests (for status display). */
  abstract readonly route: string;

  protected lastPollAt?: string;
  protected recordsLastPoll = 0;
  protected lastError?: string;
  protected polledAtLeastOnce = false;

  /** Subclasses implement the actual data production here. */
  protected abstract produce(ctx: AdapterContext): Promise<RawRecord[]>;

  async poll(ctx: AdapterContext): Promise<RawRecord[]> {
    this.lastPollAt = ctx.clock.iso();
    this.polledAtLeastOnce = true;
    try {
      const records = await this.produce(ctx);
      this.recordsLastPoll = records.length;
      this.lastError = undefined;
      return records;
    } catch (err) {
      this.recordsLastPoll = 0;
      this.lastError = err instanceof Error ? err.message : String(err);
      ctx.logger.warn(`adapter ${this.id} poll failed (suppressed)`, this.lastError);
      return [];
    }
  }

  health(): AdapterHealth {
    const status: AdapterHealth['status'] = !this.polledAtLeastOnce
      ? 'idle'
      : this.lastError
        ? 'degraded'
        : 'online';
    return {
      adapterId: this.id,
      sourceType: this.sourceType,
      status,
      route: this.route,
      lastPollAt: this.lastPollAt,
      recordsLastPoll: this.recordsLastPoll,
      message: this.lastError ?? (this.polledAtLeastOnce ? 'live feed' : 'not yet polled'),
    };
  }
}

/**
 * Convenience base for adapters that ingest a single app-relative JSON route.
 * Subclasses declare `route` and implement `toRecords` to shape the response
 * into `RawRecord`s.
 */
export abstract class HttpFeedAdapter extends BaseAdapter {
  protected abstract toRecords(json: unknown, ctx: AdapterContext): RawRecord[];

  protected async produce(ctx: AdapterContext): Promise<RawRecord[]> {
    const json = await ctx.fetchJson(this.route);
    return this.toRecords(json, ctx);
  }
}
