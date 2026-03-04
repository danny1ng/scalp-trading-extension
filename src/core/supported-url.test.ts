import { describe, expect, test } from 'vitest';
import { getSupportedHost, isSupportedTradeUrl } from './supported-url';

describe('isSupportedTradeUrl', () => {
  test('matches app.lighter.xyz trade path', () => {
    expect(isSupportedTradeUrl('https://app.lighter.xyz/trade/BTC')).toBe(true);
  });

  test('matches lighter.exchange trade path', () => {
    expect(isSupportedTradeUrl('https://lighter.exchange/trade/ARC')).toBe(true);
  });

  test('rejects non-trade path', () => {
    expect(isSupportedTradeUrl('https://lighter.exchange/stats')).toBe(false);
  });

  test('rejects unsupported host', () => {
    expect(isSupportedTradeUrl('https://example.com/trade/BTC')).toBe(false);
  });

  test('matches binance futures path with locale', () => {
    expect(isSupportedTradeUrl('https://www.binance.com/ru/futures/BTCUSDT')).toBe(true);
  });

  test('matches binance futures path without locale', () => {
    expect(isSupportedTradeUrl('https://www.binance.com/futures/ETHUSDT')).toBe(true);
  });
});

describe('getSupportedHost', () => {
  test('returns host for supported trade url', () => {
    expect(getSupportedHost('https://app.lighter.xyz/trade/BTC')).toBe('app.lighter.xyz');
  });

  test('returns null for unsupported url', () => {
    expect(getSupportedHost('https://example.com/trade/BTC')).toBeNull();
  });
});
