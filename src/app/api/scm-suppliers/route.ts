import { NextResponse } from 'next/server';

/**
 * THIRD EYE — SCM Supplier Risk Overlay
 * Calculates intersection between live global threats (Earthquakes, Fires, Conflicts)
 * and static Tier 1/2 Supplier coordinates.
 */

const SUPPLIERS = [
  // Semiconductor & Electronics (Taiwan, Korea, Japan)
  { id: 'sup-tsmc-hsinchu', name: 'TSMC Fab 12 (Tier 1)', city: 'Hsinchu', country: 'Taiwan', lat: 24.774, lng: 120.992, category: 'Semiconductor' },
  { id: 'sup-tsmc-tainan', name: 'TSMC Fab 14 (Tier 1)', city: 'Tainan', country: 'Taiwan', lat: 23.111, lng: 120.273, category: 'Semiconductor' },
  { id: 'sup-sec-giheung', name: 'Samsung Electronics (Tier 1)', city: 'Giheung', country: 'South Korea', lat: 37.221, lng: 127.098, category: 'Semiconductor' },
  { id: 'sup-sk-icheon', name: 'SK Hynix (Tier 1)', city: 'Icheon', country: 'South Korea', lat: 37.256, lng: 127.483, category: 'Semiconductor' },
  { id: 'sup-sony-kumamoto', name: 'Sony Semiconductor (Tier 2)', city: 'Kikuyo', country: 'Japan', lat: 32.883, lng: 130.825, category: 'Electronics' },
  { id: 'sup-mlcc-murata', name: 'Murata MLCC (Tier 2)', city: 'Izumo', country: 'Japan', lat: 35.361, lng: 132.756, category: 'Electronics' },
  
  // Automotive & Machinery (Europe, Mexico)
  { id: 'sup-bosch-stuttgart', name: 'Bosch Auto Parts (Tier 1)', city: 'Stuttgart', country: 'Germany', lat: 48.815, lng: 9.176, category: 'Automotive' },
  { id: 'sup-zf-bavaria', name: 'ZF Friedrichshafen (Tier 1)', city: 'Friedrichshafen', country: 'Germany', lat: 47.662, lng: 9.489, category: 'Automotive' },
  { id: 'sup-valeo-paris', name: 'Valeo R&D (Tier 2)', city: 'Paris', country: 'France', lat: 48.878, lng: 2.308, category: 'Automotive' },
  { id: 'sup-magna-celaya', name: 'Magna Assembly (Tier 2)', city: 'Celaya', country: 'Mexico', lat: 20.525, lng: -100.814, category: 'Automotive' },
  { id: 'sup-denso-monterrey', name: 'Denso Corp (Tier 1)', city: 'Monterrey', country: 'Mexico', lat: 25.772, lng: -100.174, category: 'Automotive' },

  // Battery & Energy (China, US)
  { id: 'sup-catl-ningde', name: 'CATL Battery HQ (Tier 1)', city: 'Ningde', country: 'China', lat: 26.666, lng: 119.544, category: 'Battery' },
  { id: 'sup-byd-shenzhen', name: 'BYD Gigafactory (Tier 1)', city: 'Shenzhen', country: 'China', lat: 22.684, lng: 114.341, category: 'Battery' },
  { id: 'sup-panasonic-nevada', name: 'Panasonic Giga (Tier 1)', city: 'Sparks', country: 'US', lat: 39.539, lng: -119.439, category: 'Battery' },
];

export async function GET() {
  const dynamicSuppliers = [...SUPPLIERS].map(s => ({ ...s, risk_level: 'NORMAL', active_threats: [] as string[] }));

  // Fast distance approximation (km)
  const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dx = (lng1 - lng2) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
    const dy = lat1 - lat2;
    return Math.sqrt(dx * dx + dy * dy) * 111.32;
  };

  try {
    // 1. Fetch Earthquakes
    const eqRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson', { signal: AbortSignal.timeout(5000) });
    if (eqRes.ok) {
      const eqData = await eqRes.json();
      const earthquakes = eqData.features || [];
      dynamicSuppliers.forEach(sup => {
        const nearbyEq = earthquakes.filter((eq: any) => {
          const [lng, lat] = eq.geometry.coordinates;
          return getDistanceKm(sup.lat, sup.lng, lat, lng) < 150; // 150km impact zone
        });
        if (nearbyEq.length > 0) {
          sup.risk_level = 'CRITICAL';
          sup.active_threats.push(`SEISMIC SHOCK (M${Math.max(...nearbyEq.map((eq: any) => eq.properties.mag)).toFixed(1)})`);
        }
      });
    }

    // 2. Fetch Active Fires (NASA FIRMS mock proxy from local or direct)
    // For performance, we'll fetch from the local fires endpoint since it already aggregates FIRMS
    const fireRes = await fetch('http://127.0.0.1:3000/api/fires', { signal: AbortSignal.timeout(5000) });
    if (fireRes.ok) {
      const fireData = await fireRes.json();
      const fires = fireData.data || [];
      dynamicSuppliers.forEach(sup => {
        const nearbyFires = fires.filter((f: any) => getDistanceKm(sup.lat, sup.lng, f.lat, f.lng) < 50); // 50km fire zone
        if (nearbyFires.length > 0) {
          if (sup.risk_level === 'NORMAL') sup.risk_level = 'HIGH';
          sup.active_threats.push(`WILDFIRE PROXIMITY (${nearbyFires.length} hotspots)`);
        }
      });
    }

    // 3. Fetch Conflict Zones (GDELT)
    const gdeltRes = await fetch('http://127.0.0.1:3000/api/gdelt', { signal: AbortSignal.timeout(5000) });
    if (gdeltRes.ok) {
      const gdeltData = await gdeltRes.json();
      const conflicts = gdeltData.events || [];
      dynamicSuppliers.forEach(sup => {
        const nearbyConflicts = conflicts.filter((c: any) => getDistanceKm(sup.lat, sup.lng, c.lat, c.lng) < 100);
        if (nearbyConflicts.length > 0) {
          sup.risk_level = 'CRITICAL';
          sup.active_threats.push(`ARMED CONFLICT / RIOT`);
        }
      });
    }

  } catch (e) {
    console.error("SCM Risk overlay error:", e);
  }

  return NextResponse.json({
    suppliers: dynamicSuppliers,
    total: dynamicSuppliers.length,
    critical_count: dynamicSuppliers.filter(s => s.risk_level === 'CRITICAL').length,
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
