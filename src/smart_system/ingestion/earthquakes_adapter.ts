/**
 * Earthquakes adapter — ingests the platform's live `/api/earthquakes` feed
 * (USGS) as OperationalEvent. Real data, no fixtures.
 */

import type { SourceType } from '../types';
import type { AdapterContext, RawRecord } from './base_adapter';
import { HttpFeedAdapter } from './base_adapter';

interface Quake {
  id?: string;
  lat?: number;
  lng?: number;
  magnitude?: number;
  place?: string;
}

function severityForMagnitude(mag: number): 'info' | 'low' | 'medium' | 'high' {
  if (mag >= 6) return 'high';
  if (mag >= 5) return 'medium';
  if (mag >= 4) return 'low';
  return 'info';
}

export class EarthquakesAdapter extends HttpFeedAdapter {
  readonly id = 'live-earthquakes';
  readonly sourceType: SourceType = 'operational';
  readonly route = '/api/earthquakes';

  protected toRecords(json: unknown, ctx: AdapterContext): RawRecord[] {
    const d = (json ?? {}) as Record<string, unknown>;
    const quakes = Array.isArray(d.earthquakes) ? (d.earthquakes as Quake[]) : [];
    const out: RawRecord[] = [];
    for (const q of quakes) {
      if (typeof q.lat !== 'number' || typeof q.lng !== 'number') continue;
      const mag = typeof q.magnitude === 'number' ? q.magnitude : 0;
      out.push({
        sourceType: this.sourceType,
        adapterId: this.id,
        originalId: q.id,
        observedAt: ctx.clock.iso(),
        entityHint: 'OperationalEvent',
        payload: {
          title: q.place ? `M${mag} — ${q.place}` : `M${mag} earthquake`,
          eventType: 'earthquake',
          location: { lat: q.lat, lng: q.lng },
          severity: severityForMagnitude(mag),
          confidence: 0.99,
          tags: ['seismic', 'usgs'],
        },
      });
    }
    return out;
  }
}
