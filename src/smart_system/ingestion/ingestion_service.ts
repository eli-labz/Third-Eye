/**
 * Smart System — ingestion service.
 *
 * Orchestrates: adapters → raw records → ontology mapping → validation → store.
 * Adapters are injected (dependency injection), so the set of feeds is fully
 * configurable and testable. Errors are isolated per-adapter and per-record so
 * one bad feed never breaks ingestion.
 */

import type { Clock, IdGen } from '../runtime';
import type { Logger } from '../logger';
import type { OntologyRepository } from '../ontology/repository';
import { mapRecord } from '../ontology/mappers';
import type {
  AdapterContext,
  AdapterHealth,
  FetchJson,
  IngestionAdapter,
} from './base_adapter';
import { createHttpFetchJson } from './http';

/** Per-run inputs that vary by request (origin) — kept out of construction. */
export interface IngestionRuntime {
  /** Origin used to resolve app-relative feed routes. */
  baseUrl: string;
  /** Optional fetch override (tests inject a double; prod builds from baseUrl). */
  fetchJson?: FetchJson;
}

export interface IngestionRunSummary {
  startedAt: string;
  finishedAt: string;
  adaptersRun: number;
  rawRecords: number;
  entitiesStored: number;
  entitiesRejected: number;
  perAdapter: Array<{ adapterId: string; raw: number; stored: number; rejected: number }>;
}

export interface IngestionServiceDeps {
  repository: OntologyRepository;
  clock: Clock;
  idGen: IdGen;
  logger: Logger;
}

export class IngestionService {
  private readonly adapters = new Map<string, IngestionAdapter>();

  constructor(private readonly deps: IngestionServiceDeps) {}

  /** Register (or replace) an adapter. */
  registerAdapter(adapter: IngestionAdapter): this {
    this.adapters.set(adapter.id, adapter);
    this.deps.logger.info(`registered adapter ${adapter.id} (${adapter.sourceType})`);
    return this;
  }

  listAdapters(): IngestionAdapter[] {
    return Array.from(this.adapters.values());
  }

  private ctx(runtime: IngestionRuntime): AdapterContext {
    return {
      clock: this.deps.clock,
      idGen: this.deps.idGen,
      logger: this.deps.logger,
      baseUrl: runtime.baseUrl,
      fetchJson: runtime.fetchJson ?? createHttpFetchJson(runtime.baseUrl),
    };
  }

  /** Current health of every adapter — backs the Data Feed Status view. */
  feedStatus(): AdapterHealth[] {
    return this.listAdapters().map((a) => a.health());
  }

  /**
   * Poll all adapters, map → validate → store. Returns a summary. Never throws;
   * adapter/record failures are logged and counted.
   */
  async ingestAll(runtime: IngestionRuntime): Promise<IngestionRunSummary> {
    const ctx = this.ctx(runtime);
    const startedAt = this.deps.clock.iso();
    const perAdapter: IngestionRunSummary['perAdapter'] = [];
    let rawTotal = 0;
    let storedTotal = 0;
    let rejectedTotal = 0;

    for (const adapter of this.listAdapters()) {
      let raw = 0;
      let stored = 0;
      let rejected = 0;
      try {
        const records = await adapter.poll(ctx);
        raw = records.length;
        for (const record of records) {
          const entity = mapRecord(record, ctx);
          if (!entity) {
            rejected += 1;
            continue;
          }
          const result = this.deps.repository.upsert(entity);
          if (result.stored) stored += 1;
          else rejected += 1;
        }
      } catch (err) {
        // BaseAdapter already guards poll(), but guard the loop defensively too.
        this.deps.logger.error(
          `ingest failure for adapter ${adapter.id} (suppressed)`,
          err instanceof Error ? err.message : err,
        );
      }
      perAdapter.push({ adapterId: adapter.id, raw, stored, rejected });
      rawTotal += raw;
      storedTotal += stored;
      rejectedTotal += rejected;
    }

    const summary: IngestionRunSummary = {
      startedAt,
      finishedAt: this.deps.clock.iso(),
      adaptersRun: this.adapters.size,
      rawRecords: rawTotal,
      entitiesStored: storedTotal,
      entitiesRejected: rejectedTotal,
      perAdapter,
    };
    this.deps.logger.info(
      `ingest complete: ${storedTotal} stored / ${rejectedTotal} rejected from ${rawTotal} raw`,
    );
    return summary;
  }
}
