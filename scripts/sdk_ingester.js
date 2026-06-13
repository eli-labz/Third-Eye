const API_BASE = 'http://localhost:3000/api';
const INGEST_URL = `${API_BASE}/sdk/ingest`;
const API_KEY = 'OSIRIS-dev-key';

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Fetch failed:', url, res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('Fetch error for', url, e.message);
    return null;
  }
}

async function postJson(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function runIngestCycle() {
  console.log(`[${new Date().toISOString()}] Polling OSIRIS feeds for SDK Ingestion...`);
  try {
    const [flightsRes, maritimeRes] = await Promise.all([
      fetchJson(`${API_BASE}/flights`),
      fetchJson(`${API_BASE}/maritime`)
    ]);

    const entities = [];

    // Map Flights to SDK Entities
    if (flightsRes) {
      const allFlights = [
        ...(flightsRes.commercial_flights || []),
        ...(flightsRes.private_flights || []),
        ...(flightsRes.private_jets || []),
        ...(flightsRes.military_flights || [])
      ];
      for (const f of allFlights) {
        if (!f.lat || !f.lng) continue;
        
        let threat = 'NONE';
        if (f.type === 'MIL' || f.desc?.includes('Fighter')) threat = 'ELEVATED';
        
        entities.push({
          id: `flight-${f.icao24 || f.hex}`,
          name: f.flight ? f.flight.trim() : (f.callsign || f.r || `AC-${f.icao24}`),
          domain: 'AIR',
          entityType: 'TRACK',
          position: {
            lat: f.lat,
            lng: f.lng,
            alt: f.alt || f.alt_baro || f.alt_geom || 0,
            heading: f.heading || f.track || f.true_heading || 0,
            speed: f.speed_knots || f.gs || f.mach || 0
          },
          threat,
          classification: 'UNCLASSIFIED',
          properties: {
            category: f.category,
            desc: f.desc
          }
        });
      }
    }

    // Map Maritime to SDK Entities
    if (maritimeRes && Array.isArray(maritimeRes.ships)) {
      for (const v of maritimeRes.ships) {
        if (!v.lat || !v.lng) continue;
        
        entities.push({
          id: `vessel-${v.mmsi}`,
          name: v.name || `VESSEL-${v.mmsi}`,
          domain: 'SEA',
          entityType: 'TRACK',
          position: {
            lat: v.lat,
            lng: v.lng,
            alt: 0,
            heading: v.heading || v.course || 0,
            speed: v.speed || 0
          },
          threat: 'NONE',
          classification: 'UNCLASSIFIED',
          properties: {
            type: v.type,
            destination: v.destination
          }
        });
      }
    }

    // Map Intelligence Lines (Cyber Attacks)
    try {
      const sansRes = await fetchJson('https://isc.sans.edu/api/sources/attacks/100?json');
      if (sansRes && Array.isArray(sansRes)) {
        // Prepare IP geoloc batch
        const ipBatch = sansRes.slice(0, 50).map(x => ({ query: x.ip }));
        const geoRes = await postJson('http://ip-api.com/batch', ipBatch);
        
        if (geoRes && Array.isArray(geoRes)) {
          // Major Cloud Hubs
          const dataCenters = [
            { lat: 39.04, lng: -77.48, name: 'AWS US-East' },
            { lat: 50.11, lng: 8.68, name: 'AWS EU-Central' },
            { lat: 35.68, lng: 139.69, name: 'GCP Asia-NE' },
            { lat: 1.35, lng: 103.81, name: 'AWS SE-Asia' },
            { lat: -23.55, lng: -46.63, name: 'Azure South America' }
          ];
          
          geoRes.forEach((g, i) => {
            if (g.status === 'success' && g.lat && g.lon) {
              const target = dataCenters[i % dataCenters.length];
              entities.push({
                id: `intel-attack-${sansRes[i].ip}`,
                name: `CYBER: ${g.query} -> ${target.name}`,
                domain: 'INTEL',
                entityType: 'TRACK',
                position: { lat: g.lat, lng: g.lon, alt: 0, heading: 0, speed: 0 },
                target_position: { lat: target.lat, lng: target.lng, alt: 0 },
                threat: 'CRITICAL',
                classification: 'SECRET',
                properties: { attacks: sansRes[i].attacks, origin: g.country }
              });
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to process SANS ISC feeds:', e);
    }

    if (entities.length > 0) {
      console.log(`Pushing ${entities.length} entities to OSIRIS SDK...`);
      const payload = {
        source: 'OSIRIS_INGESTER',
        apiKey: API_KEY,
        entities: entities
      };
      
      const res = await postJson(INGEST_URL, payload);
      console.log('Ingest Response:', res);
    } else {
      console.log('No entities to push this cycle.');
    }

  } catch (e) {
    console.error('Ingest cycle failed:', e.message);
  }
}

// Run immediately, then every 10 seconds
runIngestCycle();
setInterval(runIngestCycle, 10000);
