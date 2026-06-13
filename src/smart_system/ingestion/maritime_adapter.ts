/**
 * Maritime adapter — ingests the platform's live `/api/maritime` ship tracks
 * (AIS) as Detection (vessel) tracks. Real data, no fixtures.
 */

import type { SourceType } from '../types';
import type { AdapterContext, RawRecord } from './base_adapter';
import { HttpFeedAdapter } from './base_adapter';

interface Ship {
  lat?: number;
  lng?: number;
  mmsi?: number | string;
  name?: string;
}

export class MaritimeAdapter extends HttpFeedAdapter {
  readonly id = 'live-maritime';
  readonly sourceType: SourceType = 'live_tracks';
  readonly route = '/api/maritime';

  protected toRecords(json: unknown, ctx: AdapterContext): RawRecord[] {
    const d = (json ?? {}) as Record<string, unknown>;
    const ships = Array.isArray(d.ships) ? (d.ships as Ship[]) : [];
    const out: RawRecord[] = [];
    for (const s of ships) {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
      out.push({
        sourceType: this.sourceType,
        adapterId: this.id,
        originalId: s.mmsi != null ? String(s.mmsi) : undefined,
        observedAt: ctx.clock.iso(),
        entityHint: 'Detection',
        payload: {
          label: 'vessel',
          sensorId: 'AIS',
          location: { lat: s.lat, lng: s.lng },
          confidence: 0.85,
          tags: ['track', 'maritime', s.name ? `name:${s.name}` : 'unnamed'],
        },
      });
    }
    return out;
  }
}
