(() => {
  const source = 'lighter-alt-click-extension';
  const requestType = 'lac-price-request';
  const responseType = 'lac-price-response';
  const fillRequestType = 'lac-form-fill-request';
  const fillResponseType = 'lac-form-fill-response';

  if ((window as Window & Record<string, unknown>).__lighterAltClickPageBridge) {
    return;
  }

  (window as Window & Record<string, unknown>).__lighterAltClickPageBridge = true;
  const fillInput = (input: HTMLInputElement | null, value: string): boolean => {
    if (!input) {
      return false;
    }

    input.focus();
    input.select();
    const execOk = typeof document.execCommand === 'function' ? document.execCommand('insertText', false, value) : false;
    if (!execOk || input.value !== value) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
    return input.value === value;
  };

  const findPriceInput = (): HTMLInputElement | null => {
    return document.querySelector<HTMLInputElement>('input[data-testid="limit-order-limit-input"]');
  };

  const findAmountInput = (): HTMLInputElement | null => {
    return (
      document.querySelector<HTMLInputElement>('input[data-testid="place-order-size-input"]') ??
      document.querySelector<HTMLInputElement>('input[placeholder="0.00000"]')
    );
  };

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as
      | {
          source?: string;
          type?: string;
          requestId?: string;
          localY?: number;
          price?: string;
          amount?: string;
        }
      | null;

    if (!data || data.source !== source) {
      return;
    }

    if (data.type === fillRequestType) {
      const price = typeof data.price === 'string' ? data.price : '';
      const amount = typeof data.amount === 'string' ? data.amount : '';

      const priceInput = findPriceInput();
      const amountInput = findAmountInput();

      const priceSet = price.length > 0 && fillInput(priceInput, price);
      const amountSet = amount.length > 0 && fillInput(amountInput, amount);

      window.postMessage(
        {
          source,
          type: fillResponseType,
          requestId: data.requestId,
          priceSet,
          amountSet,
          priceValue: priceInput?.value ?? null,
          amountValue: amountInput?.value ?? null
        },
        '*'
      );
      return;
    }

    if (data.type !== requestType) {
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
