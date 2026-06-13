import { NextResponse } from 'next/server';

/**
 * THIRD EYE — Region Dossier API
 * Provides country intelligence for any coordinate (right-click on map)
 * Fix #115: Steps 2-4 now run in parallel via Promise.allSettled
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');

  try {
    // Step 1: Reverse geocode to get country (must complete first — other steps depend on it)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=5&addressdetails=1`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'ThirdEyeIntelPlatform/1.0' },
      }
    );

    let countryName = '';
    let countryCode = '';
    let locationInfo: any = {};

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const addr = geoData.address || {};
      countryName = addr.country || '';
      countryCode = addr.country_code?.toUpperCase() || '';
      locationInfo = {
        city: addr.city || addr.town || addr.village || '',
        state: addr.state || addr.region || '',
        country: countryName,
        country_code: countryCode,
        display_name: geoData.display_name,
      };
    }

    // Steps 2–4: Run in PARALLEL after geocode (Fixes #115 — was a sequential waterfall)
    const [countryResult, wikiResult, hosResult] = await Promise.allSettled([

      // Step 2: Fetch country details from RestCountries
      (async () => {
        if (!countryCode) return null;
        try {
          const res = await fetch(
            `https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,capital,population,area,region,subregion,languages,currencies,flag,flags,timezones`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) return await res.json();
        } catch (e) { console.warn('[THIRD EYE] Country fetch error:', e instanceof Error ? e.message : e); }
        return null;
      })(),

      // Step 3: Fetch Wikipedia summary
      (async () => {
        const wikiQuery = locationInfo.city || countryName;
        if (!wikiQuery) return null;
        try {
          const res = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const wiki = await res.json();
            return {
              title: wiki.title,
              extract: wiki.extract?.substring(0, 500),
              thumbnail: wiki.thumbnail?.source,
            };
          }
        } catch (e) { console.warn('[THIRD EYE] Wikipedia fetch error:', e instanceof Error ? e.message : e); }
        return null;
      })(),

      // Step 4: Fetch head of state from Wikidata SPARQL
      (async () => {
        if (!countryName) return null;
        try {
          // Sanitize country name for SPARQL string literal
          const safe = countryName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const sparql = `SELECT ?leader ?leaderLabel ?positionLabel WHERE {
            ?country wdt:P31 wd:Q6256;
                     rdfs:label "${safe}"@en;
                     wdt:P6 ?leader.
            OPTIONAL { ?leader wdt:P39 ?position. }
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
          } LIMIT 1`;
          const res = await fetch(
            `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
            {
              signal: AbortSignal.timeout(5000),
              headers: { 'User-Agent': 'ThirdEyeIntelPlatform/1.0' },
            }
          );
          if (res.ok) {
            const wd = await res.json();
            const binding = wd.results?.bindings?.[0];
            if (binding) {
              return {
                name: binding.leaderLabel?.value,
                position: binding.positionLabel?.value || 'Head of State',
              };
            }
          }
        } catch (e) { console.warn('[THIRD EYE] Wikidata fetch error:', e instanceof Error ? e.message : e); }
        return null;
      })(),
    ]);

    const countryData = countryResult.status === 'fulfilled' ? countryResult.value : null;
    const wikiSummary  = wikiResult.status   === 'fulfilled' ? wikiResult.value   : null;
    const headOfState  = hosResult.status    === 'fulfilled' ? hosResult.value    : null;

    return NextResponse.json({
      coordinates: { lat, lng },
      location: locationInfo,
      country: countryData ? {
        name: countryData.name?.common,
        official_name: countryData.name?.official,
        capital: countryData.capital?.[0],
        population: countryData.population,
        area: countryData.area,
        region: countryData.region,
        subregion: countryData.subregion,
        languages: countryData.languages ? Object.values(countryData.languages) : [],
        currencies: countryData.currencies
          ? Object.entries(countryData.currencies).map(([code, info]: [string, any]) => `${info.name} (${info.symbol || code})`)
          : [],
        flag: countryData.flag,
        flag_url: countryData.flags?.svg,
        timezones: countryData.timezones,
      } : null,
      head_of_state: headOfState,
      wikipedia: wikiSummary,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Region dossier error:', error);
    return NextResponse.json({ error: 'Failed to fetch region data' }, { status: 500 });
  }
}
