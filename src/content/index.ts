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

function tickerFromTradeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/trade\/([^/]+)/i);
    return match ? decodeURIComponent(match[1]).toUpperCase() : null;
  } catch {
    return null;
  }
}

function parseMarkPriceFromPage(): number | null {
  const text = document.body?.innerText ?? '';
  const match = text.match(/Mark\s*Price\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
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

function getActiveChartWindow(): (Window & Record<string, unknown>) | null {
  const current = window as Window & Record<string, unknown>;
  if (current.chartWidgetCollection) {
    return current;
  }

  return null;
}

function getChartCanvas(doc: Document): HTMLCanvasElement | null {
  return (
    doc.querySelector<HTMLCanvasElement>('canvas[data-name="pane-top-canvas"]') ??
    Array.from(doc.querySelectorAll<HTMLCanvasElement>('canvas')).find((canvas) =>
      (canvas.getAttribute('aria-label') ?? '').includes('Chart for')
    ) ??
    null
  );
}

function getChartCanvases(doc: Document): HTMLCanvasElement[] {
  const canvases = Array.from(doc.querySelectorAll<HTMLCanvasElement>('canvas'));
  return canvases.filter((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20;
  });
}

function isClickInsideChartArea(event: MouseEvent, doc: Document): boolean {
  return getChartCanvases(doc).some((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  });
}

type PriceLabelPoint = {
  y: number;
  price: number;
};

function parsePriceText(text: string): number | null {
  const normalized = text.trim().replace(/,/g, '');
  if (!/^\s*[+-]?(?:\d+\.\d+|\d+|\.\d+)\s*$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractAxisPriceLabels(doc: Document): PriceLabelPoint[] {
  const elements = Array.from(doc.querySelectorAll<HTMLElement>('div, span'));
  const points = new Map<number, number>();

  for (const element of elements) {
    const text = element.textContent?.trim();
    if (!text) {
      continue;
    }

    const price = parsePriceText(text);
    if (price === null) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }

    if (rect.left < window.innerWidth * 0.75) {
      continue;
    }

    const y = rect.top + rect.height / 2;
    const roundedY = Math.round(y * 10) / 10;
    if (!points.has(roundedY)) {
      points.set(roundedY, price);
    }
  }

  return Array.from(points.entries())
    .map(([y, price]) => ({ y, price }))
    .sort((a, b) => a.y - b.y);
}

function interpolatePriceAtY(labels: PriceLabelPoint[], y: number): number | null {
  if (labels.length < 2) {
    return null;
  }

  for (let i = 0; i < labels.length; i += 1) {
    if (Math.abs(labels[i].y - y) < 0.5) {
      return labels[i].price;
    }
  }

  for (let i = 0; i < labels.length - 1; i += 1) {
    const top = labels[i];
    const bottom = labels[i + 1];
    if (y < top.y || y > bottom.y) {
      continue;
    }

    const yRange = bottom.y - top.y;
    if (yRange === 0) {
      return top.price;
    }

    const ratio = (y - top.y) / yRange;
    return top.price + (bottom.price - top.price) * ratio;
  }

  return null;
}

function resolveClickedPriceByUniversalInterpolation(event: MouseEvent, canvasRect: DOMRect): number | null {
  const labels = Array.from(document.querySelectorAll<HTMLElement>('*'))
    .map((element) => {
      const text = element.textContent?.trim();
      if (!text || text.length > 15) {
        return null;
      }

      const num = Number(text.replace(/,/g, ''));
      if (!Number.isFinite(num)) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return null;
      }

      return { price: num, y: rect.top + rect.height / 2 };
    })
    .filter((point): point is PriceLabelPoint => point !== null)
    .sort((a, b) => a.y - b.y);

  if (labels.length < 2) {
    return null;
  }

  const globalY = event.clientY;
  for (let i = 0; i < labels.length - 1; i += 1) {
    const upper = labels[i];
    const lower = labels[i + 1];
    if (globalY < upper.y || globalY > lower.y) {
      continue;
    }

    const ratio = (globalY - upper.y) / (lower.y - upper.y);
    return upper.price - ratio * (upper.price - lower.price);
  }

  const first = labels[0];
  const last = labels[labels.length - 1];
  const pixelRange = last.y - first.y;
  if (pixelRange === 0) {
    return null;
  }

  const priceRange = first.price - last.price;
  const pricePerPixel = priceRange / pixelRange;
  if (globalY < first.y) {
    return first.price + (first.y - globalY) * pricePerPixel;
  }

  const fallbackY = Math.min(globalY, canvasRect.bottom);
  return last.price - (fallbackY - last.y) * pricePerPixel;
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

async function resolveClickedPrice(event: MouseEvent): Promise<number | null> {
  const tvWindow = getActiveChartWindow();

  const canvas = getChartCanvas(document);
  if (!canvas) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  const localY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  const bridgePrice = await requestPriceFromPageBridge(localY);
  if (bridgePrice !== null) {
    return bridgePrice;
  }

  if (tvWindow) {
    const widgetModelRef = (tvWindow.chartWidget as Record<string, unknown> | undefined)
      ?._model as Record<string, unknown> | undefined;
    const widgetModel =
      (widgetModelRef?.m_model as Record<string, unknown> | undefined) ??
      ((widgetModelRef?._value as Record<string, unknown> | undefined)?.m_model as Record<string, unknown> | undefined);

    const activeRef = (tvWindow.chartWidgetCollection as Record<string, unknown> | undefined)
      ?.activeChartWidget as Record<string, unknown> | undefined;
    const active = (activeRef?._value as Record<string, unknown> | undefined) ?? activeRef;
    const activeModelRef = active?._model as Record<string, unknown> | undefined;
    const activeModel =
      (activeModelRef?.m_model as Record<string, unknown> | undefined) ??
      ((activeModelRef?._value as Record<string, unknown> | undefined)?.m_model as Record<string, unknown> | undefined);

    const mainSeries =
      (widgetModel?._mainSeries as Record<string, unknown> | undefined) ??
      (activeModel?._mainSeries as Record<string, unknown> | undefined);
    const priceScale = mainSeries?._priceScale as Record<string, unknown> | undefined;

    if (mainSeries && priceScale && typeof priceScale.coordinateToPrice === 'function') {
      const firstValue = typeof mainSeries.firstValue === 'function' ? mainSeries.firstValue() : null;
      const rawPrice = (priceScale.coordinateToPrice as (y: number, firstValue: unknown) => unknown)(localY, firstValue);
      if (typeof rawPrice === 'number' && Number.isFinite(rawPrice)) {
        return rawPrice;
      }
    }
  }

  const labels = extractAxisPriceLabels(document);
  const axisInterpolated = interpolatePriceAtY(labels, event.clientY);
  if (axisInterpolated !== null) {
    return axisInterpolated;
  }

  return resolveClickedPriceByUniversalInterpolation(event, rect);
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
  if (!event.altKey || event.button !== 0) {
    return;
  }

  if (!isClickInsideChartArea(event, document)) {
    return;
  }

  document.documentElement.setAttribute('data-lac-last-event-ts', new Date().toISOString());
  document.documentElement.setAttribute('data-lac-last-event-y', String(event.clientY));

  const clickedPrice = await resolveClickedPrice(event);
  if (clickedPrice === null) {
    document.documentElement.setAttribute('data-lac-last-error', 'could-not-resolve-clicked-price');
    console.warn(`${LOG_PREFIX} could not resolve clicked price`, {
      href: window.location.href,
      clickY: event.clientY
    });
    return;
  }

  const ticker = tickerFromTradeUrl(window.top?.location.href ?? window.location.href);
  const currentPrice = parseMarkPriceFromPage();
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
  if (!getChartCanvas(document)) {
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
    isTop: window.top === window
  });
}

bindTopWindowMessageBridge();
bindOnCanvas();
setInterval(bindOnCanvas, 1000);
console.info(`${LOG_PREFIX} content loaded`, {
  href: window.location.href,
  isTop: window.top === window
});
