import { NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

// Certificate Transparency lookup via crt.sh (free, no key)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'ThirdEye-OSINT/3.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ domain, certificates: [], error: 'crt.sh unavailable' });
    }

    const certs = await res.json();
    
    // Deduplicate by common name and extract subdomains
    const seen = new Set<string>();
    const subdomains = new Set<string>();
    const uniqueCerts = [];

    for (const cert of certs.slice(0, 200)) {
      const key = `${cert.common_name}-${cert.serial_number}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Extract subdomains
      const name = cert.name_value || '';
      name.split('\n').forEach((n: string) => {
        const clean = n.trim().replace(/^\*\./, '');
        if (clean.endsWith(domain)) subdomains.add(clean);
      });

      uniqueCerts.push({
        id: cert.id,
        issuer: cert.issuer_name,
        common_name: cert.common_name,
        name_value: cert.name_value,
        not_before: cert.not_before,
        not_after: cert.not_after,
        serial: cert.serial_number,
      });
    }

    return NextResponse.json({
      domain,
      certificates: uniqueCerts.slice(0, 50),
      subdomains: Array.from(subdomains).sort(),
      total_certs: certs.length,
      unique_subdomains: subdomains.size,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ domain, certificates: [], subdomains: [], error: 'Lookup failed' }, { status: 500 });
  }
}
