import { describe, expect, test } from 'vitest';
import { normalizeSlots } from './slots-storage';

describe('normalizeSlots', () => {
  test('keeps five numeric or null slots', () => {
    expect(normalizeSlots([1, '2', null, '', 'x', 6])).toEqual([1, 2, null, null, null]);
  });

  test('fills missing items with null', () => {
    expect(normalizeSlots([3])).toEqual([3, null, null, null, null]);
  });
});
