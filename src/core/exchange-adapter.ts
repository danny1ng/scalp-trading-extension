export type ExchangeAdapter = {
  id: string;
  matches: (url: string) => boolean;
  getTicker: (url: string) => string | null;
  getCurrentPrice: () => number | null;
  isClickInsideChartArea: (event: MouseEvent, doc?: Document) => boolean;
  getChartCanvas: (doc?: Document) => HTMLCanvasElement | null;
  resolveClickedPrice: (
    event: MouseEvent,
    deps: {
      requestPriceFromPageBridge: (localY: number) => Promise<number | null>;
    }
  ) => Promise<number | null>;
};
