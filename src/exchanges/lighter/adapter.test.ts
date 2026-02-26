import { describe, expect, test } from 'vitest';
import { lighterAdapter } from './adapter';

describe('lighterAdapter.matches', () => {
  test('matches app.lighter.xyz trade path', () => {
    expect(lighterAdapter.matches('https://app.lighter.xyz/trade/BTC')).toBe(true);
  });

  test('matches lighter.exchange trade path', () => {
    expect(lighterAdapter.matches('https://lighter.exchange/trade/BTC')).toBe(true);
  });

  test('does not match non-trade path', () => {
    expect(lighterAdapter.matches('https://lighter.exchange/stats')).toBe(false);
  });
});
