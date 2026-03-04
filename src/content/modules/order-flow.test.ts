import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ExchangeAdapter } from '../../core/exchange-adapter';
import { executeUiOrderFlow } from './order-flow';

vi.mock('./bridge', () => {
  return {
    injectPagePriceBridge: vi.fn(),
    requestFormFillFromPageBridge: vi.fn(async () => null)
  };
});

function createAdapter(mode: 'tab' | 'submit'): ExchangeAdapter {
  return {
    id: 'test',
    matches: () => true,
    getTicker: () => null,
    getCurrentPrice: () => null,
    isClickInsideChartArea: () => false,
    getChartCanvas: () => null,
    resolveClickedPrice: async () => null,
    orderUi: {
      limitType: {
        selectors: ['[role="tab"][aria-controls="bn-tab-pane-LIMIT"]'],
        texts: ['Limit']
      },
      side: {
        mode,
        buy: { selectors: ['button.bn-button__buy'], texts: ['Buy/Long'] },
        sell: { selectors: ['button.bn-button__sell'], texts: ['Sell/Short'] }
      },
      fields: {
        price: { selectors: ['input[data-kind="price"]'] },
        amount: { selectors: ['input[data-kind="amount"]'] }
      },
      submit: {
        selectors: ['button[data-testid="place-order-button"]']
      }
    }
  };
}

function createSharedInputAdapter(): ExchangeAdapter {
  const base = createAdapter('submit');
  return {
    ...base,
    orderUi: {
      ...base.orderUi,
      fields: {
        price: { selectors: ['input.bn-textField-input'] },
        amount: { selectors: ['input.bn-textField-input'] }
      }
    }
  };
}

describe('executeUiOrderFlow', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="order-form">
        <div role="tab" aria-controls="bn-tab-pane-LIMIT">Limit</div>
        <label>Price <input data-kind="price" /></label>
        <label>Amount <input data-kind="amount" /></label>
        <button class="bn-button bn-button__buy">Buy/Long</button>
        <button class="bn-button bn-button__sell">Sell/Short</button>
      </div>
    `;
    document.documentElement.removeAttribute('data-lac-last-exec-status');
    document.documentElement.removeAttribute('data-lac-last-exec-reason');
    document.documentElement.removeAttribute('data-lac-paper-mode');
  });

  test('uses side button as submit in side-submit mode', async () => {
    const limit = document.querySelector('[role="tab"]') as HTMLButtonElement;
    const buyButton = document.querySelector('button.bn-button__buy') as HTMLButtonElement;
    const sellButton = document.querySelector('button.bn-button__sell') as HTMLButtonElement;
    const priceInput = document.querySelector('input[data-kind="price"]') as HTMLInputElement;
    const amountInput = document.querySelector('input[data-kind="amount"]') as HTMLInputElement;
    const limitClick = vi.spyOn(limit, 'click');
    const buyClick = vi.spyOn(buyButton, 'click');
    const sellClick = vi.spyOn(sellButton, 'click');

    await executeUiOrderFlow(
      {
        ticker: 'BTCUSDT',
        clickedPrice: 123.45,
        currentPrice: 124.5,
        side: 'buy',
        action: 'buy',
        slotVolume: 0.01,
        activeSlotIndex: 0,
        clickY: 10,
        timestamp: new Date().toISOString()
      },
      createAdapter('submit')
    );

    expect(limitClick).toHaveBeenCalled();
    expect(priceInput.value).toBe('123');
    expect(amountInput.value).toBe('0.01');
    expect(buyClick).toHaveBeenCalledTimes(1);
    expect(sellClick).not.toHaveBeenCalled();
    expect(document.documentElement.getAttribute('data-lac-last-exec-status')).toBe('success');
  });

  test('uses distinct text inputs for price and amount when selectors are shared', async () => {
    await new Promise((resolve) => setTimeout(resolve, 700));

    document.body.innerHTML = `
      <div id="order-form">
        <div role="tab" aria-controls="bn-tab-pane-LIMIT">Limit</div>
        <div>Price</div>
        <input class="bn-textField-input" value="73345.1" />
        <div>Size</div>
        <input class="bn-textField-input" value="" />
        <button class="bn-button bn-button__buy">Buy/Long</button>
        <button class="bn-button bn-button__sell">Sell/Short</button>
      </div>
    `;

    const [priceInput, amountInput] = Array.from(document.querySelectorAll<HTMLInputElement>('input.bn-textField-input'));

    await executeUiOrderFlow(
      {
        ticker: 'BTCUSDT',
        clickedPrice: 73300.5,
        currentPrice: 73400.5,
        side: 'buy',
        action: 'buy',
        slotVolume: 0.007,
        activeSlotIndex: 0,
        clickY: 10,
        timestamp: new Date().toISOString()
      },
      createSharedInputAdapter()
    );

    expect(priceInput.value).toBe('73300.5');
    expect(amountInput.value).toBe('0.007');
    expect(document.documentElement.getAttribute('data-lac-last-exec-status')).toBe('success');
  });

  test('skips final submit click when paper mode flag is enabled', async () => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    document.documentElement.setAttribute('data-lac-paper-mode', '1');

    const buyButton = document.querySelector('button.bn-button__buy') as HTMLButtonElement;
    const buyClick = vi.spyOn(buyButton, 'click');

    await executeUiOrderFlow(
      {
        ticker: 'BTCUSDT',
        clickedPrice: 123.45,
        currentPrice: 124.5,
        side: 'buy',
        action: 'buy',
        slotVolume: 0.01,
        activeSlotIndex: 0,
        clickY: 10,
        timestamp: new Date().toISOString()
      },
      createAdapter('submit')
    );

    expect(buyClick).not.toHaveBeenCalled();
    expect(document.documentElement.getAttribute('data-lac-last-exec-status')).toBe('success');
    expect(document.documentElement.getAttribute('data-lac-last-exec-reason')).toBe('paper-mode-skip-click');
  });
});
