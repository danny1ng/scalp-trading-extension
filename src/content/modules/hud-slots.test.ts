import { describe, expect, test, vi } from 'vitest';
import { createHudSlotsController } from './hud-slots';
import type { ExchangeAdapter } from '../../core/exchange-adapter';

function createStorageStore(initial: Record<string, unknown>) {
  const store = { ...initial };
  return {
    get: vi.fn(async (key: string) => ({ [key]: store[key] })),
    set: vi.fn(async (payload: Record<string, unknown>) => {
      Object.assign(store, payload);
    })
  };
}

function createAdapter(): ExchangeAdapter {
  return {
    id: 'test',
    matches: () => true,
    getTicker: (url: string) => {
      const match = url.match(/\/trade\/([^/?#]+)/);
      return match ? match[1].toUpperCase() : null;
    },
    getCurrentPrice: () => null,
    isClickInsideChartArea: () => false,
    getChartCanvas: () => null,
    resolveClickedPrice: async () => null
  };
}

describe('createHudSlotsController', () => {
  test('refreshes slot config when ticker changes in URL', async () => {
    const storage = createStorageStore({
      lighterVolumeByTicker: {
        BTC: { slots: [0.1, null, null, null, null], activeSlotIndex: 0 },
        ETH: { slots: [0.2, null, null, null, null], activeSlotIndex: 0 }
      }
    });

    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: storage,
        onChanged: { addListener: vi.fn() }
      }
    };

    window.history.pushState({}, '', '/trade/BTC');
    const controller = createHudSlotsController(createAdapter());
    await controller.loadSlotConfigFromStorage();
    expect(controller.getSelectedSlotVolume()).toBe(0.1);

    window.history.pushState({}, '', '/trade/ETH');
    await controller.syncTickerFromLocation();
    expect(controller.getSelectedSlotVolume()).toBe(0.2);
  });
});
