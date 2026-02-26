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

document.documentElement.setAttribute('data-lac-injected', '1');

const activeAdapter = resolveAdapterForUrl(window.location.href);

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
    slotVolume: null,
    activeSlotIndex: 0,
    clickY: event.clientY,
    timestamp: new Date().toISOString()
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
bindOnCanvas();
setInterval(bindOnCanvas, 1000);
console.info(`${LOG_PREFIX} content loaded`, {
  href: window.location.href,
  isTop: window.top === window,
  adapter: activeAdapter?.id ?? 'none'
});
