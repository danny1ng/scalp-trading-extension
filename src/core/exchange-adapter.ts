export type OrderUiTarget = {
  selectors?: string[];
  testIds?: string[];
  texts?: string[];
  labels?: string[];
};

export type ExchangeOrderUiDescriptor = {
  limitType: OrderUiTarget;
  side: {
    mode: 'tab' | 'submit';
    buy: OrderUiTarget;
    sell: OrderUiTarget;
  };
  fields: {
    price: OrderUiTarget;
    amount: OrderUiTarget;
  };
  submit?: OrderUiTarget;
};

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
      requestPriceFromPageBridge: (localY: number, targetWindow?: Window) => Promise<number | null>;
    }
  ) => Promise<number | null>;
  orderUi: ExchangeOrderUiDescriptor;
};
