import { NextResponse } from 'next/server';
import { isRateLimited, getClientIp } from '@/lib/ssrf-guard';

// CVE Intelligence — fetches vulnerability details from CIRCL CVE API (free, no key)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cve = searchParams.get('cve');
  if (!cve) return NextResponse.json({ error: 'Missing cve parameter' }, { status: 400 });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 30, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Validate CVE format (CVE-YYYY-NNNNN)
  if (!/^CVE-\d{4}-\d{4,}$/i.test(cve)) {
    return NextResponse.json({ error: 'Invalid CVE format. Expected: CVE-YYYY-NNNNN' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://cveawg.mitre.org/api/cve/${encodeURIComponent(cve.toUpperCase())}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      // Fallback to CIRCL
      try {
        const circlRes = await fetch(`https://cve.circl.lu/api/cve/${encodeURIComponent(cve.toUpperCase())}`, {
          signal: AbortSignal.timeout(8000),
          headers: { 'Accept': 'application/json' },
        });
        if (circlRes.ok) {
          const data = await circlRes.json();
          return NextResponse.json({
            id: data.id || cve.toUpperCase(),
            description: data.summary || 'No description available.',
            cvss: data.cvss ?? null,
            cvss_vector: data.cvss_vector || null,
            references: (data.references || []).slice(0, 5),
            published: data.Published || null,
            modified: data.Modified || null,
            cwe: data.cwe || null,
            source: 'circl',
          });
        }
      } catch { /* fall through */ }

      return NextResponse.json({
        id: cve.toUpperCase(),
        description: 'CVE details could not be retrieved at this time.',
        cvss: null,
        references: [],
        source: 'unavailable',
      });
    }

    const data = await res.json();

    // Parse the CVE 5.0 JSON format from MITRE
    const cna = data.containers?.cna;
    const description = cna?.descriptions?.find((d: any) => d.lang === 'en')?.value
      || cna?.descriptions?.[0]?.value
      || 'No description available.';

    // Extract CVSS from metrics
    let cvss: number | null = null;
    let cvss_vector: string | null = null;
    let severity: string | null = null;

    const metrics = cna?.metrics;
    if (metrics) {
      for (const m of metrics) {
        const v31 = m.cvssV3_1 || m.cvssV3_0 || m.cvssV31;
        if (v31) {
          cvss = v31.baseScore ?? null;
          cvss_vector = v31.vectorString ?? null;
          severity = v31.baseSeverity ?? null;
          break;
        }
        const v2 = m.cvssV2_0 || m.cvssV2;
        if (v2) {
          cvss = v2.baseScore ?? null;
          cvss_vector = v2.vectorString ?? null;
          break;
        }
      }
    }

    // Extract CWE
    const problemTypes = cna?.problemTypes;
    let cwe: string | null = null;
    if (problemTypes?.[0]?.descriptions?.[0]) {
      cwe = problemTypes[0].descriptions[0].cweId || problemTypes[0].descriptions[0].description || null;
    }

    // Extract references
    const references = (cna?.references || []).slice(0, 5).map((r: any) => r.url);

    // Extract affected products
    const affected = (cna?.affected || []).slice(0, 5).map((a: any) => ({
      vendor: a.vendor || 'Unknown',
      product: a.product || 'Unknown',
      versions: (a.versions || []).slice(0, 3).map((v: any) => v.version).filter(Boolean),
    }));

    return NextResponse.json({
      id: data.cveMetadata?.cveId || cve.toUpperCase(),
      description,
      cvss,
      cvss_vector,
      severity: severity || (cvss !== null ? (cvss >= 9 ? 'CRITICAL' : cvss >= 7 ? 'HIGH' : cvss >= 4 ? 'MEDIUM' : 'LOW') : null),
      cwe,
      affected,
      references,
      published: data.cveMetadata?.datePublished || null,
      modified: data.cveMetadata?.dateUpdated || null,
      source: 'mitre',
    });
  } catch {
    return NextResponse.json({ error: 'CVE lookup failed' }, { status: 500 });
  }
}
