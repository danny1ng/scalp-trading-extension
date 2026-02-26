import type { ExchangeAdapter } from '../../core/exchange-adapter';
import type { HudCorner, HudSettings, SlotValue, TickerSlotConfig } from '../types';
import { LOG_PREFIX } from '../types';

const STORAGE_KEY = 'lighterVolumeByTicker';
const HUD_STORAGE_KEY = 'lacHudSettingsByDomain';

function normalizeSlots(input: unknown[]): SlotValue[] {
  const normalized: SlotValue[] = [null, null, null, null, null];

  for (let i = 0; i < 5; i += 1) {
    const value = input[i];
    if (value === null || value === undefined || value === '') {
      normalized[i] = null;
      continue;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    normalized[i] = Number.isFinite(parsed) ? parsed : null;
  }

  return normalized;
}

function normalizeConfig(raw: unknown): TickerSlotConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      slots: [null, null, null, null, null],
      activeSlotIndex: 0
    };
  }

  const maybeConfig = raw as Partial<TickerSlotConfig>;
  const slots = normalizeSlots(Array.isArray(maybeConfig.slots) ? maybeConfig.slots : []);
  const rawIndex = typeof maybeConfig.activeSlotIndex === 'number' ? maybeConfig.activeSlotIndex : 0;
  const activeSlotIndex = Math.max(0, Math.min(4, Math.trunc(rawIndex)));
  return { slots, activeSlotIndex };
}

function normalizeHudCorner(value: unknown): HudCorner {
  if (value === 'top-left' || value === 'top-right' || value === 'bottom-left' || value === 'bottom-right') {
    return value;
  }

  return 'bottom-right';
}

function normalizeHudSettings(raw: unknown): HudSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      enabled: true,
      corner: 'bottom-right'
    };
  }

  const settings = raw as Partial<HudSettings>;
  return {
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : true,
    corner: normalizeHudCorner(settings.corner)
  };
}

