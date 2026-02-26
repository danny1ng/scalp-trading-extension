import { injectPagePriceBridge, requestFormFillFromPageBridge } from './bridge';
import type { DraftOrderPayload, UiOrderSide } from '../types';
import { LOG_PREFIX } from '../types';

let executionLockedUntil = 0;

function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function findButtonByText(label: string): HTMLButtonElement | null {
  const target = normalizeText(label);
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
  return (
    buttons.find((button) => {
      if (!isElementVisible(button)) {
        return false;
      }

      return normalizeText(button.textContent ?? '') === target;
    }) ?? null
  );
}

function findButtonByTestId(testId: string): HTMLButtonElement | null {
  const button = document.querySelector<HTMLButtonElement>(`button[data-testid="${testId}"]`);
  if (!button || !isElementVisible(button)) {
    return null;
  }

  return button;
}

function findInputNearLabel(label: string): HTMLInputElement | null {
  const target = normalizeText(label);
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('div, span, label'));

  for (const candidate of candidates) {
    if (!isElementVisible(candidate)) {
      continue;
    }

    if (normalizeText(candidate.textContent ?? '') !== target) {
      continue;
    }

    let cursor: HTMLElement | null = candidate;
    for (let depth = 0; depth < 5 && cursor; depth += 1) {
      const input = cursor.querySelector<HTMLInputElement>('input');
      if (input && isElementVisible(input)) {
        return input;
      }

      cursor = cursor.parentElement;
    }
  }

  return null;
}

function findLimitPriceInput(): HTMLInputElement | null {
  const byTestId = document.querySelector<HTMLInputElement>('input[data-testid="limit-order-limit-input"]');
  if (byTestId && isElementVisible(byTestId)) {
    return byTestId;
  }

  return findInputNearLabel('Limit Price');
}

function setInputValue(input: HTMLInputElement, value: string): void {
  input.focus();
  input.select();

  const execCommandResult =
    typeof document.execCommand === 'function' ? document.execCommand('insertText', false, value) : false;

  if (!execCommandResult || input.value !== value) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
}

function isButtonDisabled(button: HTMLButtonElement): boolean {
  return button.disabled || button.getAttribute('aria-disabled') === 'true';
}

function findSubmitButton(): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(isElementVisible);
  const byEnterAmount = buttons.find((button) => normalizeText(button.textContent ?? '') === 'enter amount');
  if (byEnterAmount) {
    return byEnterAmount;
  }

  const nonTabButtons = buttons.filter((button) => {
    const text = normalizeText(button.textContent ?? '');
    return text !== 'buy / long' && text !== 'sell / short' && text !== 'market' && text !== 'limit';
  });

  return nonTabButtons[0] ?? null;
}

function findPlaceOrderButton(): HTMLButtonElement | null {
  const button = document.querySelector<HTMLButtonElement>('button[data-testid="place-order-button"]');
  if (!button || !isElementVisible(button)) {
    return null;
  }

  return button;
}

async function waitForPlaceOrderButtonReady(timeoutMs = 1200): Promise<HTMLButtonElement | null> {
  const startedAt = nowMs();
  while (nowMs() - startedAt < timeoutMs) {
    const button = findPlaceOrderButton();
    if (button && !isButtonDisabled(button)) {
      return button;
    }

    await waitMs(50);
  }

  return findPlaceOrderButton();
}

function readSubmitState(button: HTMLButtonElement | null): { text: string; disabled: boolean } | null {
  if (!button) {
    return null;
  }

  return {
    text: (button.textContent ?? '').trim(),
    disabled: isButtonDisabled(button)
  };
}

export function setExecutionStatus(status: 'success' | 'failed', reason: string): void {
  document.documentElement.setAttribute('data-lac-last-exec-status', status);
  document.documentElement.setAttribute('data-lac-last-exec-reason', reason);
  document.documentElement.setAttribute('data-lac-last-exec-ts', new Date().toISOString());
}

type ExecuteUiOrderOptions = {
  safeMode: boolean;
};

function nowMs(): number {
  return Date.now();
}

function withExecutionLock(): boolean {
  const current = nowMs();
  if (current < executionLockedUntil) {
    return false;
  }

  executionLockedUntil = current + 650;
  return true;
}

function waitMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

async function waitForLimitInputs(timeoutMs = 1200): Promise<{ priceInput: HTMLInputElement; amountInput: HTMLInputElement } | null> {
  const startedAt = nowMs();
  while (nowMs() - startedAt < timeoutMs) {
    const priceInput = findLimitPriceInput();
    const amountInput = findInputNearLabel('Amount');
    if (priceInput && amountInput) {
      return { priceInput, amountInput };
    }

    await waitMs(50);
  }

  return null;
}

function countDecimals(sample: string): number {
  const normalized = sample.replace(/,/g, '').trim();
  const dotIndex = normalized.indexOf('.');
  if (dotIndex === -1) {
    return 0;
  }

  return Math.max(0, normalized.length - dotIndex - 1);
}

function formatPriceForInput(price: number, sample: string): string {
  if (!Number.isFinite(price)) {
    return '';
  }

  const decimals = countDecimals(sample);
  if (decimals <= 0) {
    return String(Math.round(price));
  }

  return price.toFixed(Math.min(8, decimals));
}

