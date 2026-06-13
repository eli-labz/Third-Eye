
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * THIRD EYE — Active Fire & Wildfire Tracking
 * Multi-source: NASA FIRMS Open Data (primary for global fires), NASA EONET (volcanoes)
 */

export async function GET() {
  try {
    let fires: any[] = [];
    let source = '';

    // Source 1: NASA FIRMS Open Data (Global 24h CSV) - no API key needed
    const firmsSources = [
      'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv',
      'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv'
    ];

    for (const url of firmsSources) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: { 'User-Agent': 'THIRD EYE-Intelligence-Platform/3.5' },
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('latitude') && text.length > 200) {
            const parsed = parseCSV(text);
            if (parsed.length > 0) {
              fires = parsed;
              source = url.includes('SUOMI') ? 'NASA-FIRMS (VIIRS)' : 'NASA-FIRMS (MODIS)';
              break;
            }
          }
        }
      } catch { continue; }
    }

    // Source 2: Pull volcanoes from EONET for richer data
    try {
      const volcRes = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=volcanoes&limit=50', {
        signal: AbortSignal.timeout(10000),
      });
      if (volcRes.ok) {
        const volcData = await volcRes.json();
        const volcanoes = (volcData.events || []).map((e: any) => {
          const geo = e.geometry?.[e.geometry.length - 1];
          if (!geo?.coordinates) return null;
          return {
            lat: geo.coordinates[1],
            lng: geo.coordinates[0],
            brightness: 500,
            confidence: 'high',
            date: geo.date?.split('T')[0] || '',
            time: '',
            frp: 100,
            title: `[VOLCANO] ${e.title}`,
            type: 'volcano',
          };
        }).filter(Boolean);
        fires = [...fires, ...volcanoes];
        if (!source) source = 'NASA-EONET';
      }
    } catch (e) { console.warn('[THIRD EYE] Suppressed EONET error:', e instanceof Error ? e.message : e); }

    return NextResponse.json({
      fires,
      total: fires.length,
      source: source || 'Unknown',
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error) {
    console.error('Fire fetch error:', error);
    return NextResponse.json({ fires: [], error: 'Failed to fetch fire data' }, { status: 500 });
  }
}

function parseCSV(csv: string): any[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',');
  const latIdx = header.indexOf('latitude');
  const lngIdx = header.indexOf('longitude');
  const brightIdx = header.indexOf('bright_ti4') !== -1 ? header.indexOf('bright_ti4') : header.indexOf('brightness');
  const confIdx = header.indexOf('confidence');
  const dateIdx = header.indexOf('acq_date');
  const timeIdx = header.indexOf('acq_time');
  const frpIdx = header.indexOf('frp');

  const fires: any[] = [];
  // Sample the data if there are too many rows to avoid browser lag. Limit to ~2000 points globally.
  const maxPoints = 2000;
  const step = lines.length > maxPoints ? Math.ceil(lines.length / maxPoints) : 1;

  for (let i = 1; i < lines.length; i += step) {
    const cols = lines[i].split(',');
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    if (isNaN(lat) || isNaN(lng)) continue;

    fires.push({
      lat: Math.round(lat * 1000) / 1000,
      lng: Math.round(lng * 1000) / 1000,
      brightness: parseFloat(cols[brightIdx]) || 0,
      confidence: cols[confIdx] || 'unknown',
      date: cols[dateIdx] || '',
      time: cols[timeIdx] || '',
      frp: parseFloat(cols[frpIdx]) || 0,
      type: 'fire'
    });
  }

  return fires;
}

