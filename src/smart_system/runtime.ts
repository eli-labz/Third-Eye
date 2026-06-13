/**
 * Smart System — runtime primitives (clock + id generation).
 *
 * These are injectable so services stay deterministic under test. Production
 * code uses wall-clock time and crypto-strong ids; tests can supply a fake
 * clock / counter-based id generator for reproducible assertions.
 */

export interface Clock {
  /** Epoch milliseconds. */
  now(): number;
  /** ISO-8601 string for the current instant. */
  iso(): string;
}

export interface IdGen {
  /** Generate a unique id, optionally namespaced by a short prefix. */
  next(prefix?: string): string;
}

/** Default wall-clock implementation. */
export const systemClock: Clock = {
  now: () => Date.now(),
  iso: () => new Date().toISOString(),
};

function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Fallback — adequate for ids, not for security.
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

/** Default crypto-strong id generator. */
export const systemIdGen: IdGen = {
  next: (prefix?: string) => (prefix ? `${prefix}_${randomId()}` : randomId()),
};

/** Deterministic id generator for tests: `prefix_000001`, ... */
export function counterIdGen(): IdGen {
  let n = 0;
  return {
    next: (prefix?: string) => {
      n += 1;
      const seq = String(n).padStart(6, '0');
      return prefix ? `${prefix}_${seq}` : seq;
    },
  };
}

/** Fixed clock for tests, anchored to a supplied epoch (advances on demand). */
export function fixedClock(startMs: number): Clock & { advance(ms: number): void } {
  let t = startMs;
  return {
    now: () => t,
    iso: () => new Date(t).toISOString(),
    advance: (ms: number) => {
      t += ms;
    },
  };
}
