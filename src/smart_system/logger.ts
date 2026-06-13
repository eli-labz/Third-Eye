/**
 * Smart System — logging.
 *
 * Thin wrapper over `console` that mirrors the existing project convention of
 * tag-prefixed logs (e.g. `console.warn('[THIRD EYE] ...')`). Keeping the same
 * mechanism means Smart System logs interleave cleanly with the rest of the app
 * and require no new logging dependency.
 */

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

function tagFor(scope?: string): string {
  return scope ? `[THIRD EYE][SmartSystem:${scope}]` : '[THIRD EYE][SmartSystem]';
}

const isProd =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

/** Create a scoped logger, e.g. `createLogger('ingestion')`. */
export function createLogger(scope?: string): Logger {
  const tag = tagFor(scope);
  return {
    debug: (message, ...args) => {
      if (!isProd) console.debug(tag, message, ...args);
    },
    info: (message, ...args) => console.log(tag, message, ...args),
    warn: (message, ...args) => console.warn(tag, message, ...args),
    error: (message, ...args) => console.error(tag, message, ...args),
  };
}
