import { describe, expect, test } from 'vitest';
import { tickerFromTradeUrl } from './ticker';

describe('tickerFromTradeUrl', () => {
  test('extracts ticker from trade route', () => {
    expect(tickerFromTradeUrl('https://app.lighter.xyz/trade/ARC')).toBe('ARC');
  });

  test('extracts ticker from nested route', () => {
    expect(tickerFromTradeUrl('https://app.lighter.xyz/trade/ARC?x=1')).toBe('ARC');
  });

  test('returns null for unrelated route', () => {
    expect(tickerFromTradeUrl('https://app.lighter.xyz/markets')).toBeNull();
  });
});
