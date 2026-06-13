import { NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

// DNS Lookup via Google DNS-over-HTTPS (free, no key)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Basic domain validation
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  try {
    const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];
    const results: any = { domain, records: {}, timestamp: new Date().toISOString() };

    const lookups = await Promise.allSettled(
      types.map(async (type) => {
        const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, {
          signal: AbortSignal.timeout(5000),
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          return { type, answers: data.Answer || [], status: data.Status };
        }
        return { type, answers: [], status: -1 };
      })
    );

    for (const result of lookups) {
      if (result.status === 'fulfilled') {
        const { type, answers } = result.value;
        results.records[type] = answers.map((a: any) => ({
          name: a.name,
          type: a.type,
          ttl: a.TTL,
          data: a.data,
        }));
      }
    }

    // Extract useful summary
    const aRecords = results.records.A || [];
    const mxRecords = results.records.MX || [];
    const nsRecords = results.records.NS || [];
    
    results.summary = {
      ip_addresses: aRecords.map((r: any) => r.data),
      mail_servers: mxRecords.map((r: any) => r.data),
      nameservers: nsRecords.map((r: any) => r.data),
      total_records: Object.values(results.records).flat().length,
    };

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'DNS lookup failed' }, { status: 500 });
  }
}
