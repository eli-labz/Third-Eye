import { describe, expect, it } from 'vitest';
import { createSmartSystem } from '../system';
import { deterministic, fakeFetchJson } from './helpers';

describe('ingestion from real-shaped feeds (via injected double)', () => {
  it('maps live feeds into canonical ontology entities', async () => {
    const { clock, idGen, logger } = deterministic();
    const ss = createSmartSystem({ clock, idGen, logger });

    const summary = await ss.ingest({ baseUrl: 'http://test.local', fetchJson: fakeFetchJson() });

    // 3 flights + 1 ship + 1 sat = 5 Detections; 2 quakes + 1 gdelt = 3 events;
    // 2 news = 2 reports. (12 total)
    expect(summary.adaptersRun).toBe(6);
    expect(summary.entitiesStored).toBeGreaterThan(0);

    const counts = ss.repository.counts();
    expect(counts.Detection).toBe(5);
    expect(counts.OperationalEvent).toBe(3);
    expect(counts.IntelligenceReport).toBe(2);
    // No feed for these — must remain empty (no fabricated data).
    expect(counts.SatelliteImage ?? 0).toBe(0);
    expect(counts.DroneAsset ?? 0).toBe(0);
    expect(counts.Unit ?? 0).toBe(0);
  });

  it('reports feed health after polling', async () => {
    const { clock, idGen, logger } = deterministic();
    const ss = createSmartSystem({ clock, idGen, logger });
    await ss.ingest({ baseUrl: 'http://test.local', fetchJson: fakeFetchJson() });
    const feeds = ss.ingestion.feedStatus();
    expect(feeds).toHaveLength(6);
    expect(feeds.every((f) => f.status === 'online')).toBe(true);
  });

  it('survives a failing feed without throwing (graceful error handling)', async () => {
    const { clock, idGen, logger } = deterministic();
    const ss = createSmartSystem({ clock, idGen, logger });
    const failing = async (path: string) => {
      if (path.includes('/api/flights')) throw new Error('boom');
      return {};
    };
    const summary = await ss.ingest({ baseUrl: 'http://test.local', fetchJson: failing });
    // No throw; flights adapter contributes 0, others contribute 0 (empty payloads).
    expect(summary.adaptersRun).toBe(6);
    expect(summary.entitiesStored).toBe(0);
  });
});