async function readConfigByTicker(ticker: string): Promise<TickerSlotConfig> {
  if (!chrome.storage?.local) {
    return normalizeConfig(undefined);
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const store = result[STORAGE_KEY];
  if (!store || typeof store !== 'object') {
    return normalizeConfig(undefined);
  }

  const typedStore = store as Record<string, unknown>;
  return normalizeConfig(typedStore[ticker.toUpperCase()]);
}

async function writeConfigByTicker(ticker: string, config: TickerSlotConfig): Promise<void> {
  if (!chrome.storage?.local) {
    return;
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const store = result[STORAGE_KEY];
  const nextStore: Record<string, unknown> = store && typeof store === 'object' ? { ...(store as Record<string, unknown>) } : {};
  nextStore[ticker.toUpperCase()] = normalizeConfig(config);
  await chrome.storage.local.set({ [STORAGE_KEY]: nextStore });
}

async function readHudSettingsByDomain(domain: string): Promise<HudSettings> {
  if (!chrome.storage?.local) {
    return normalizeHudSettings(undefined);
  }

  const result = await chrome.storage.local.get(HUD_STORAGE_KEY);
  const store = result[HUD_STORAGE_KEY];
  if (!store || typeof store !== 'object') {
    return normalizeHudSettings(undefined);
  }

  const typedStore = store as Record<string, unknown>;
  return normalizeHudSettings(typedStore[domain.toLowerCase()]);
}

export function createHudSlotsController(activeAdapter: ExchangeAdapter | null) {
  let activeTicker: string | null = null;
  let activeSlotConfig: TickerSlotConfig = {
    slots: [null, null, null, null, null],
    activeSlotIndex: 0
  };
  let activeHudSettings: HudSettings = {
    enabled: true,
    corner: 'bottom-right'
  };
  let hudElement: HTMLDivElement | null = null;

  function getSelectedSlotVolume(): number | null {
    return activeSlotConfig.slots[activeSlotConfig.activeSlotIndex];
  }

  function ensureHudElement(): HTMLDivElement | null {
    if (window.top !== window) {
      return null;
    }

    if (!activeHudSettings.enabled) {
      if (hudElement && document.body.contains(hudElement)) {
        hudElement.remove();
      }

      hudElement = null;
      return null;
    }

    if (hudElement && document.body.contains(hudElement)) {
      return hudElement;
    }

    const element = document.createElement('div');
    element.id = 'lac-floating-hud';
    element.style.position = 'fixed';
    element.style.right = '14px';
    element.style.bottom = '14px';
    element.style.zIndex = '2147483647';
    element.style.padding = '8px 10px';
    element.style.borderRadius = '10px';
    element.style.border = '1px solid rgba(49, 201, 164, 0.55)';
    element.style.background = 'rgba(5, 16, 24, 0.88)';
    element.style.color = '#d7fff4';
    element.style.font = '700 14px/1.25 Segoe UI, Inter, Roboto, sans-serif';
    element.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.35)';
    element.style.pointerEvents = 'none';

    document.body.appendChild(element);
    hudElement = element;
    return element;
  }

  function applyHudCorner(element: HTMLDivElement, corner: HudCorner): void {
    element.style.top = '';
    element.style.right = '';
    element.style.bottom = '';
    element.style.left = '';

    if (corner === 'top-left') {
      element.style.top = '14px';
      element.style.left = '14px';
      return;
    }

    if (corner === 'top-right') {
      element.style.top = '14px';
      element.style.right = '14px';
      return;
    }

    if (corner === 'bottom-left') {
      element.style.bottom = '14px';
      element.style.left = '14px';
      return;
    }

    element.style.bottom = '14px';
    element.style.right = '14px';
  }

  function renderHud(): void {
    const element = ensureHudElement();
    if (!element) {
      return;
    }

    applyHudCorner(element, activeHudSettings.corner);
    const activeSlot = activeSlotConfig.activeSlotIndex + 1;
    const rawVolume = getSelectedSlotVolume();
    const volume = rawVolume === null ? 'Not set' : String(rawVolume);
    element.textContent = `Slot ${activeSlot}: ${volume}`;
  }

  async function loadSlotConfigFromStorage(): Promise<void> {
    if (!activeAdapter) {
      return;
    }

    activeTicker = activeAdapter.getTicker(window.top?.location.href ?? window.location.href);
    if (!activeTicker) {
      activeSlotConfig = normalizeConfig(undefined);
      renderHud();
      return;
    }

    activeSlotConfig = await readConfigByTicker(activeTicker);
    renderHud();
  }

  async function loadHudSettingsFromStorage(): Promise<void> {
    activeHudSettings = await readHudSettingsByDomain(window.location.hostname);
    renderHud();
  }

  async function setActiveSlotIndex(nextIndex: number): Promise<void> {
    const bounded = Math.max(0, Math.min(4, Math.trunc(nextIndex)));
    activeSlotConfig = {
      ...activeSlotConfig,
      activeSlotIndex: bounded
    };
    renderHud();

    if (activeTicker) {
      await writeConfigByTicker(activeTicker, activeSlotConfig);
    }
  }

  function bindSlotHotkeys(): void {
    const marker = '__scalpAltClickHotkeysBound';
    const markedDocument = document as Document & Record<string, unknown>;
    if (markedDocument[marker]) {
      return;
    }

    markedDocument[marker] = true;
    document.addEventListener(
      'keydown',
      (event) => {
        if (!event.altKey) {
          return;
        }

        if (event.key < '1' || event.key > '5') {
          return;
        }

        event.preventDefault();
        const nextIndex = Number(event.key) - 1;
        void setActiveSlotIndex(nextIndex).catch((error: unknown) => {
          console.error(`${LOG_PREFIX} slot hotkey failed`, error);
        });
      },
      true
    );
  }

  function bindStorageSync(): void {
    if (!chrome.storage?.onChanged) {
      return;
    }

    const key = '__scalpAltClickStorageSyncBound';
    const topWindow = window as Window & Record<string, unknown>;
    if (topWindow[key]) {
      return;
    }

    topWindow[key] = true;
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') {
        return;
      }

      if (changes[STORAGE_KEY] && activeTicker) {
        const nextStore = changes[STORAGE_KEY].newValue;
        if (nextStore && typeof nextStore === 'object') {
          const nextConfig = normalizeConfig((nextStore as Record<string, unknown>)[activeTicker.toUpperCase()]);
          activeSlotConfig = nextConfig;
          renderHud();
        }
      }

      if (changes[HUD_STORAGE_KEY]) {
        const nextStore = changes[HUD_STORAGE_KEY].newValue;
        if (nextStore && typeof nextStore === 'object') {
          activeHudSettings = normalizeHudSettings((nextStore as Record<string, unknown>)[window.location.hostname.toLowerCase()]);
          renderHud();
        }
      }
    });
  }

  function syncTickerFromLocation(): void {
    if (!activeTicker && activeAdapter) {
      activeTicker = activeAdapter.getTicker(window.top?.location.href ?? window.location.href);
      renderHud();
    }
  }

  function getActiveSlotIndex(): number {
    return activeSlotConfig.activeSlotIndex;
  }

  return {
    loadSlotConfigFromStorage,
    loadHudSettingsFromStorage,
    bindSlotHotkeys,
    bindStorageSync,
    syncTickerFromLocation,
    getSelectedSlotVolume,
    getActiveSlotIndex
  };
}
