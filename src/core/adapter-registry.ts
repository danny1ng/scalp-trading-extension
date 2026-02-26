import type { ExchangeAdapter } from './exchange-adapter';

const lighterAdapter: ExchangeAdapter = {
  id: 'lighter',
  matches: (url: string) => {
    try {
      const parsed = new URL(url);
      const isSupportedHost = parsed.hostname === 'app.lighter.xyz' || parsed.hostname === 'lighter.exchange';
      const isTradePath = /^\/trade\//i.test(parsed.pathname);
      return isSupportedHost && isTradePath;
    } catch {
      return false;
    }
  }
};

const adapters: ExchangeAdapter[] = [lighterAdapter];

export function resolveAdapterForUrl(url: string): ExchangeAdapter | null {
  return adapters.find((adapter) => adapter.matches(url)) ?? null;
}

export function getAdapters(): ExchangeAdapter[] {
  return [...adapters];
}
