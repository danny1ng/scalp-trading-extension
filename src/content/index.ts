import { resolveAdapterForUrl } from '../core/adapter-registry';
import { injectPagePriceBridge, requestPriceFromPageBridge } from './modules/bridge';
import { createHudSlotsController } from './modules/hud-slots';
import { executeUiOrderFlow, setExecutionStatus } from './modules/order-flow';
import {
  LOG_PREFIX,
  MESSAGE_SOURCE,
  MESSAGE_TYPE_DRAFT,
  MESSAGE_TYPE_UI_EXECUTE,
  type DraftOrderPayload,
  type OrderSide
} from './types';

document.documentElement.setAttribute('data-lac-injected', '1');

const activeAdapter = resolveAdapterForUrl(window.location.href);
const hudSlotsController = createHudSlotsController(activeAdapter);

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

  const key = '__scalpAltClickBridgeBound';
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

    if (data.type === MESSAGE_TYPE_UI_EXECUTE && data.payload) {
      void executeUiOrderFlow(data.payload, { safeMode: hudSlotsController.getSafeMode() }).catch((error: unknown) => {
        setExecutionStatus('failed', 'execute-handler-failed');
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
    slotVolume: hudSlotsController.getSelectedSlotVolume(),
    activeSlotIndex: hudSlotsController.getActiveSlotIndex(),
    clickY: event.clientY,
    timestamp: new Date().toISOString()
  };

  submitLimitOrderDraft(draftPayload);

  if (window.top !== window) {
    window.top?.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: MESSAGE_TYPE_UI_EXECUTE,
        payload: draftPayload
      },
      '*'
    );
    return;
  }

  void executeUiOrderFlow(draftPayload, { safeMode: hudSlotsController.getSafeMode() });
}

function bindOnCanvas(): void {
  if (!activeAdapter) {
    document.documentElement.setAttribute('data-lac-adapter', 'missing');
    return;
  }

  if (!activeAdapter.getChartCanvas(document)) {
    return;
  }

  const marker = '__scalpAltClickBound';
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
void hudSlotsController.loadSlotConfigFromStorage();
void hudSlotsController.loadHudSettingsFromStorage();
void hudSlotsController.loadSafeModeFromStorage();
bindOnCanvas();
hudSlotsController.bindSlotHotkeys();
hudSlotsController.bindStorageSync();
setInterval(bindOnCanvas, 1000);
setInterval(() => {
  hudSlotsController.syncTickerFromLocation();
}, 2000);
console.info(`${LOG_PREFIX} content loaded`, {
  href: window.location.href,
  isTop: window.top === window,
  adapter: activeAdapter?.id ?? 'none'
});
