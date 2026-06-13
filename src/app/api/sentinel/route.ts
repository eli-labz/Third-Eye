import { NextResponse } from 'next/server';

// Sentinel-1 SAR Satellite — STAC Catalog via Element84 Earth Search + Copernicus fallback
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radius = parseFloat(searchParams.get('radius') || '2');
  const days = parseInt(searchParams.get('days') || '30'); // Expanded to 30 days for more results

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 });
  }

  try {
    const bbox = [lng - radius, lat - radius, lng + radius, lat + radius];
    const now = new Date();
    const from = new Date(now.getTime() - days * 86400000);
    const datetime = `${from.toISOString().split('.')[0]}Z/${now.toISOString().split('.')[0]}Z`;

    let scenes: any[] = [];
    let source = '';
    let total = 0;

    // Source 1: Element84 Earth Search v1
    try {
      const res = await fetch('https://earth-search.aws.element84.com/v1/search', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          collections: ['sentinel-1-grd'],
          bbox,
          datetime,
          limit: 20,
          sortby: [{ field: 'datetime', direction: 'desc' }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        scenes = (data.features || []).map(formatScene);
        total = data.numberMatched || scenes.length;
        source = 'element84';
      }
    } catch (e) { console.warn('[THIRD EYE] Suppressed error:', e instanceof Error ? e.message : e); }

    // Source 2: Try sentinel-2 if sentinel-1 is empty
    if (scenes.length === 0) {
      try {
        const res = await fetch('https://earth-search.aws.element84.com/v1/search', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            collections: ['sentinel-2-l2a'],
            bbox,
            datetime,
            limit: 20,
            sortby: [{ field: 'datetime', direction: 'desc' }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          scenes = (data.features || []).map(formatScene);
          total = data.numberMatched || scenes.length;
          source = 'element84-s2';
        }
      } catch (e) { console.warn('[THIRD EYE] Suppressed error:', e instanceof Error ? e.message : e); }
    }

    // Source 3: Copernicus STAC fallback
    if (scenes.length === 0) {
      try {
        const fallbackRes = await fetch('https://catalogue.dataspace.copernicus.eu/stac/search', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            collections: ['SENTINEL-1'],
            bbox,
            datetime,
            limit: 10,
          }),
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          scenes = (data.features || []).map(formatScene);
          total = data.numberMatched || scenes.length;
          source = 'copernicus';
        }
      } catch (e) { console.warn('[THIRD EYE] Suppressed error:', e instanceof Error ? e.message : e); }
    }

    return NextResponse.json({
      source,
      scenes,
      total,
      bbox,
      datetime,
      timestamp: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Sentinel lookup failed', scenes: [] }, { status: 500 });
  }
}

function formatScene(feature: any) {
  const props = feature.properties || {};
  return {
    id: feature.id,
    datetime: props.datetime,
    platform: props.platform || props['sar:instrument_mode'] || 'Sentinel',
    orbit: props['sat:orbit_state'] || props.orbitDirection,
    polarization: props['sar:polarizations'] || props.polarisation,
    mode: props['sar:instrument_mode'] || props.productType,
    resolution: props['sar:resolution_range'] || null,
    pass_direction: props['sat:relative_orbit'] || null,
    cloud_cover: props['eo:cloud_cover'] ?? null,
    bbox: feature.bbox,
    thumbnail: feature.assets?.thumbnail?.href || null,
    preview: feature.assets?.preview?.href || null,
    geometry_type: feature.geometry?.type,
    area_km2: feature.bbox ? estimateArea(feature.bbox) : null,
  };
}

function estimateArea(bbox: number[]): number {
  if (bbox.length < 4) return 0;
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const latDiff = Math.abs(maxLat - minLat) * 111;
  const lngDiff = Math.abs(maxLng - minLng) * 111 * Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  return Math.round(latDiff * lngDiff);
}
