import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ip = searchParams.get('ip');

  if (!ip) {
    return NextResponse.json({ error: 'Missing IP parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://internetdb.shodan.io/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store'
    });

    if (res.status === 404) {
      return NextResponse.json({
        ip,
        status: 'No Shodan InternetDB records found',
        ports: [],
        cpes: [],
        hostnames: [],
        tags: [],
        vulns: []
      });
    }

    if (!res.ok) {
      throw new Error(`Shodan HTTP ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Shodan lookup failed', detail: error.message }, { status: 502 });
  }
}
