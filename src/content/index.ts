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

type UiOrderSide = 'buy' | 'sell';

const LOG_PREFIX = '[lighter-alt-click]';
const MESSAGE_SOURCE = 'lighter-alt-click-extension';
const MESSAGE_TYPE_DRAFT = 'lac-draft-limit-order';
const MESSAGE_TYPE_UI_DRY_RUN = 'lac-ui-dry-run';
const MESSAGE_TYPE_PRICE_REQUEST = 'lac-price-request';
const MESSAGE_TYPE_PRICE_RESPONSE = 'lac-price-response';
const MESSAGE_TYPE_FORM_FILL_REQUEST = 'lac-form-fill-request';
const MESSAGE_TYPE_FORM_FILL_RESPONSE = 'lac-form-fill-response';
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
let executionLockedUntil = 0;

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

type FormFillBridgeResponse = {
  priceSet: boolean;
  amountSet: boolean;
  priceValue: string | null;
  amountValue: string | null;
};

function countDecimals(sample: string): number {
  const normalized = sample.replace(/,/g, '').trim();
  const dotIndex = normalized.indexOf('.');
  if (dotIndex === -1) {
    return 0;
  }

  return Math.max(0, normalized.length - dotIndex - 1);
}

function formatPriceForInput(price: number, sample: string): string {
  if (!Number.isFinite(price)) {
    return '';
  }

  const decimals = countDecimals(sample);
  if (decimals <= 0) {
    return String(Math.round(price));
  }

  return price.toFixed(Math.min(8, decimals));
}

