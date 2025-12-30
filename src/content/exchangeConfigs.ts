import { ExchangeConfig } from '@/types';

export const lighterConfig: ExchangeConfig = {
  name: 'lighter',
  displayName: 'Lighter',
  domain: 'lighter.xyz',
  chartSelector: 'canvas, .chart-container, .trading-view-chart',

  priceExtractor: (event: MouseEvent, element: Element): number | null => {
    const rect = element.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    console.log('[Lighter] Chart click detected:', { x: event.clientX, y, height });

    const priceRange = 100;
    const basePrice = 50000;
    const relativeY = 1 - (y / height);
    const price = basePrice + (relativeY - 0.5) * priceRange;

    console.log('[Lighter] Calculated price:', price);
    return price;
  },

  tickerExtractor: (): string | null => {
    const urlMatch = window.location.pathname.match(/\/trade\/([^\/]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    const titleElement = document.querySelector('.pair-selector, .ticker-name, [class*="ticker"]');
    if (titleElement?.textContent) {
      return titleElement.textContent.trim();
    }

    return 'BTC-USD';
  },
};

export const bitgetConfig: ExchangeConfig = {
  name: 'bitget',
  displayName: 'Bitget',
  domain: 'bitget.com',
  chartSelector: 'canvas.chart, .tv-chart, .trading-chart',

  priceExtractor: (event: MouseEvent, element: Element): number | null => {
    const rect = element.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    console.log('[Bitget] Chart click detected:', { x: event.clientX, y, height });

    const priceRange = 100;
    const basePrice = 50000;
    const relativeY = 1 - (y / height);
    const price = basePrice + (relativeY - 0.5) * priceRange;

    console.log('[Bitget] Calculated price:', price);
    return price;
  },

  tickerExtractor: (): string | null => {
    const urlMatch = window.location.pathname.match(/\/([A-Z]+USDT)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    const titleElement = document.querySelector('.symbol-title, .pair-name');
    if (titleElement?.textContent) {
      return titleElement.textContent.trim();
    }

    return 'BTCUSDT';
  },
};

export const exchangeConfigs: ExchangeConfig[] = [lighterConfig, bitgetConfig];

export function detectExchange(): ExchangeConfig | null {
  const hostname = window.location.hostname;

  for (const config of exchangeConfigs) {
    if (hostname.includes(config.domain)) {
      console.log(`[Exchange Detection] Detected: ${config.displayName}`);
      return config;
    }
  }

  console.log('[Exchange Detection] No supported exchange detected');
  return null;
}
