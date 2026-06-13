/**
 * GDELT/OSINT incidents adapter — ingests the platform's live `/api/gdelt`
 * geolocated incident feed as OperationalEvent. Real data, no fixtures.
 */

import type { SourceType } from '../types';
import type { AdapterContext, RawRecord } from './base_adapter';
import { HttpFeedAdapter } from './base_adapter';

interface GdeltEvent {
  id?: string;
  lat?: number;
  lng?: number;
  name?: string;
  source?: string;
}

export class GdeltAdapter extends HttpFeedAdapter {
  readonly id = 'live-gdelt';
  readonly sourceType: SourceType = 'operational';
  readonly route = '/api/gdelt';

  protected toRecords(json: unknown, ctx: AdapterContext): RawRecord[] {
    const d = (json ?? {}) as Record<string, unknown>;
    const events = Array.isArray(d.events) ? (d.events as GdeltEvent[]) : [];
    const out: RawRecord[] = [];
    for (const e of events) {
      if (typeof e.lat !== 'number' || typeof e.lng !== 'number') continue;
      out.push({
        sourceType: this.sourceType,
        adapterId: this.id,
        originalId: e.id,
        observedAt: ctx.clock.iso(),
        entityHint: 'OperationalEvent',
        payload: {
          title: e.name || 'OSINT incident',
          eventType: 'osint_incident',
          location: { lat: e.lat, lng: e.lng },
          severity: 'low',
          confidence: 0.6,
          tags: ['osint', 'gdelt', e.source ? `src:${e.source}` : 'rss'],
        },
      });
    }
    return out;
  }
}
