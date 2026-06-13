import { NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

// Threat Intelligence — AlienVault OTX public pulse feed + Tor exit nodes
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query'); // Optional: IP or domain to check
  
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  try {
    const results: any = { timestamp: new Date().toISOString() };

    // 1. AlienVault OTX — public pulse feed (no key needed for public data)
    try {
      const res = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=10&page=1', {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' },
      });
      // Public endpoint may require auth, fall back to activity feed
      if (!res.ok) {
        const actRes = await fetch('https://otx.alienvault.com/api/v1/pulses/activity?limit=10', {
          signal: AbortSignal.timeout(8000),
        });
        if (actRes.ok) {
          const data = await actRes.json();
          results.pulses = (data.results || []).slice(0, 10).map((p: any) => ({
            name: p.name,
            description: p.description?.slice(0, 200),
            created: p.created,
            modified: p.modified,
            tags: p.tags?.slice(0, 5),
            adversary: p.adversary,
            targeted_countries: p.targeted_countries,
            indicators_count: p.indicator_count,
          }));
        }
      }
    } catch (e) { console.warn('[THIRD EYE] Suppressed error:', e instanceof Error ? e.message : e); }

    // 2. Check specific IP/domain if provided
    if (query) {
      const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(query);
      
      if (isIP) {
        // Check against Tor exit node list
        try {
          const torRes = await fetch('https://check.torproject.org/torbulkexitlist', {
            signal: AbortSignal.timeout(5000),
          });
          if (torRes.ok) {
            const torList = await torRes.text();
            results.tor_exit_node = torList.includes(query);
          }
        } catch {
          results.tor_exit_node = null;
        }

        // AlienVault OTX IP reputation (public)
        try {
          const res = await fetch(`https://otx.alienvault.com/api/v1/indicators/IPv4/${query}/general`, {
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const data = await res.json();
            results.otx = {
              reputation: data.reputation,
              pulse_count: data.pulse_info?.count || 0,
              country: data.country_name,
              asn: data.asn,
            };
          }
        } catch (e) { console.warn('[THIRD EYE] Suppressed error:', e instanceof Error ? e.message : e); }
      } else {
        // Domain check
        try {
          const res = await fetch(`https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(query)}/general`, {
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const data = await res.json();
            results.otx = {
              pulse_count: data.pulse_info?.count || 0,
              whois: data.whois ? {
                registrar: data.whois.registrar,
                creation_date: data.whois.creation_date,
                expiration_date: data.whois.expiration_date,
              } : null,
            };
          }
        } catch (e) { console.warn('[THIRD EYE] Suppressed error:', e instanceof Error ? e.message : e); }
      }
    }

    results.threat_level = (results.otx?.pulse_count || 0) > 5 ? 'HIGH' :
                           (results.otx?.pulse_count || 0) > 0 ? 'MEDIUM' : 'LOW';

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Threat lookup failed' }, { status: 500 });
  }
}
