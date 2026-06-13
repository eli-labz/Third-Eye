/**
 * Flights adapter — ingests the platform's live `/api/flights` feed
 * (OpenSky / adsb.lol) as Detection tracks. Real data, no fixtures.
 */

import type { SourceType } from '../types';
import type { AdapterContext, RawRecord } from './base_adapter';
import { HttpFeedAdapter } from './base_adapter';

interface Flight {
  lat?: number;
  lng?: number;
  callsign?: string;
  icao24?: string;
  category?: string;
}

export class FlightsAdapter extends HttpFeedAdapter {
  readonly id = 'live-flights';
  readonly sourceType: SourceType = 'live_tracks';
  readonly route = '/api/flights';

  protected toRecords(json: unknown, ctx: AdapterContext): RawRecord[] {
    const d = (json ?? {}) as Record<string, unknown>;
    const groups = ['commercial_flights', 'private_flights', 'private_jets', 'military_flights'];
    const out: RawRecord[] = [];
    for (const g of groups) {
      const arr = Array.isArray(d[g]) ? (d[g] as Flight[]) : [];
      for (const f of arr) {
        if (typeof f.lat !== 'number' || typeof f.lng !== 'number') continue;
        out.push({
          sourceType: this.sourceType,
          adapterId: this.id,
          originalId: f.icao24 || f.callsign,
          observedAt: ctx.clock.iso(),
          entityHint: 'Detection',
          payload: {
            label: 'aircraft',
            sensorId: 'OpenSky/adsb.lol',
            location: { lat: f.lat, lng: f.lng },
            confidence: 0.9,
            tags: ['track', 'air', g.replace('_flights', '')],
          },
        });
      }
    }
    return out;
  }
}
