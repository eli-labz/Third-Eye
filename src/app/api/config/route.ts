import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_PATH = join(process.cwd(), '.env.local');

// Keys exposed to the GUI (order matters — drives display order)
const EXPOSED_KEYS = [
  // Gemini AI
  'GEMINI_API_KEY_1',
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3',
  'GEMINI_API_KEY_4',
  'GEMINI_API_KEY_5',
  'GEMINI_API_KEY_6',
  'GEMINI_API_KEY_7',
  'GEMINI_API_KEY_8',
  // Data sources
  'FIRMS_API_KEY',
  'AIS_API_KEY',
  'OPENSKY_CLIENT_ID',
  'OPENSKY_CLIENT_SECRET',
  // Scanner backend
  'SCANNER_URL',
  'SCANNER_KEY',
  // Ollama local runtime
  'OLLAMA_HOST',
  'OLLAMA_MODEL',
];

function parseEnvFile(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    result[key] = val;
  }
  return result;
}

function patchEnvFile(raw: string, updates: Record<string, string>): string {
  const lines = raw.split('\n');
  const patched = new Set<string>();

  const result = lines.map(line => {
    const trimmed = line.trim();
    // Skip blank lines and comment-only lines
    if (!trimmed || trimmed.startsWith('#')) return line;

    const eq = trimmed.indexOf('=');
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();

    if (key in updates) {
      patched.add(key);
      const val = updates[key];
      if (val === '') return `# ${key}=`;
      return `${key}=${val}`;
    }
    return line;
  });

  // Append keys that were previously only comments and now have values
  for (const [key, val] of Object.entries(updates)) {
    if (!patched.has(key) && val !== '') {
      result.push(`${key}=${val}`);
    }
  }

  return result.join('\n');
}

export async function GET() {
  try {
    const raw = readFileSync(ENV_PATH, 'utf-8');
    const all = parseEnvFile(raw);
    const values: Record<string, string> = {};
    for (const key of EXPOSED_KEYS) {
      values[key] = all[key] ?? '';
    }
    return NextResponse.json({ values, keys: EXPOSED_KEYS });
  } catch {
    return NextResponse.json({ error: 'Could not read .env.local' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: Record<string, string> = {};

    for (const key of EXPOSED_KEYS) {
      if (key in body) {
        // Allow only whitelisted keys; strip newlines for safety
        updates[key] = String(body[key]).replace(/[\r\n]/g, '').trim();
      }
    }

    const raw = readFileSync(ENV_PATH, 'utf-8');
    const patched = patchEnvFile(raw, updates);
    writeFileSync(ENV_PATH, patched, 'utf-8');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not write .env.local' }, { status: 500 });
  }
}
