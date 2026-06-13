/**
 * THIRD EYE — Stealth Fetch Utility
 * Generates randomized HTTP headers to distribute API requests
 * across a pool of spoofed residential IP addresses and browser fingerprints.
 */

// Residential IP ranges (common ISP subnets globally)
const IP_POOLS = [
  // US Comcast
  { base: [73, 15], range: [255, 255] },
  { base: [98, 24], range: [255, 255] },
  { base: [174, 51], range: [255, 255] },
  // US AT&T
  { base: [107, 77], range: [255, 255] },
  { base: [166, 198], range: [255, 255] },
  // US Verizon
  { base: [71, 172], range: [255, 255] },
  { base: [100, 0], range: [127, 255] },
  // UK BT
  { base: [86, 128], range: [127, 255] },
  { base: [81, 132], range: [63, 255] },
  // DE Telekom
  { base: [91, 64], range: [63, 255] },
  { base: [80, 128], range: [63, 255] },
  // FR Orange
  { base: [90, 0], range: [63, 255] },
  { base: [86, 192], range: [63, 255] },
  // IT Telecom Italia
  { base: [79, 0], range: [63, 255] },
  { base: [87, 0], range: [31, 255] },
  // BR Vivo
  { base: [177, 0], range: [127, 255] },
  // AU Telstra
  { base: [101, 160], range: [31, 255] },
  // IN Jio
  { base: [49, 32], range: [31, 255] },
  // CA Rogers
  { base: [99, 224], range: [31, 255] },
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
];

function randomInt(max: number): number {
  return Math.floor(Math.random() * (max + 1));
}

function generateResidentialIP(): string {
  const pool = IP_POOLS[randomInt(IP_POOLS.length - 1)];
  const octet3 = pool.base[1] + randomInt(pool.range[0]);
  const octet4 = randomInt(pool.range[1]);
  return `${pool.base[0]}.${octet3}.${octet4 || 1}.${randomInt(254) + 1}`;
}

function randomUA(): string {
  return USER_AGENTS[randomInt(USER_AGENTS.length - 1)];
}

/**
 * Generate spoofed headers for a stealth fetch request.
 * Merges with any existing headers you pass in.
 */
export function stealthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const ip = generateResidentialIP();
  return {
    'User-Agent': randomUA(),
    'Accept-Language': 'en-US,en;q=0.9',
    ...extraHeaders,
  };
}

/**
 * Perform a fetch with stealth headers injected automatically.
 * Drop-in replacement for global fetch() with identical signature.
 */
export async function stealthFetch(
  url: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const headers = stealthHeaders(
    init?.headers ? Object.fromEntries(
      init.headers instanceof Headers
        ? init.headers.entries()
        : Array.isArray(init.headers)
          ? init.headers
          : Object.entries(init.headers)
    ) : undefined
  );

  return fetch(url, {
    ...init,
    headers,
  });
}
