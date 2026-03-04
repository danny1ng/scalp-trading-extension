import { describe, expect, test } from 'vitest';
import { getTickerSlotConfig, normalizeSlots, saveTickerSlotConfig } from './slots-storage';

function installStorageMock(initial: Record<string, unknown>) {
  const store: Record<string, unknown> = { ...initial };
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: store[key] }),
        set: async (payload: Record<string, unknown>) => {
          Object.assign(store, payload);
        }
      }
    }
  };

  return store;
}

describe('normalizeSlots', () => {
  test('keeps five numeric or null slots', () => {
    expect(normalizeSlots([1, '2', null, '', 'x', 6])).toEqual([1, 2, null, null, null]);
  });

  test('fills missing items with null', () => {
    expect(normalizeSlots([3])).toEqual([3, null, null, null, null]);
  });
});

describe('exchange namespaced slots', () => {
  test('stores slots separately per exchange', async () => {
    installStorageMock({});

    await saveTickerSlotConfig('lighter', 'BTC', { slots: [1, null, null, null, null], activeSlotIndex: 0 });
    await saveTickerSlotConfig('binance', 'BTC', { slots: [2, null, null, null, null], activeSlotIndex: 0 });

    await expect(getTickerSlotConfig('lighter', 'BTC')).resolves.toEqual({
      slots: [1, null, null, null, null],
      activeSlotIndex: 0
    });
    await expect(getTickerSlotConfig('binance', 'BTC')).resolves.toEqual({
      slots: [2, null, null, null, null],
      activeSlotIndex: 0
    });
  });

  test('migrates legacy storage to lighter namespace only', async () => {
    const store = installStorageMock({
      lighterVolumeByTicker: {
        BTC: { slots: [0.5, null, null, null, null], activeSlotIndex: 0 }
      }
    });

    await expect(getTickerSlotConfig('lighter', 'BTC')).resolves.toEqual({
      slots: [0.5, null, null, null, null],
      activeSlotIndex: 0
    });
    await expect(getTickerSlotConfig('binance', 'BTC')).resolves.toEqual({
      slots: [null, null, null, null, null],
      activeSlotIndex: 0
    });
    expect(store.lacVolumeByExchangeTicker).toEqual({
      lighter: {
        BTC: { slots: [0.5, null, null, null, null], activeSlotIndex: 0 }
      }
    });
  });
});
