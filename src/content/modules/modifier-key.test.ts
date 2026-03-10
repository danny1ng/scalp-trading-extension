import { describe, expect, test } from 'vitest';
import { isOrderModifierPressed } from './modifier-key';

describe('isOrderModifierPressed', () => {
  test('returns true when altKey is pressed', () => {
    expect(isOrderModifierPressed({ altKey: true })).toBe(true);
  });

  test('returns false when altKey is not pressed', () => {
    expect(isOrderModifierPressed({ altKey: false })).toBe(false);
  });
});
