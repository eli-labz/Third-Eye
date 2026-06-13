/**
 * Balkans-focused data sources for THIRD EYE.
 * NIGGG-BAS (seismic), GDACS (EU civil protection), BG news feeds.
 */

export const BALKANS_BBOX = {
  minLat: 39.5,
  maxLat: 46.5,
  minLng: 19.5,
  maxLng: 30.5,
};

export const BULGARIA_BBOX = {
  minLat: 41.2,
  maxLat: 44.5,
  minLng: 22.0,
  maxLng: 29.0,
};

export const DEFAULT_MAP_CENTER: [number, number] = [25.484, 42.698]; // Sofia - Balkans startup view
export const DEFAULT_MAP_ZOOM = 6.5;

export function inBbox(
  lat: number,
  lng: number,
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number } = BALKANS_BBOX,
): boolean {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
}

export interface NigggEarthquake {
  id: string;
  lat: number;
  lng: number;
  depth: number;
  magnitude: number;
  place: string;
  time: number;
  url: string;
  source: 'NIGGG-BAS';
}

export function parseNigggXml(xml: string): NigggEarthquake[] {
  const events: NigggEarthquake[] = [];
  const markerRegex = /<marker\b([^>]*)\/>/gi;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(xml)) !== null) {
    const attrs = match[1];
    const get = (name: string) => {
      const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
      return m?.[1] ?? '';
    };

    const lat = parseFloat(get('lat'));
    const lng = parseFloat(get('lng'));
    const mag = parseFloat(get('mag') || get('magnitude') || '0');
    const depth = parseFloat(get('depth') || '0');
    const time = get('time') || get('date') || '';
    const place = get('title') || get('place') || 'Bulgaria region';
    const id = get('id') || `niggg-${Date.now()}-${Math.random()}`;

    if (isNaN(lat) || isNaN(lng)) continue;

    events.push({
      id,
      lat,
      lng,
      depth,
      magnitude: mag,
      place,
      time: time ? new Date(time).getTime() : Date.now(),
      url: 'https://ndc.niggg.bas.bg/',
      source: 'NIGGG-BAS',
    });
  }

  return events;
}

export const BG_NEWS_FEEDS = [
  { name: 'Dnevnik', url: 'https://www.dnevnik.bg/rss/' },
  { name: 'Actualno', url: 'https://www.actualno.com/rss/actualno.xml' },
  { name: 'Mediapool', url: 'https://www.mediapool.bg/rss/' },
  { name: 'BBCEurope', url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml' },
];
