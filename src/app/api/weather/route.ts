import { NextResponse } from 'next/server';
import { stealthFetch } from '@/lib/stealthFetch';

/**
 * THIRD EYE — Severe Weather & Anomalies API
 * Fetches active natural events from NASA EONET and NOAA/NWS active alerts.
 * Tracks: Severe storms, volcanoes, sea ice, and U.S. active weather alerts.
 */

type Severity = 'low' | 'medium' | 'high';

type WeatherEvent = {
  id: string;
  title: string;
  category: string;
  type: string;
  icon: string;
  severity: Severity;
  lat: number;
  lng: number;
  date?: string;
  expires?: string;
  area?: string;
  source: string;
  provider: 'NASA EONET' | 'NOAA/NWS';
};

type EonetEvent = {
  id: string;
  title: string;
  categories?: {
    id?: string;
    title?: string;
  }[];
  geometry?: {
    type?: string;
    coordinates?: number[];
    date?: string;
  }[];
  sources?: {
    url?: string;
  }[];
};

type EonetResponse = {
  events?: EonetEvent[];
};

type NwsGeometry =
  | {
      type: 'Point';
      coordinates: number[];
    }
  | {
      type: 'Polygon';
      coordinates?: number[][][];
    }
  | {
      type: 'MultiPolygon';
      coordinates?: number[][][][];
    };

type NwsFeature = {
  geometry?: NwsGeometry | null;
  properties?: {
    '@id'?: string;
    id?: string;
    headline?: string;
    event?: string;
    severity?: string;
    effective?: string;
    sent?: string;
    expires?: string;
    areaDesc?: string;
  };
};

type NwsResponse = {
  features?: NwsFeature[];
};

export async function GET() {
  try {
    const [eonetRes, nwsRes] = await Promise.allSettled([
      stealthFetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100', {
        signal: AbortSignal.timeout(10000),
      }),
      fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert', {
        headers: {
          Accept: 'application/geo+json',
          'User-Agent': 'THIRD EYE Severe Weather Layer',
        },
        signal: AbortSignal.timeout(10000),
      }),
    ]);

    const events: WeatherEvent[] = [];
    let providerSucceeded = false;

    if (eonetRes.status === 'fulfilled' && eonetRes.value.ok) {
      try {
        const data = (await eonetRes.value.json()) as EonetResponse;
        providerSucceeded = true;

        for (const event of data.events || []) {
          const geom = event.geometry && event.geometry.length > 0 ? event.geometry[event.geometry.length - 1] : null;
          if (!geom || geom.type !== 'Point' || !geom.coordinates) continue;

          const category = event.categories?.[0]?.id || 'unknown';

          // We already track wildfires via FIRMS, so we skip EONET wildfires
          if (category === 'wildfires') continue;

          let typeLabel = 'Event';
          let icon = 'alert';
          let severity: Severity = 'low';

          if (category === 'severeStorms') {
            typeLabel = 'Severe Storm';
            icon = 'cyclone';
            severity = 'high';
          } else if (category === 'volcanoes') {
            typeLabel = 'Volcano Eruption';
            icon = 'volcano';
            severity = 'high';
          } else if (category === 'seaIce') {
            typeLabel = 'Iceberg / Sea Ice';
            icon = 'ice';
            severity = 'medium';
          } else if (category === 'earthquakes') {
            continue;
          } else {
            typeLabel = event.categories?.[0]?.title || 'Anomaly';
          }

          events.push({
            id: `eonet-${event.id}`,
            title: event.title,
            category,
            type: typeLabel,
            icon,
            severity,
            lat: geom.coordinates[1],
            lng: geom.coordinates[0],
            date: geom.date,
            source: event.sources?.[0]?.url || 'NASA EONET',
            provider: 'NASA EONET',
          });
        }
      } catch (error) {
        console.error('NASA EONET normalization error:', error);
      }
    }

    if (nwsRes.status === 'fulfilled' && nwsRes.value.ok) {
      try {
        const data = (await nwsRes.value.json()) as NwsResponse;
        providerSucceeded = true;

        for (const feature of data.features || []) {
          const props = feature.properties || {};
          const coords = getRepresentativePoint(feature.geometry);
          if (!coords) continue;

          events.push({
            id: `nws-${props.id || props['@id'] || props.event || coords.lat}`,
            title: props.headline || props.event || 'NWS Weather Alert',
            category: 'weatherAlerts',
            type: props.event || 'Weather Alert',
            icon: 'weather',
            severity: normalizeNwsSeverity(props.severity),
            lat: coords.lat,
            lng: coords.lng,
            date: props.effective || props.sent,
            expires: props.expires,
            area: props.areaDesc,
            source: props['@id'] || 'https://api.weather.gov/alerts/active',
            provider: 'NOAA/NWS',
          });
        }
      } catch (error) {
        console.error('NOAA/NWS normalization error:', error);
      }
    }

    if (!providerSucceeded) {
      return NextResponse.json({ events: [], error: 'Failed to fetch weather data' }, { status: 500 });
    }

    return NextResponse.json({
      events,
      total: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json({ events: [], error: 'Failed to fetch weather data' }, { status: 500 });
  }
}

function normalizeNwsSeverity(severity?: string): Severity {
  switch (severity) {
    case 'Extreme':
    case 'Severe':
      return 'high';
    case 'Moderate':
      return 'medium';
    default:
      return 'low';
  }
}

function getRepresentativePoint(geometry?: NwsGeometry | null) {
  if (!geometry) return null;

  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return { lat, lng };
  }

  if (geometry.type === 'Polygon') {
    return averageCoordinates(geometry.coordinates?.[0]);
  }

  if (geometry.type === 'MultiPolygon') {
    return averageCoordinates(geometry.coordinates?.[0]?.[0]);
  }

  return null;
}

function averageCoordinates(coords?: number[][]) {
  if (!coords || coords.length === 0) return null;

  const totals = coords.reduce(
    (acc, coord) => {
      acc.lng += coord[0];
      acc.lat += coord[1];
      return acc;
    },
    { lat: 0, lng: 0 }
  );

  return {
    lat: totals.lat / coords.length,
    lng: totals.lng / coords.length,
  };
}
