import { describe, expect, test } from 'vitest';
import { decideSide } from './side';

describe('decideSide', () => {
  test('buy when clicked price below current', () => {
    expect(decideSide(90, 100)).toBe('buy');
  });

  test('sell when clicked price above current', () => {
    expect(decideSide(110, 100)).toBe('sell');
  });

  test('sell when equal', () => {
    expect(decideSide(100, 100)).toBe('sell');
  });

  test('unknown when current price missing', () => {
    expect(decideSide(100, null)).toBe('unknown');
  });
});
