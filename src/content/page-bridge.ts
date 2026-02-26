(() => {
  const source = 'lighter-alt-click-extension';
  const requestType = 'lac-price-request';
  const responseType = 'lac-price-response';

  if ((window as Window & Record<string, unknown>).__lighterAltClickPageBridge) {
    return;
  }

  (window as Window & Record<string, unknown>).__lighterAltClickPageBridge = true;
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as
      | {
          source?: string;
          type?: string;
          requestId?: string;
          localY?: number;
        }
      | null;

    if (!data || data.source !== source || data.type !== requestType) {
      return;
    }

    let price: number | null = null;
    try {
      const localY = Number(data.localY);
      const current = window as Window & Record<string, unknown>;
      const widgetModelRef = (current.chartWidget as Record<string, unknown> | undefined)
        ?._model as Record<string, unknown> | undefined;
      const widgetModel =
        (widgetModelRef?.m_model as Record<string, unknown> | undefined) ??
        ((widgetModelRef?._value as Record<string, unknown> | undefined)?.m_model as Record<string, unknown> | undefined);

      const activeRef = (current.chartWidgetCollection as Record<string, unknown> | undefined)
        ?.activeChartWidget as Record<string, unknown> | undefined;
      const active = (activeRef?._value as Record<string, unknown> | undefined) ?? activeRef;
      const activeModelRef = active?._model as Record<string, unknown> | undefined;
      const activeModel =
        (activeModelRef?.m_model as Record<string, unknown> | undefined) ??
        ((activeModelRef?._value as Record<string, unknown> | undefined)?.m_model as Record<string, unknown> | undefined);

      const mainSeries =
        (widgetModel?._mainSeries as Record<string, unknown> | undefined) ??
        (activeModel?._mainSeries as Record<string, unknown> | undefined);
      const priceScale = mainSeries?._priceScale as Record<string, unknown> | undefined;

      if (priceScale && typeof priceScale.coordinateToPrice === 'function') {
        const firstValue = typeof mainSeries?.firstValue === 'function' ? mainSeries.firstValue() : null;
        const rawPrice = (priceScale.coordinateToPrice as (y: number, firstValue: unknown) => unknown)(localY, firstValue);
        if (typeof rawPrice === 'number' && Number.isFinite(rawPrice)) {
          price = rawPrice;
        }
      }
    } catch {
      price = null;
    }

    window.postMessage(
      {
        source,
        type: responseType,
        requestId: data.requestId,
        price
      },
      '*'
    );
  });
})();
