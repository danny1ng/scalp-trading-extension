import type { ExchangeAdapter } from '../../core/exchange-adapter';
import type { HudCorner, HudSettings, SlotValue, TickerSlotConfig } from '../types';
import { LOG_PREFIX } from '../types';
import { isOrderModifierPressed } from './modifier-key';

const SLOT_STORAGE_KEY = 'lacVolumeByExchangeTicker';
const LEGACY_SLOT_STORAGE_KEY = 'lighterVolumeByTicker';
const HUD_STORAGE_KEY = 'lacHudSettingsByDomain';

function resolveHotkeySlotIndex(event: KeyboardEvent): number | null {
  const codeMatch = event.code.match(/^Digit([1-5])$/);
  if (codeMatch) {
    return Number(codeMatch[1]) - 1;
  }

  const macOptionDigitBySymbol: Record<string, number> = {
    '\u00A1': 0, // Option+1
    '\u2122': 1, // Option+2
    '\u00A3': 2, // Option+3
    '\u00A2': 3, // Option+4
    '\u221E': 4 // Option+5
  };
  if (event.key in macOptionDigitBySymbol) {
    return macOptionDigitBySymbol[event.key];
  }

  if (event.key < '1' || event.key > '5') {
    return null;
  }

  return Number(event.key) - 1;
}

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

type ExchangeSlotStore = Record<string, Record<string, unknown>>;

function normalizeExchangeSlotStore(raw: unknown): ExchangeSlotStore {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const next: ExchangeSlotStore = {};
  for (const [exchange, byTicker] of Object.entries(raw as Record<string, unknown>)) {
    if (!byTicker || typeof byTicker !== 'object') {
      continue;
    }

    next[exchange.toLowerCase()] = { ...(byTicker as Record<string, unknown>) };
  }

  return next;
}

async function migrateLegacySlotsIfNeeded(): Promise<ExchangeSlotStore> {
  if (!chrome.storage?.local) {
    return {};
  }

  const result = await chrome.storage.local.get(SLOT_STORAGE_KEY);
  const existing = normalizeExchangeSlotStore(result[SLOT_STORAGE_KEY]);
  if (Object.keys(existing).length > 0) {
    return existing;
  }

  const legacyResult = await chrome.storage.local.get(LEGACY_SLOT_STORAGE_KEY);
  const legacyRaw = legacyResult[LEGACY_SLOT_STORAGE_KEY];
  if (!legacyRaw || typeof legacyRaw !== 'object') {
    return {};
  }

  const migrated: ExchangeSlotStore = { lighter: {} };
  for (const [ticker, config] of Object.entries(legacyRaw as Record<string, unknown>)) {
    migrated.lighter[ticker.toUpperCase()] = normalizeConfig(config);
  }
  await chrome.storage.local.set({ [SLOT_STORAGE_KEY]: migrated });
  return migrated;
}

async function readConfigByExchangeTicker(exchangeId: string, ticker: string): Promise<TickerSlotConfig> {
  if (!chrome.storage?.local) {
    return normalizeConfig(undefined);
  }

  const store = await migrateLegacySlotsIfNeeded();
  const exchangeStore = store[exchangeId.toLowerCase()];
  if (!exchangeStore || typeof exchangeStore !== 'object') {
    return normalizeConfig(undefined);
  }

  return normalizeConfig((exchangeStore as Record<string, unknown>)[ticker.toUpperCase()]);
}

async function writeConfigByExchangeTicker(exchangeId: string, ticker: string, config: TickerSlotConfig): Promise<void> {
  if (!chrome.storage?.local) {
    return;
  }

  const store = await migrateLegacySlotsIfNeeded();
  const exchangeKey = exchangeId.toLowerCase();
  const exchangeStore = store[exchangeKey] && typeof store[exchangeKey] === 'object' ? { ...store[exchangeKey] } : {};
  exchangeStore[ticker.toUpperCase()] = normalizeConfig(config);
  store[exchangeKey] = exchangeStore;
  await chrome.storage.local.set({ [SLOT_STORAGE_KEY]: store });
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

  function getActiveExchangeId(): string {
    return activeAdapter?.id ?? 'lighter';
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

    activeSlotConfig = await readConfigByExchangeTicker(getActiveExchangeId(), activeTicker);
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
      await writeConfigByExchangeTicker(getActiveExchangeId(), activeTicker, activeSlotConfig);
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
        if (!isOrderModifierPressed(event)) {
          return;
        }

        const nextIndex = resolveHotkeySlotIndex(event);
        if (nextIndex === null) {
          return;
        }

        event.preventDefault();
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

      if (changes[SLOT_STORAGE_KEY] && activeTicker) {
        void readConfigByExchangeTicker(getActiveExchangeId(), activeTicker)
          .then((nextConfig) => {
            activeSlotConfig = nextConfig;
            renderHud();
          })
          .catch((error: unknown) => {
            console.error(`${LOG_PREFIX} storage sync failed`, error);
          });
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

  async function syncTickerFromLocation(): Promise<void> {
    if (!activeAdapter) {
      return;
    }

    const nextTicker = activeAdapter.getTicker(window.top?.location.href ?? window.location.href);
    if (!nextTicker) {
      if (activeTicker !== null) {
        activeTicker = null;
        activeSlotConfig = normalizeConfig(undefined);
        renderHud();
      }
      return;
    }

    if (nextTicker === activeTicker) {
      return;
    }

    activeTicker = nextTicker;
    activeSlotConfig = await readConfigByExchangeTicker(getActiveExchangeId(), nextTicker);
    renderHud();
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
