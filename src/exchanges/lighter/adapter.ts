import type { ExchangeAdapter } from '../../core/exchange-adapter';

export const lighterAdapter: ExchangeAdapter = {
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
