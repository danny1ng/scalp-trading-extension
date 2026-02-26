import { describe, expect, test } from 'vitest';
import { interpolatePriceAtY, parsePriceText } from './price-axis';

describe('parsePriceText', () => {
  test('parses decimal value', () => {
    expect(parsePriceText('0.067084')).toBeCloseTo(0.067084, 6);
  });

  test('returns null on invalid value', () => {
    expect(parsePriceText('price')).toBeNull();
  });
});

describe('interpolatePriceAtY', () => {
  test('interpolates between two labels', () => {
    const labels = [
      { y: 100, price: 100 },
      { y: 200, price: 50 }
    ];

    expect(interpolatePriceAtY(labels, 150)).toBeCloseTo(75, 6);
  });

  test('returns exact price on exact y match', () => {
    const labels = [
      { y: 100, price: 100 },
      { y: 200, price: 50 }
    ];

    expect(interpolatePriceAtY(labels, 100)).toBe(100);
  });

  test('returns null when less than two labels', () => {
    expect(interpolatePriceAtY([{ y: 100, price: 100 }], 120)).toBeNull();
  });
});
