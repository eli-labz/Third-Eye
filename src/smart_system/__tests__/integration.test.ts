/**
 * End-to-end integration: ingestion → ontology → model recommendation → human
 * review → audit. Uses an injected fetch double (real-shaped data), so no
 * network and no fabricated app data.
 */

import { describe, expect, it } from 'vitest';
import { createSmartSystem } from '../system';
import { deterministic, fakeFetchJson } from './helpers';

describe('integration: ingest → ontology → models → human review', () => {
  it('runs the full advisory pipeline and records decisions', async () => {
    const { clock, idGen, logger } = deterministic();
    const ss = createSmartSystem({ clock, idGen, logger });

    // 1) Ingest real-shaped feeds → ontology entities.
    const ingestion = await ss.ingest({ baseUrl: 'http://test.local', fetchJson: fakeFetchJson() });
    expect(ingestion.entitiesStored).toBeGreaterThan(0);
    expect(ss.repository.size()).toBe(ingestion.entitiesStored);

    // 2) Models run over real data → advisory recommendations enqueued for review.
    const analysis = ss.analyze();
    expect(analysis.recommendations.length).toBe(4); // cv, anomaly, report, risk
    expect(analysis.recommendations.every((r) => r.advisoryOnly === true)).toBe(true);
    expect(ss.review.queue().length).toBe(4);

    // 3) Human reviews each recommendation.
    const queue = ss.review.queue();
    ss.review.decide(queue[0].id, { decidedBy: 'analyst-1', decision: 'approve', rationale: 'concur' });
    ss.review.decide(queue[1].id, { decidedBy: 'supervisor-1', decision: 'reject', rationale: 'insufficient' });

    expect(ss.review.queue().length).toBe(2); // two resolved

    // 4) Audit captured both AI submissions and human decisions.
    expect(ss.auditLog.query({ type: 'ingestion_run' }).length).toBe(1);
    expect(ss.auditLog.query({ type: 'recommendation_submitted' }).length).toBe(4);
    expect(ss.auditLog.query({ type: 'review_decided' }).length).toBe(2);

    // 5) Human decisions are persisted as ontology entities.
    expect(ss.repository.counts().HumanReviewDecision).toBe(2);
  });

  it('operational apps read real ingested data', async () => {
    const { clock, idGen, logger } = deterministic();
    const ss = createSmartSystem({ clock, idGen, logger });
    await ss.ingest({ baseUrl: 'http://test.local', fetchJson: fakeFetchJson() });

    const imagery = ss.imagery.exploit();
    expect(imagery.detectionCount).toBe(5);

    const visibility = ss.assets.visibility();
    expect(visibility.totalTracks).toBe(5);
    expect(visibility.drones).toHaveLength(0); // no real drone feed
    expect(visibility.friendlyUnits).toHaveLength(0); // no real blue-force feed

    const timeline = ss.timeline.build();
    expect(timeline.entries.length).toBe(3); // earthquakes + gdelt events

    const coa = ss.coa.compare();
    expect(coa.comparison.length).toBeGreaterThanOrEqual(2);
    expect(coa.comparison[0].rank).toBe(1);
  });
});
