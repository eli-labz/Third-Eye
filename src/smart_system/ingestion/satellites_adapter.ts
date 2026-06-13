/**
 * Satellites adapter — ingests the platform's live `/api/satellites` orbital
 * tracks as Detection (satellite) tracks. Real data, no fixtures.
 */

import type { SourceType } from '../types';
import type { AdapterContext, RawRecord } from './base_adapter';
import { HttpFeedAdapter } from './base_adapter';

interface Sat {
  lat?: number;
  lng?: number;
  name?: string;
  noradId?: string;
  source?: string;
}

export class SatellitesAdapter extends HttpFeedAdapter {
  readonly id = 'live-satellites';
  readonly sourceType: SourceType = 'live_tracks';
  readonly route = '/api/satellites';

  protected toRecords(json: unknown, ctx: AdapterContext): RawRecord[] {
    const d = (json ?? {}) as Record<string, unknown>;
    const sats = Array.isArray(d.satellites) ? (d.satellites as Sat[]) : [];
    const out: RawRecord[] = [];
    for (const s of sats) {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
      out.push({
        sourceType: this.sourceType,
        adapterId: this.id,
        originalId: s.noradId || s.name,
        observedAt: ctx.clock.iso(),
        entityHint: 'Detection',
        payload: {
          label: 'satellite',
          sensorId: s.source || 'N2YO/Celestrak',
          location: { lat: s.lat, lng: s.lng },
          confidence: 0.95,
          tags: ['track', 'space', s.name ? `name:${s.name}` : 'unnamed'],
        },
      });
    }
    return out;
  }
}
