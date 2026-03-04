import { describe, expect, test } from 'vitest';
import { resolveAdapterForUrl } from './adapter-registry';

describe('resolveAdapterForUrl', () => {
  test('resolves lighter adapter for app.lighter.xyz trade url', () => {
    expect(resolveAdapterForUrl('https://app.lighter.xyz/trade/BTC')?.id).toBe('lighter');
  });

  test('resolves lighter adapter for lighter.exchange trade url', () => {
    expect(resolveAdapterForUrl('https://lighter.exchange/trade/BTC')?.id).toBe('lighter');
  });

  test('returns null for unsupported url', () => {
    expect(resolveAdapterForUrl('https://example.com/trade/BTC')).toBeNull();
  });

  test('resolves binance adapter for futures url', () => {
    expect(resolveAdapterForUrl('https://www.binance.com/en/futures/BTCUSDT')?.id).toBe('binance');
  });
});
