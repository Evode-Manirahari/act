import { describe, expect, it, beforeEach } from 'vitest';

import { emptyLedger, mixReady } from '@act/domain';

import { readPilot0Ledger, writePilot0Ledger } from '../pilotLedger';

describe('pilot 0 notebook persistence', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => store[key] ?? null,
          setItem: (key: string, value: string) => {
            store[key] = value;
          },
        },
      },
    });
  });

  it('does not treat a missing notebook as a completed mix', () => {
    expect(mixReady(readPilot0Ledger())).toBe(false);
  });

  it('keeps a bound moment after a reload', () => {
    const ledger = emptyLedger();
    ledger.slots['callback-1'].momentId = 'moment-live-1';
    writePilot0Ledger(ledger);
    expect(readPilot0Ledger().slots['callback-1'].momentId).toBe('moment-live-1');
    expect(mixReady(readPilot0Ledger())).toBe(false);
  });
});