async function requestFormFillFromPageBridge(price: string, amount: string): Promise<FormFillBridgeResponse | null> {
  const requestId = `lac-fill-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return await new Promise<FormFillBridgeResponse | null>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(null);
    }, 300);

    const onMessage = (event: MessageEvent): void => {
      const data = event.data as
        | {
            source?: string;
            type?: string;
            requestId?: string;
            priceSet?: boolean;
            amountSet?: boolean;
            priceValue?: string | null;
            amountValue?: string | null;
          }
        | null;

      if (!data || data.source !== MESSAGE_SOURCE || data.type !== MESSAGE_TYPE_FORM_FILL_RESPONSE || data.requestId !== requestId) {
        return;
      }

      window.clearTimeout(timeoutId);
      window.removeEventListener('message', onMessage);
      resolve({
        priceSet: Boolean(data.priceSet),
        amountSet: Boolean(data.amountSet),
        priceValue: typeof data.priceValue === 'string' ? data.priceValue : null,
        amountValue: typeof data.amountValue === 'string' ? data.amountValue : null
      });
    };

    window.addEventListener('message', onMessage);
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: MESSAGE_TYPE_FORM_FILL_REQUEST,
        requestId,
        price,
        amount
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

function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function findButtonByText(label: string): HTMLButtonElement | null {
  const target = normalizeText(label);
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
  return (
    buttons.find((button) => {
      if (!isElementVisible(button)) {
        return false;
      }

      return normalizeText(button.textContent ?? '') === target;
    }) ?? null
  );
}

function findButtonByTestId(testId: string): HTMLButtonElement | null {
  const button = document.querySelector<HTMLButtonElement>(`button[data-testid="${testId}"]`);
  if (!button || !isElementVisible(button)) {
    return null;
  }

  return button;
}

function findInputNearLabel(label: string): HTMLInputElement | null {
  const target = normalizeText(label);
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('div, span, label'));

  for (const candidate of candidates) {
    if (!isElementVisible(candidate)) {
      continue;
    }

    if (normalizeText(candidate.textContent ?? '') !== target) {
      continue;
    }

    let cursor: HTMLElement | null = candidate;
    for (let depth = 0; depth < 5 && cursor; depth += 1) {
      const input = cursor.querySelector<HTMLInputElement>('input');
      if (input && isElementVisible(input)) {
        return input;
      }

      cursor = cursor.parentElement;
    }
  }

  return null;
}

function findLimitPriceInput(): HTMLInputElement | null {
  const byTestId = document.querySelector<HTMLInputElement>('input[data-testid="limit-order-limit-input"]');
  if (byTestId && isElementVisible(byTestId)) {
    return byTestId;
  }

  return findInputNearLabel('Limit Price');
}

function setInputValue(input: HTMLInputElement, value: string): void {
  input.focus();
  input.select();

  const execCommandResult =
    typeof document.execCommand === 'function' ? document.execCommand('insertText', false, value) : false;

  if (!execCommandResult || input.value !== value) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
}

function isButtonDisabled(button: HTMLButtonElement): boolean {
  return button.disabled || button.getAttribute('aria-disabled') === 'true';
}

function findSubmitButton(): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(isElementVisible);
  const byEnterAmount = buttons.find((button) => normalizeText(button.textContent ?? '') === 'enter amount');
  if (byEnterAmount) {
    return byEnterAmount;
  }

  const nonTabButtons = buttons.filter((button) => {
    const text = normalizeText(button.textContent ?? '');
    return text !== 'buy / long' && text !== 'sell / short' && text !== 'market' && text !== 'limit';
  });

  return nonTabButtons[0] ?? null;
}

function findPlaceOrderButton(): HTMLButtonElement | null {
  const button = document.querySelector<HTMLButtonElement>('button[data-testid="place-order-button"]');
  if (!button || !isElementVisible(button)) {
    return null;
  }

  return button;
}

async function waitForPlaceOrderButtonReady(timeoutMs = 1200): Promise<HTMLButtonElement | null> {
  const startedAt = nowMs();
  while (nowMs() - startedAt < timeoutMs) {
    const button = findPlaceOrderButton();
    if (button && !isButtonDisabled(button)) {
      return button;
    }

    await waitMs(50);
  }

  return findPlaceOrderButton();
}

function readSubmitState(button: HTMLButtonElement | null): { text: string; disabled: boolean } | null {
  if (!button) {
    return null;
  }

  return {
    text: (button.textContent ?? '').trim(),
    disabled: isButtonDisabled(button)
  };
}

function setExecutionStatus(status: 'success' | 'failed', reason: string): void {
  document.documentElement.setAttribute('data-lac-last-exec-status', status);
  document.documentElement.setAttribute('data-lac-last-exec-reason', reason);
  document.documentElement.setAttribute('data-lac-last-exec-ts', new Date().toISOString());
}

function nowMs(): number {
  return Date.now();
}

function withExecutionLock(): boolean {
  const current = nowMs();
  if (current < executionLockedUntil) {
    return false;
  }

  executionLockedUntil = current + 650;
  return true;
}

function waitMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

async function waitForLimitInputs(timeoutMs = 1200): Promise<{ priceInput: HTMLInputElement; amountInput: HTMLInputElement } | null> {
  const startedAt = nowMs();
  while (nowMs() - startedAt < timeoutMs) {
    const priceInput = findLimitPriceInput();
    const amountInput = findInputNearLabel('Amount');
    if (priceInput && amountInput) {
      return { priceInput, amountInput };
    }

    await waitMs(50);
  }

  return null;
}

async function executeUiOrderDryRun(payload: DraftOrderPayload): Promise<void> {
  if (!withExecutionLock()) {
    setExecutionStatus('failed', 'execution-locked');
    console.warn(`${LOG_PREFIX} ui-order-submit skipped`, { reason: 'execution-locked' });
    return;
  }

  if (payload.side !== 'buy' && payload.side !== 'sell') {
    setExecutionStatus('failed', 'side-unknown');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'side-unknown', payload });
    return;
  }

  if (typeof payload.slotVolume !== 'number' || !Number.isFinite(payload.slotVolume) || payload.slotVolume <= 0) {
    setExecutionStatus('failed', 'slot-volume-invalid');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'slot-volume-invalid', payload });
    return;
  }

  if (!Number.isFinite(payload.clickedPrice) || payload.clickedPrice <= 0) {
    setExecutionStatus('failed', 'price-invalid');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'price-invalid', payload });
    return;
  }

  const limitButton = findButtonByTestId('select-order-type-limit') ?? findButtonByText('Limit');
  const buyButton = findButtonByTestId('order-buy-button') ?? findButtonByText('Buy / Long');
  const sellButton = findButtonByTestId('order-sell-button') ?? findButtonByText('Sell / Short');
  const buttonMeta = (button: HTMLButtonElement | null): { found: boolean; testId: string | null; text: string | null } => ({
    found: Boolean(button),
    testId: button?.getAttribute('data-testid') ?? null,
    text: button ? (button.textContent ?? '').trim() : null
  });

  console.log(`${LOG_PREFIX} ui-controls`, {
    limit: buttonMeta(limitButton),
    buy: buttonMeta(buyButton),
    sell: buttonMeta(sellButton)
  });

  if (!limitButton) {
    setExecutionStatus('failed', 'limit-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'limit-button-missing' });
    return;
  }

  if (limitButton.getAttribute('aria-pressed') !== 'true') {
    limitButton.click();
    await waitMs(80);
  }

  const sideButton = payload.side === 'buy' ? buyButton : sellButton;
  if (!sideButton) {
    setExecutionStatus('failed', 'side-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'side-button-missing', side: payload.side });
    return;
  }

  sideButton.click();
  await waitMs(30);

  const limitInputs = await waitForLimitInputs();
  if (!limitInputs) {
    setExecutionStatus('failed', 'input-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, {
      reason: 'input-missing'
    });
    return;
  }
  const { priceInput, amountInput } = limitInputs;

  const submitBeforeButton = findSubmitButton();
  const submitBefore = readSubmitState(submitBeforeButton);
  if (!submitBeforeButton || !submitBefore) {
    setExecutionStatus('failed', 'submit-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'submit-button-missing' });
    return;
  }

  const formattedClickedPrice = formatPriceForInput(payload.clickedPrice, priceInput.value);
  const slotVolumeText = String(payload.slotVolume);

  injectPagePriceBridge();
  const bridgeFill = await requestFormFillFromPageBridge(formattedClickedPrice, slotVolumeText);
  if (!bridgeFill || !bridgeFill.priceSet || !bridgeFill.amountSet) {
    setInputValue(priceInput, formattedClickedPrice);
    setInputValue(amountInput, slotVolumeText);
  }
  await waitMs(50);

  const submitAfterButton = findSubmitButton();
  const submitAfter = readSubmitState(submitAfterButton);
  if (!submitAfterButton || !submitAfter) {
    setExecutionStatus('failed', 'submit-button-missing-after-fill');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'submit-button-missing-after-fill' });
    return;
  }

  const submitReady = !submitAfter.disabled && normalizeText(submitAfter.text) !== 'enter amount';
  if (!submitReady) {
    setExecutionStatus('failed', 'submit-not-ready');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, {
      reason: 'submit-not-ready',
      before: submitBefore,
      after: submitAfter
    });
    return;
  }

  const placeOrderButton = (await waitForPlaceOrderButtonReady()) ?? submitAfterButton;
  if (!placeOrderButton) {
    setExecutionStatus('failed', 'place-order-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'place-order-button-missing' });
    return;
  }

  if (isButtonDisabled(placeOrderButton)) {
    setExecutionStatus('failed', 'place-order-button-disabled');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'place-order-button-disabled' });
    return;
  }

  await waitMs(100);
  placeOrderButton.click();
  setExecutionStatus('success', 'order-clicked');
  console.log(`${LOG_PREFIX} ui-order-submit order-clicked`, {
    side: payload.side as UiOrderSide,
    price: payload.clickedPrice,
    amount: payload.slotVolume,
    clickedButton: (placeOrderButton.textContent ?? '').trim(),
    sideTab: (sideButton.textContent ?? '').trim(),
    submitBefore,
    submitAfter
  });
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

    if (!data || data.source !== MESSAGE_SOURCE) {
      return;
    }

    if (data.type === MESSAGE_TYPE_DRAFT && data.payload) {
      document.documentElement.setAttribute('data-lac-last-clicked-price', String(data.payload.clickedPrice));
      document.documentElement.setAttribute('data-lac-last-side', data.payload.side);
      document.documentElement.setAttribute('data-lac-last-ts', data.payload.timestamp);
      console.log(`${LOG_PREFIX} draft-limit-order`, data.payload);
      return;
    }

    if (data.type === MESSAGE_TYPE_UI_DRY_RUN && data.payload) {
      void executeUiOrderDryRun(data.payload).catch((error: unknown) => {
        setExecutionStatus('failed', 'dry-run-handler-failed');
        console.error(`${LOG_PREFIX} ui-order-submit handler failed`, error);
      });
    }
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

  const draftPayload: DraftOrderPayload = {
    ticker,
    clickedPrice,
    currentPrice,
    side,
    action: sideToAction(side),
    slotVolume: getSelectedSlotVolume(),
    activeSlotIndex: activeSlotConfig.activeSlotIndex,
    clickY: event.clientY,
    timestamp: new Date().toISOString()
  };

  submitLimitOrderDraft(draftPayload);

  if (window.top !== window) {
    window.top?.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: MESSAGE_TYPE_UI_DRY_RUN,
        payload: draftPayload
      },
      '*'
    );
    return;
  }

  void executeUiOrderDryRun(draftPayload);
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
