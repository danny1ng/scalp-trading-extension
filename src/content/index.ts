import { resolveAdapterForUrl } from '../core/adapter-registry';

type OrderSide = 'buy' | 'sell' | 'unknown';

type DraftOrderPayload = {
  ticker: string | null;
  clickedPrice: number;
  currentPrice: number | null;
  side: OrderSide;
  action: 'buy' | 'sell' | 'unknown';
  slotVolume: number | null;
  activeSlotIndex: number;
  clickY: number;
  timestamp: string;
};

const LOG_PREFIX = '[lighter-alt-click]';
const MESSAGE_SOURCE = 'lighter-alt-click-extension';
const MESSAGE_TYPE_DRAFT = 'lac-draft-limit-order';
const MESSAGE_TYPE_PRICE_REQUEST = 'lac-price-request';
const MESSAGE_TYPE_PRICE_RESPONSE = 'lac-price-response';
const STORAGE_KEY = 'lighterVolumeByTicker';
const HUD_STORAGE_KEY = 'lacHudSettingsByDomain';

type SlotValue = number | null;
type HudCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type HudSettings = {
  enabled: boolean;
  corner: HudCorner;
};

type TickerSlotConfig = {
  slots: SlotValue[];
  activeSlotIndex: number;
};

document.documentElement.setAttribute('data-lac-injected', '1');

const activeAdapter = resolveAdapterForUrl(window.location.href);
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

function decideSide(clickedPrice: number, currentPrice: number | null): OrderSide {
  if (currentPrice === null) {
    return 'unknown';
  }

  return clickedPrice < currentPrice ? 'buy' : 'sell';
}

function sideToAction(side: OrderSide): DraftOrderPayload['action'] {
  if (side === 'buy') {
    return 'buy';
  }

  if (side === 'sell') {
    return 'sell';
  }

  return 'unknown';
}

function injectPagePriceBridge(): void {
  const marker = '__lighterAltClickPageBridgeInjected';
  const markedDocument = document as Document & Record<string, unknown>;
  if (markedDocument[marker]) {
    return;
  }

  markedDocument[marker] = true;
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('assets/page-bridge.js');
  script.async = false;

  (document.head ?? document.documentElement).appendChild(script);
  script.remove();
}

