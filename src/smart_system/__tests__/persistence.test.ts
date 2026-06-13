import { afterEach, describe, expect, it } from 'vitest';
import { createSmartSystem } from '../system';
import { MemorySnapshotStore, NullSnapshotStore } from '../persistence/snapshot_store';
import { SMART_SYSTEM_RUN_KEY_VAR, checkRunKey, isRunKeyConfigured } from '../config';
import { deterministic, fakeFetchJson } from './helpers';

describe('/run guard (SMART_SYSTEM_RUN_KEY)', () => {
  const original = process.env[SMART_SYSTEM_RUN_KEY_VAR];
  afterEach(() => {
    if (original === undefined) delete process.env[SMART_SYSTEM_RUN_KEY_VAR];
    else process.env[SMART_SYSTEM_RUN_KEY_VAR] = original;
  });

  it('is open (no key required) when unset', () => {
    delete process.env[SMART_SYSTEM_RUN_KEY_VAR];
    expect(isRunKeyConfigured()).toBe(false);
    expect(checkRunKey(null)).toBe(true);
    expect(checkRunKey('anything')).toBe(true);
  });

  it('requires a matching key when configured', () => {
    process.env[SMART_SYSTEM_RUN_KEY_VAR] = 's3cret';
    expect(isRunKeyConfigured()).toBe(true);
    expect(checkRunKey('s3cret')).toBe(true);
    expect(checkRunKey('wrong')).toBe(false);
    expect(checkRunKey(null)).toBe(false);
    expect(checkRunKey('')).toBe(false);
  });
});

describe('snapshot persistence (survives across instances/requests)', () => {
  it('no-ops with the Null store (in-memory default)', async () => {
    const ss = createSmartSystem({ ...deterministic(), snapshotStore: new NullSnapshotStore() });
    await ss.ingest({ baseUrl: 'http://t', fetchJson: fakeFetchJson() });
    await ss.persist(); // no throw
    const fresh = createSmartSystem({ ...deterministic(), snapshotStore: new NullSnapshotStore() });
    await fresh.hydrate(); // no snapshot to load
    expect(fresh.repository.size()).toBe(0);
  });

  it('round-trips state through a shared store (simulates a new isolate)', async () => {
    const store = new MemorySnapshotStore();

    // Instance A: ingest + analyze + persist.
    const a = createSmartSystem({ ...deterministic(), snapshotStore: store });
    await a.ingest({ baseUrl: 'http://t', fetchJson: fakeFetchJson() });
    a.analyze();
    await a.persist();
    expect(a.repository.size()).toBe(10);
    expect(a.review.list().length).toBe(4);

    // Instance B: a "fresh isolate" — empty until it hydrates from the store.
    const b = createSmartSystem({ ...deterministic(), snapshotStore: store });
    expect(b.repository.size()).toBe(0);
    await b.hydrate();

    expect(b.repository.size()).toBe(10);
    expect(b.review.list().length).toBe(4);
    expect(b.auditLog.size()).toBeGreaterThan(0);
    expect(b.ontologyTotal()).toBe(10);
    expect(b.ontologyCounts().Detection).toBe(5);
  });

  it('a human decision in one instance is visible after hydrate in another', async () => {
    const store = new MemorySnapshotStore();
    const a = createSmartSystem({ ...deterministic(), snapshotStore: store });
    await a.ingest({ baseUrl: 'http://t', fetchJson: fakeFetchJson() });
    const { reviewItemIds } = a.analyze();
    a.review.decide(reviewItemIds[0], { decidedBy: 'analyst-1', decision: 'approve' });
    await a.persist();

    const b = createSmartSystem({ ...deterministic(), snapshotStore: store });
    await b.hydrate();
    const decided = b.review.get(reviewItemIds[0]);
    expect(decided?.status).toBe('approved');
    expect(b.repository.counts().HumanReviewDecision).toBe(1);
  });
});
