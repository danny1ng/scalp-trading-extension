import type { ExchangeAdapter } from './exchange-adapter';
import { lighterAdapter } from '../exchanges/lighter/adapter';

const adapters: ExchangeAdapter[] = [lighterAdapter];

export function resolveAdapterForUrl(url: string): ExchangeAdapter | null {
  return adapters.find((adapter) => adapter.matches(url)) ?? null;
}

export function getAdapters(): ExchangeAdapter[] {
  return [...adapters];
}
