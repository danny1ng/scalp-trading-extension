const LIGHTER_HOSTS = new Set(['app.lighter.xyz', 'lighter.exchange']);
const BINANCE_HOSTS = new Set(['www.binance.com', 'binance.com']);

export function isSupportedTradeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isLighterTrade = LIGHTER_HOSTS.has(parsed.hostname) && /^\/trade\//i.test(parsed.pathname);
    const isBinanceFutures =
      BINANCE_HOSTS.has(parsed.hostname) && /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?futures\/[^/]+$/i.test(parsed.pathname);
    return isLighterTrade || isBinanceFutures;
  } catch {
    return false;
  }
}

export function getSupportedHost(url: string): string | null {
  if (!isSupportedTradeUrl(url)) {
    return null;
  }

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
