import { describe, expect, test } from 'vitest';
import { binanceAdapter } from './adapter';

describe('binanceAdapter.matches', () => {
  test('matches futures route with locale', () => {
    expect(binanceAdapter.matches('https://www.binance.com/en/futures/BTCUSDT')).toBe(true);
  });

  test('matches futures route without locale', () => {
    expect(binanceAdapter.matches('https://www.binance.com/futures/ETHUSDT')).toBe(true);
  });

  test('does not match spot trade page', () => {
    expect(binanceAdapter.matches('https://www.binance.com/en/trade/BTC_USDT')).toBe(false);
  });
});

describe('binanceAdapter.getTicker', () => {
  test('extracts symbol from futures path', () => {
    expect(binanceAdapter.getTicker('https://www.binance.com/ru/futures/SOLUSDT')).toBe('SOLUSDT');
  });
});

