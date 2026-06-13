import { afterEach, describe, expect, it } from 'vitest';
import { SMART_SYSTEM_FLAG, isSmartSystemEnabled } from '../config';

describe('feature flag', () => {
  const original = process.env[SMART_SYSTEM_FLAG];
  afterEach(() => {
    if (original === undefined) delete process.env[SMART_SYSTEM_FLAG];
    else process.env[SMART_SYSTEM_FLAG] = original;
  });

  it('is disabled by default / when unset', () => {
    delete process.env[SMART_SYSTEM_FLAG];
    expect(isSmartSystemEnabled()).toBe(false);
  });

  it('accepts common truthy values', () => {
    for (const v of ['true', '1', 'yes', 'on', 'ENABLED', 'True']) {
      process.env[SMART_SYSTEM_FLAG] = v;
      expect(isSmartSystemEnabled(), `value=${v}`).toBe(true);
    }
  });

  it('rejects falsy / unknown values', () => {
    for (const v of ['false', '0', 'no', '', 'maybe']) {
      process.env[SMART_SYSTEM_FLAG] = v;
      expect(isSmartSystemEnabled(), `value=${v}`).toBe(false);
    }
  });
});