async function requestPriceFromPageBridge(localY: number): Promise<number | null> {
  const requestId = `lac-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return await new Promise<number | null>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(null);
    }, 150);

    const onMessage = (event: MessageEvent): void => {
      const data = event.data as
        | {
            source?: string;
            type?: string;
            requestId?: string;
            price?: number | null;
          }
        | null;

      if (!data || data.source !== MESSAGE_SOURCE || data.type !== MESSAGE_TYPE_PRICE_RESPONSE || data.requestId !== requestId) {
        return;
      }

      window.clearTimeout(timeoutId);
      window.removeEventListener('message', onMessage);
      resolve(typeof data.price === 'number' && Number.isFinite(data.price) ? data.price : null);
    };

    window.addEventListener('message', onMessage);
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: MESSAGE_TYPE_PRICE_REQUEST,
        requestId,
        localY
      },
      '*'
    );
  });
}

function submitLimitOrderDraft(payload: DraftOrderPayload): void {
  document.documentElement.setAttribute('data-lac-last-clicked-price', String(payload.clickedPrice));
  document.documentElement.setAttribute('data-lac-last-side', payload.side);
  document.documentElement.setAttribute('data-lac-last-ts', payload.timestamp);

  if (window.top !== window) {
    window.top?.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: MESSAGE_TYPE_DRAFT,
        payload
      },
      '*'
    );
    return;
  }

  console.log(`${LOG_PREFIX} draft-limit-order`, payload);
}

function bindTopWindowMessageBridge(): void {
  if (window.top !== window) {
    return;
  }

  const key = '__lighterAltClickBridgeBound';
  const topWindow = window as Window & Record<string, unknown>;
  if (topWindow[key]) {
    return;
  }

  topWindow[key] = true;
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as
      | {
          source?: string;
          type?: string;
          payload?: DraftOrderPayload;
        }
      | null;

    if (!data || data.source !== MESSAGE_SOURCE || data.type !== MESSAGE_TYPE_DRAFT) {
      return;
    }

    if (data.payload) {
      document.documentElement.setAttribute('data-lac-last-clicked-price', String(data.payload.clickedPrice));
      document.documentElement.setAttribute('data-lac-last-side', data.payload.side);
      document.documentElement.setAttribute('data-lac-last-ts', data.payload.timestamp);
    }

    console.log(`${LOG_PREFIX} draft-limit-order`, data.payload);
  });
}

async function handleAltLeftClick(event: MouseEvent): Promise<void> {
  if (!activeAdapter || !event.altKey || event.button !== 0) {
    return;
  }

  if (!activeAdapter.isClickInsideChartArea(event, document)) {
    return;
  }

  document.documentElement.setAttribute('data-lac-last-event-ts', new Date().toISOString());
  document.documentElement.setAttribute('data-lac-last-event-y', String(event.clientY));

  const clickedPrice = await activeAdapter.resolveClickedPrice(event, {
    requestPriceFromPageBridge
  });

  if (clickedPrice === null) {
    document.documentElement.setAttribute('data-lac-last-error', 'could-not-resolve-clicked-price');
    console.warn(`${LOG_PREFIX} could not resolve clicked price`, {
      href: window.location.href,
      clickY: event.clientY,
      adapter: activeAdapter.id
    });
    return;
  }

  const ticker = activeAdapter.getTicker(window.top?.location.href ?? window.location.href);
  const currentPrice = activeAdapter.getCurrentPrice();
  const side = decideSide(clickedPrice, currentPrice);
  document.documentElement.removeAttribute('data-lac-last-error');

  submitLimitOrderDraft({
    ticker,
    clickedPrice,
    currentPrice,
    side,
    action: sideToAction(side),
    slotVolume: getSelectedSlotVolume(),
    activeSlotIndex: activeSlotConfig.activeSlotIndex,
    clickY: event.clientY,
    timestamp: new Date().toISOString()
  });
}

function bindSlotHotkeys(): void {
  const marker = '__lighterAltClickHotkeysBound';
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

  const key = '__lighterAltClickStorageSyncBound';
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

function bindOnCanvas(): void {
  if (!activeAdapter) {
    document.documentElement.setAttribute('data-lac-adapter', 'missing');
    return;
  }

  if (!activeAdapter.getChartCanvas(document)) {
    return;
  }

  const marker = '__lighterAltClickBound';
  const markedDocument = document as Document & Record<string, unknown>;
  if (markedDocument[marker]) {
    return;
  }

  markedDocument[marker] = true;
  injectPagePriceBridge();
  document.documentElement.setAttribute('data-lac-bound', '1');
  document.documentElement.setAttribute('data-lac-adapter', activeAdapter.id);

  document.addEventListener(
    'mousedown',
    (event) => {
      void handleAltLeftClick(event).catch((error: unknown) => {
        console.error(`${LOG_PREFIX} handler failed`, error);
      });
    },
    true
  );

  console.info(`${LOG_PREFIX} chart listener bound`, {
    href: window.location.href,
    isTop: window.top === window,
    adapter: activeAdapter.id
  });
}

bindTopWindowMessageBridge();
void loadSlotConfigFromStorage();
void loadHudSettingsFromStorage();
bindOnCanvas();
bindSlotHotkeys();
bindStorageSync();
setInterval(bindOnCanvas, 1000);
setInterval(() => {
  if (!activeTicker && activeAdapter) {
    activeTicker = activeAdapter.getTicker(window.top?.location.href ?? window.location.href);
    renderHud();
  }
}, 2000);
console.info(`${LOG_PREFIX} content loaded`, {
  href: window.location.href,
  isTop: window.top === window,
  adapter: activeAdapter?.id ?? 'none'
});
