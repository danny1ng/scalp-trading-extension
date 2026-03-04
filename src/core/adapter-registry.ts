import type { ExchangeAdapter } from './exchange-adapter';
import { lighterAdapter } from '../exchanges/lighter/adapter';
import { binanceAdapter } from '../exchanges/binance/adapter';

const adapters: ExchangeAdapter[] = [lighterAdapter, binanceAdapter];

export function resolveAdapterForUrl(url: string): ExchangeAdapter | null {
  return adapters.find((adapter) => adapter.matches(url)) ?? null;
}

export function getAdapters(): ExchangeAdapter[] {
  return [...adapters];
}
