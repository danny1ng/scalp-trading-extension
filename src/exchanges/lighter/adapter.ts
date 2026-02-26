import type { ExchangeAdapter } from '../../core/exchange-adapter';

type PriceLabelPoint = {
  y: number;
  price: number;
};

function getActiveChartWindow(): (Window & Record<string, unknown>) | null {
  const current = window as Window & Record<string, unknown>;
  if (current.chartWidgetCollection) {
    return current;
  }

  return null;
}

function getChartCanvas(doc: Document = document): HTMLCanvasElement | null {
  return (
    doc.querySelector<HTMLCanvasElement>('canvas[data-name="pane-top-canvas"]') ??
    Array.from(doc.querySelectorAll<HTMLCanvasElement>('canvas')).find((canvas) =>
      (canvas.getAttribute('aria-label') ?? '').includes('Chart for')
    ) ??
    null
  );
}

function getChartCanvases(doc: Document = document): HTMLCanvasElement[] {
  const canvases = Array.from(doc.querySelectorAll<HTMLCanvasElement>('canvas'));
  return canvases.filter((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20;
  });
}

function parsePriceText(text: string): number | null {
  const normalized = text.trim().replace(/,/g, '');
  if (!/^\s*[+-]?(?:\d+\.\d+|\d+|\.\d+)\s*$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractAxisPriceLabels(doc: Document = document): PriceLabelPoint[] {
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

function isSupportedLighterTradeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isSupportedHost = parsed.hostname === 'app.lighter.xyz' || parsed.hostname === 'lighter.exchange';
    return isSupportedHost && /^\/trade\/[^/]+/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export const lighterAdapter: ExchangeAdapter = {
  id: 'lighter',
  matches: (url: string) => isSupportedLighterTradeUrl(url),
  getTicker: (url: string) => {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/^\/trade\/([^/]+)/i);
      return match ? decodeURIComponent(match[1]).toUpperCase() : null;
    } catch {
      return null;
    }
  },
  getCurrentPrice: () => {
    const parseFromText = (text: string): number | null => {
      const match = text.match(/Mark\s*Price\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
      if (!match) {
        return null;
      }

      const parsed = Number(match[1].replace(/,/g, ''));
      return Number.isFinite(parsed) ? parsed : null;
    };

    const localText = document.body?.innerText ?? '';
    const localPrice = parseFromText(localText);
    if (localPrice !== null) {
      return localPrice;
    }

    try {
      if (window.top && window.top !== window) {
        const topText = window.top.document?.body?.innerText ?? '';
        const topPrice = parseFromText(topText);
        if (topPrice !== null) {
          return topPrice;
        }
      }
    } catch {
      return null;
    }

    return null;
  },
  isClickInsideChartArea: (event: MouseEvent, doc: Document = document) => {
    return getChartCanvases(doc).some((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    });
  },
  getChartCanvas,
  resolveClickedPrice: async (event: MouseEvent, deps) => {
    const tvWindow = getActiveChartWindow();
    const canvas = getChartCanvas(document);
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const localY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const bridgePrice = await deps.requestPriceFromPageBridge(localY);
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
};
