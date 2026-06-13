/**
 * News adapter — ingests the platform's live `/api/news` OSINT stream as
 * IntelligenceReport entities. Real data, no fixtures.
 */

import type { SourceType } from '../types';
import type { AdapterContext, RawRecord } from './base_adapter';
import { HttpFeedAdapter } from './base_adapter';

interface NewsItem {
  id?: string;
  title?: string;
  description?: string;
  link?: string;
  source?: string;
  /** [lat, lng] when geolocated, else null. */
  coords?: [number, number] | null;
}

export class NewsAdapter extends HttpFeedAdapter {
  readonly id = 'live-news-reports';
  readonly sourceType: SourceType = 'reports';
  readonly route = '/api/news';

  protected toRecords(json: unknown, ctx: AdapterContext): RawRecord[] {
    const d = (json ?? {}) as Record<string, unknown>;
    const items = Array.isArray(d.news) ? (d.news as NewsItem[]) : [];
    const out: RawRecord[] = [];
    for (const n of items) {
      if (!n.title) continue;
      const loc =
        Array.isArray(n.coords) && n.coords.length === 2
          ? { lat: n.coords[0], lng: n.coords[1] }
          : undefined;
      out.push({
        sourceType: this.sourceType,
        adapterId: this.id,
        originalId: n.id,
        observedAt: ctx.clock.iso(),
        entityHint: 'IntelligenceReport',
        payload: {
          title: n.title,
          body: n.description || n.title,
          reportType: 'osint',
          location: loc,
          confidence: 0.5,
          tags: ['report', 'osint', n.source ? `src:${n.source}` : 'rss'],
        },
      });
    }
    return out;
  }
}