export async function executeUiOrderFlow(payload: DraftOrderPayload, options: ExecuteUiOrderOptions): Promise<void> {
  if (!withExecutionLock()) {
    setExecutionStatus('failed', 'execution-locked');
    console.warn(`${LOG_PREFIX} ui-order-submit skipped`, { reason: 'execution-locked' });
    return;
  }

  if (payload.side !== 'buy' && payload.side !== 'sell') {
    setExecutionStatus('failed', 'side-unknown');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'side-unknown', payload });
    return;
  }

  if (typeof payload.slotVolume !== 'number' || !Number.isFinite(payload.slotVolume) || payload.slotVolume <= 0) {
    setExecutionStatus('failed', 'slot-volume-invalid');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'slot-volume-invalid', payload });
    return;
  }

  if (!Number.isFinite(payload.clickedPrice) || payload.clickedPrice <= 0) {
    setExecutionStatus('failed', 'price-invalid');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'price-invalid', payload });
    return;
  }

  const limitButton = findButtonByTestId('select-order-type-limit') ?? findButtonByText('Limit');
  const buyButton = findButtonByTestId('order-buy-button') ?? findButtonByText('Buy / Long');
  const sellButton = findButtonByTestId('order-sell-button') ?? findButtonByText('Sell / Short');
  const buttonMeta = (button: HTMLButtonElement | null): { found: boolean; testId: string | null; text: string | null } => ({
    found: Boolean(button),
    testId: button?.getAttribute('data-testid') ?? null,
    text: button ? (button.textContent ?? '').trim() : null
  });

  console.log(`${LOG_PREFIX} ui-controls`, {
    limit: buttonMeta(limitButton),
    buy: buttonMeta(buyButton),
    sell: buttonMeta(sellButton)
  });

  if (!limitButton) {
    setExecutionStatus('failed', 'limit-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'limit-button-missing' });
    return;
  }

  if (limitButton.getAttribute('aria-pressed') !== 'true') {
    limitButton.click();
    await waitMs(80);
  }

  const sideButton = payload.side === 'buy' ? buyButton : sellButton;
  if (!sideButton) {
    setExecutionStatus('failed', 'side-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'side-button-missing', side: payload.side });
    return;
  }

  sideButton.click();
  await waitMs(30);

  const limitInputs = await waitForLimitInputs();
  if (!limitInputs) {
    setExecutionStatus('failed', 'input-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, {
      reason: 'input-missing'
    });
    return;
  }
  const { priceInput, amountInput } = limitInputs;

  const submitBeforeButton = findSubmitButton();
  const submitBefore = readSubmitState(submitBeforeButton);
  if (!submitBeforeButton || !submitBefore) {
    setExecutionStatus('failed', 'submit-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'submit-button-missing' });
    return;
  }

  const formattedClickedPrice = formatPriceForInput(payload.clickedPrice, priceInput.value);
  const slotVolumeText = String(payload.slotVolume);

  injectPagePriceBridge();
  const bridgeFill = await requestFormFillFromPageBridge(formattedClickedPrice, slotVolumeText);
  if (!bridgeFill || !bridgeFill.priceSet || !bridgeFill.amountSet) {
    setInputValue(priceInput, formattedClickedPrice);
    setInputValue(amountInput, slotVolumeText);
  }
  await waitMs(50);

  const submitAfterButton = findSubmitButton();
  const submitAfter = readSubmitState(submitAfterButton);
  if (!submitAfterButton || !submitAfter) {
    setExecutionStatus('failed', 'submit-button-missing-after-fill');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'submit-button-missing-after-fill' });
    return;
  }

  const submitReady = !submitAfter.disabled && normalizeText(submitAfter.text) !== 'enter amount';
  if (!submitReady) {
    setExecutionStatus('failed', 'submit-not-ready');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, {
      reason: 'submit-not-ready',
      before: submitBefore,
      after: submitAfter
    });
    return;
  }

  const placeOrderButton = (await waitForPlaceOrderButtonReady()) ?? submitAfterButton;
  if (!placeOrderButton) {
    setExecutionStatus('failed', 'place-order-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'place-order-button-missing' });
    return;
  }

  if (isButtonDisabled(placeOrderButton)) {
    setExecutionStatus('failed', 'place-order-button-disabled');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'place-order-button-disabled' });
    return;
  }

  if (options.safeMode) {
    setExecutionStatus('success', 'safe-mode-ready');
    console.log(`${LOG_PREFIX} ui-order-submit safe-mode-ready`, {
      side: payload.side as UiOrderSide,
      price: payload.clickedPrice,
      amount: payload.slotVolume,
      wouldClickButton: (placeOrderButton.textContent ?? '').trim(),
      sideTab: (sideButton.textContent ?? '').trim(),
      submitBefore,
      submitAfter
    });
    return;
  }

  await waitMs(100);
  placeOrderButton.click();
  setExecutionStatus('success', 'order-clicked');
  console.log(`${LOG_PREFIX} ui-order-submit order-clicked`, {
    side: payload.side as UiOrderSide,
    price: payload.clickedPrice,
    amount: payload.slotVolume,
    clickedButton: (placeOrderButton.textContent ?? '').trim(),
    sideTab: (sideButton.textContent ?? '').trim(),
    submitBefore,
    submitAfter
  });
}
