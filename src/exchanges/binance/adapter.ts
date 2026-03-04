import type { ExchangeAdapter } from '../../core/exchange-adapter';

function isBinanceFuturesUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'www.binance.com' && parsed.hostname !== 'binance.com') {
      return false;
    }

    return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?futures\/[^/]+$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function parseNumberFromText(raw: string): number | null {
  const text = raw.trim().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  if (!text) {
    return null;
  }

  const compact = text.replace(/ /g, '');
  if (!/^[0-9.,]+$/.test(compact)) {
    return null;
  }

  let normalized = compact;
  const hasDot = normalized.includes('.');
  const hasComma = normalized.includes(',');

  if (hasDot && hasComma) {
    normalized = normalized.replace(/,/g, '');
  } else if (hasComma && !hasDot) {
    const parts = normalized.split(',');
    if (parts.length > 2) {
      normalized = normalized.replace(/,/g, '');
    } else {
      const fractional = parts[1] ?? '';
      if (fractional.length === 3 && parts[0].length >= 1) {
        normalized = normalized.replace(/,/g, '');
      } else {
        normalized = normalized.replace(',', '.');
      }
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function readCurrentPriceFromText(text: string): number | null {
  const patterns = [
    /Mark\s*([0-9][0-9\s,]*(?:\.[0-9]+)?)/i,
    /Маркировка\s*([0-9][0-9\s,.]*)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    const value = parseNumberFromText(match[1]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getChartCanvas(doc: Document = document): HTMLCanvasElement | null {
  const ariaSelector = 'canvas[aria-label*="Chart for"], canvas[aria-label*="График"]';
  const byAria = doc.querySelector<HTMLCanvasElement>(ariaSelector);
  if (byAria) {
    return byAria;
  }

  return (
    Array.from(doc.querySelectorAll<HTMLCanvasElement>('canvas')).find((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return rect.width > 100 && rect.height > 100;
    }) ?? null
  );
}

export const binanceAdapter: ExchangeAdapter = {
  id: 'binance',
  matches: (url: string) => isBinanceFuturesUrl(url),
  getTicker: (url: string) => {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?futures\/([^/]+)/i);
      return match ? decodeURIComponent(match[1]).toUpperCase() : null;
    } catch {
      return null;
    }
  },
  getCurrentPrice: () => {
    const localText = document.body?.innerText ?? '';
    const local = readCurrentPriceFromText(localText);
    if (local !== null) {
      return local;
    }

    try {
      if (window.top && window.top !== window) {
        const topText = window.top.document?.body?.innerText ?? '';
        return readCurrentPriceFromText(topText);
      }
    } catch {
      return null;
    }

    return null;
  },
  isClickInsideChartArea: (event: MouseEvent, doc: Document = document) => {
    const canvas = getChartCanvas(doc);
    if (!canvas) {
      return false;
    }

    const rect = canvas.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  },
  getChartCanvas,
  resolveClickedPrice: async (event: MouseEvent, deps) => {
    const eventDocument = event.view?.document ?? document;
    const eventWindow = event.view ?? window;
    const canvas = getChartCanvas(eventDocument);
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const localY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    return await deps.requestPriceFromPageBridge(localY, eventWindow);
  },
  orderUi: {
    limitType: {
      selectors: ['[role="tab"][aria-controls="bn-tab-pane-LIMIT"]'],
      texts: ['Limit', 'Лимит']
    },
    side: {
      mode: 'submit',
      buy: {
        selectors: ['button.bn-button__buy'],
        texts: ['Buy/Long', 'Купить/Лонг']
      },
      sell: {
        selectors: ['button.bn-button__sell'],
        texts: ['Sell/Short', 'Продать/Шорт']
      }
    },
    fields: {
      price: {
        selectors: ['input.bn-textField-input']
      },
      amount: {
        selectors: ['input.bn-textField-input']
      }
    }
  }
};
