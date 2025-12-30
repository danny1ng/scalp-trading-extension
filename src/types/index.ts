export type Exchange = 'lighter' | 'bitget';

export interface PositionSize {
  id: string;
  label: string;
  size: number;
}

export interface PositionSizeSet {
  exchange: Exchange;
  ticker: string;
  positions: PositionSize[];
}

export interface ChartClickEvent {
  price: number;
  timestamp: number;
  exchange: Exchange;
  ticker: string;
}

export interface OrderPlacement {
  exchange: Exchange;
  ticker: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface ExchangeConfig {
  name: Exchange;
  displayName: string;
  domain: string;
  chartSelector: string;
  priceExtractor: (event: MouseEvent, element: Element) => number | null;
  tickerExtractor: () => string | null;
}
