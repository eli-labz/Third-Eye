/**
 * Shared test helpers: deterministic runtime + a fake `fetchJson` that returns
 * realistically-shaped feed responses (test doubles — not shipped app data).
 */

import { counterIdGen, fixedClock } from '../runtime';
import { createLogger } from '../logger';
import type { FetchJson } from '../ingestion/base_adapter';
import type { Detection } from '../ontology/entities';
import { makeEntityBase } from '../ontology/entities';

export function deterministic() {
  const clock = fixedClock(Date.parse('2026-06-12T00:00:00.000Z'));
  const idGen = counterIdGen();
  const logger = createLogger('test');
  return { clock, idGen, logger };
}

/** Fake feed responses shaped like the real internal API routes. */
export function fakeFetchJson(): FetchJson {
  return async (path: string) => {
    if (path.includes('/api/flights')) {
      return {
        commercial_flights: [
          { lat: 35.0, lng: 45.0, callsign: 'TEST1', icao24: 'abc123' },
          { lat: 36.5, lng: 46.5, callsign: 'TEST2', icao24: 'abc124' }, // ~200km from TEST1
        ],
        military_flights: [{ lat: 10, lng: 10, callsign: 'MIL1', icao24: 'def456' }],
        private_flights: [],
        private_jets: [],
      };
    }
    if (path.includes('/api/maritime')) {
      return { ships: [{ lat: 25.5, lng: 54.5, mmsi: 123456789, name: 'TEST VESSEL' }] };
    }
    if (path.includes('/api/satellites')) {
      return { satellites: [{ lat: 0, lng: 0, name: 'ISS', noradId: '25544' }] };
    }
    if (path.includes('/api/earthquakes')) {
      return {
        earthquakes: [
          { id: 'eq1', lat: 38, lng: 142, magnitude: 6.2, place: 'Off Japan' },
          { id: 'eq2', lat: 34, lng: -118, magnitude: 3.1, place: 'California' },
        ],
      };
    }
    if (path.includes('/api/gdelt')) {
      return { events: [{ id: 'g1', lat: 50, lng: 30, name: '[RSS] incident', source: 'RSS' }] };
    }
    if (path.includes('/api/news')) {
      return {
        news: [
          { id: 'n1', title: 'Report A', description: 'Body of report A.', source: 'Wire', coords: [48.0, 2.0] },
          { id: 'n2', title: 'Report B', description: 'Body of report B.', source: 'Wire', coords: null },
        ],
      };
    }
    return {};
  };
}

/** Build a valid Detection for unit tests (bypasses ingestion). */
export function makeDetection(
  id: string,
  label: string,
  lat: number,
  lng: number,
  opts: { sensorId?: string; confidence?: number } = {},
): Detection {
  const { clock } = deterministic();
  return {
    ...makeEntityBase({
      id,
      kind: 'Detection',
      source: 'test',
      timestamp: clock.iso(),
      confidence: opts.confidence ?? 0.8,
      provenance: {
        adapterId: 'test',
        sourceType: 'live_tracks',
        ingestedAt: clock.iso(),
        pipeline: ['test'],
        simulated: true,
      },
      clock,
    }),
    kind: 'Detection',
    label,
    location: { lat, lng },
    sensorId: opts.sensorId,
  };
}
