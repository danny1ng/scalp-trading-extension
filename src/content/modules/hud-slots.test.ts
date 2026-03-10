import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createHudSlotsController } from './hud-slots';
import { isOrderModifierPressed } from './modifier-key';
import type { ExchangeAdapter } from '../../core/exchange-adapter';

vi.mock('./modifier-key', () => ({
  isOrderModifierPressed: vi.fn((event: { altKey: boolean }) => event.altKey)
}));

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
    resolveClickedPrice: async () => null,
    orderUi: {
      limitType: {},
      side: {
        mode: 'tab',
        buy: {},
        sell: {}
      },
      fields: {
        price: {},
        amount: {}
      }
    }
  };
}

describe('createHudSlotsController', () => {
  beforeEach(() => {
    delete (document as Document & Record<string, unknown>).__scalpAltClickHotkeysBound;
  });

  test('refreshes slot config when ticker changes in URL', async () => {
    const storage = createStorageStore({
      lacVolumeByExchangeTicker: {
        test: {
          BTC: { slots: [0.1, null, null, null, null], activeSlotIndex: 0 },
          ETH: { slots: [0.2, null, null, null, null], activeSlotIndex: 0 }
        }
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

  test('uses shared modifier helper for slot hotkeys', async () => {
    const storage = createStorageStore({
      lacVolumeByExchangeTicker: {
        test: {
          BTC: { slots: [0.1, 0.2, null, null, null], activeSlotIndex: 0 }
        }
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
    controller.bindSlotHotkeys();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', altKey: true, bubbles: true }));

    expect(isOrderModifierPressed).toHaveBeenCalled();
    expect(controller.getActiveSlotIndex()).toBe(1);
  });

  test('supports macOS option+digit hotkeys via KeyboardEvent.code', async () => {
    const storage = createStorageStore({
      lacVolumeByExchangeTicker: {
        test: {
          BTC: { slots: [0.1, 0.2, null, null, null], activeSlotIndex: 0 }
        }
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
    controller.bindSlotHotkeys();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '™', code: 'Digit2', altKey: true, bubbles: true }));

    expect(controller.getActiveSlotIndex()).toBe(1);
  });
});
