import type { ExchangeAdapter, OrderUiTarget } from '../../core/exchange-adapter';
import { injectPagePriceBridge, requestFormFillFromPageBridge } from './bridge';
import type { DraftOrderPayload } from '../types';
import { LOG_PREFIX } from '../types';

let executionLockedUntil = 0;

function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return true;
  }

  return rect.width > 0 && rect.height > 0;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isControlDisabled(element: HTMLElement): boolean {
  return (
    (element instanceof HTMLButtonElement && element.disabled) ||
    (element instanceof HTMLInputElement && element.disabled) ||
    element.getAttribute('aria-disabled') === 'true'
  );
}

function listVisibleElements(root: ParentNode, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((element) => isElementVisible(element));
}

function findTargetElement(target: OrderUiTarget | undefined, root: ParentNode = document): HTMLElement | null {
  if (!target) {
    return null;
  }

  for (const selector of target.selectors ?? []) {
    const candidate = listVisibleElements(root, selector)[0];
    if (candidate) {
      return candidate;
    }
  }

  for (const testId of target.testIds ?? []) {
    const candidate = listVisibleElements(root, `[data-testid="${testId}"]`)[0];
    if (candidate) {
      return candidate;
    }
  }

  for (const text of target.texts ?? []) {
    const normalizedTarget = normalizeText(text);
    const candidates = listVisibleElements(root, 'button,[role="button"],[role="tab"]');
    const byExact = candidates.find((candidate) => normalizeText(candidate.textContent ?? '') === normalizedTarget);
    if (byExact) {
      return byExact;
    }

    const byContains = candidates.find((candidate) => normalizeText(candidate.textContent ?? '').includes(normalizedTarget));
    if (byContains) {
      return byContains;
    }
  }

  return null;
}

function findInputNearLabels(labels: string[], root: ParentNode = document): HTMLInputElement | null {
  if (labels.length === 0) {
    return null;
  }

  const normalizeLabel = (value: string): string => normalizeText(value.replace(/[:.]$/g, ''));
  const normalizedLabels = labels.map(normalizeLabel);
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('div, span, label'));

  for (const candidate of candidates) {
    if (!isElementVisible(candidate)) {
      continue;
    }

    const textRaw = (candidate.textContent ?? '').trim();
    const text = normalizeLabel(textRaw);
    if (!text) {
      continue;
    }

    // Skip large container blocks to avoid false matches in dense exchange layouts.
    if (text.length > 40 || text.split(' ').length > 4) {
      continue;
    }

    const labelMatches = normalizedLabels.some((label) => text === label);
    if (!labelMatches) {
      continue;
    }

    let cursor: HTMLElement | null = candidate;
    for (let depth = 0; depth < 6 && cursor; depth += 1) {
      const input = cursor.querySelector<HTMLInputElement>('input');
      if (input && isElementVisible(input)) {
        return input;
      }

      cursor = cursor.parentElement;
    }
  }

  return null;
}

function findInputForTarget(
  target: OrderUiTarget,
  root: ParentNode = document,
  exclude: ReadonlySet<HTMLInputElement> = new Set()
): HTMLInputElement | null {
  const byLabel = findInputNearLabels(target.labels ?? [], root);
  if (byLabel && !exclude.has(byLabel)) {
    return byLabel;
  }

  for (const selector of target.selectors ?? []) {
    const bySelector = listVisibleElements(root, selector).find(
      (element) => element instanceof HTMLInputElement && !exclude.has(element)
    );
    if (bySelector instanceof HTMLInputElement) {
      return bySelector;
    }
  }

  for (const testId of target.testIds ?? []) {
    const byTestId = listVisibleElements(root, `input[data-testid="${testId}"]`).find(
      (element) => element instanceof HTMLInputElement && !exclude.has(element)
    );
    if (byTestId instanceof HTMLInputElement) {
      return byTestId;
    }
  }

  return null;
}

function collectAncestors(element: HTMLElement): HTMLElement[] {
  const ancestors: HTMLElement[] = [element];
  let cursor = element.parentElement;
  while (cursor) {
    ancestors.push(cursor);
    cursor = cursor.parentElement;
  }

  return ancestors;
}

function findCommonOrderRoot(elements: Array<HTMLElement | null>): HTMLElement | null {
  const concrete = elements.filter((element): element is HTMLElement => Boolean(element));
  if (concrete.length === 0) {
    return null;
  }

  const first = collectAncestors(concrete[0]);
  for (const ancestor of first) {
    if (concrete.every((element) => element === ancestor || ancestor.contains(element))) {
      return ancestor;
    }
  }

  return concrete[0].parentElement;
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

function findFallbackSubmitButton(root: ParentNode = document): HTMLButtonElement | null {
  const buttons = listVisibleElements(root, 'button').filter(
    (element): element is HTMLButtonElement => element instanceof HTMLButtonElement
  );

  const byEnterAmount = buttons.find((button) => normalizeText(button.textContent ?? '') === 'enter amount');
  if (byEnterAmount) {
    return byEnterAmount;
  }

  const ignoreTexts = new Set(['buy / long', 'sell / short', 'market', 'limit']);
  return buttons.find((button) => !ignoreTexts.has(normalizeText(button.textContent ?? ''))) ?? null;
}

function readSubmitState(button: HTMLElement | null): { text: string; disabled: boolean } | null {
  if (!button) {
    return null;
  }

  return {
    text: (button.textContent ?? '').trim(),
    disabled: isControlDisabled(button)
  };
}

export function setExecutionStatus(status: 'success' | 'failed', reason: string): void {
  document.documentElement.setAttribute('data-lac-last-exec-status', status);
  document.documentElement.setAttribute('data-lac-last-exec-reason', reason);
  document.documentElement.setAttribute('data-lac-last-exec-ts', new Date().toISOString());
}

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

function isPaperModeEnabled(): boolean {
  return document.documentElement.getAttribute('data-lac-paper-mode') === '1';
}

async function waitForOrderInputs(
  adapter: ExchangeAdapter,
  root: ParentNode,
  timeoutMs = 1200
): Promise<{ priceInput: HTMLInputElement; amountInput: HTMLInputElement } | null> {
  const startedAt = nowMs();
  while (nowMs() - startedAt < timeoutMs) {
    const priceInput = findInputForTarget(adapter.orderUi.fields.price, root);
    const amountInput = findInputForTarget(
      adapter.orderUi.fields.amount,
      root,
      new Set<HTMLInputElement>(priceInput ? [priceInput] : [])
    );

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

export async function executeUiOrderFlow(payload: DraftOrderPayload, adapter: ExchangeAdapter | null): Promise<void> {
  if (!withExecutionLock()) {
    setExecutionStatus('failed', 'execution-locked');
    console.warn(`${LOG_PREFIX} ui-order-submit skipped`, { reason: 'execution-locked' });
    return;
  }

  if (!adapter) {
    setExecutionStatus('failed', 'adapter-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'adapter-missing' });
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

  const limitButton = findTargetElement(adapter.orderUi.limitType, document);
  const buyButton = findTargetElement(adapter.orderUi.side.buy, document);
  const sellButton = findTargetElement(adapter.orderUi.side.sell, document);
  const orderRoot = findCommonOrderRoot([limitButton, buyButton, sellButton]) ?? document;

  const buttonMeta = (button: HTMLElement | null): { found: boolean; testId: string | null; text: string | null } => ({
    found: Boolean(button),
    testId: button?.getAttribute('data-testid') ?? null,
    text: button ? (button.textContent ?? '').trim() : null
  });

  console.log(`${LOG_PREFIX} ui-controls`, {
    adapter: adapter.id,
    limit: buttonMeta(limitButton),
    buy: buttonMeta(buyButton),
    sell: buttonMeta(sellButton)
  });

  if (!limitButton) {
    setExecutionStatus('failed', 'limit-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'limit-button-missing', adapter: adapter.id });
    return;
  }

  const limitActive =
    limitButton.getAttribute('aria-pressed') === 'true' ||
    limitButton.getAttribute('aria-selected') === 'true' ||
    limitButton.classList.contains('active');

  if (!limitActive) {
    limitButton.click();
    await waitMs(80);
  }

  const sideButton = payload.side === 'buy' ? buyButton : sellButton;
  if (!sideButton) {
    setExecutionStatus('failed', 'side-button-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, {
      reason: 'side-button-missing',
      side: payload.side,
      adapter: adapter.id
    });
    return;
  }

  if (adapter.orderUi.side.mode === 'tab') {
    sideButton.click();
    await waitMs(30);
  }

  const limitInputs = await waitForOrderInputs(adapter, orderRoot);
  if (!limitInputs) {
    setExecutionStatus('failed', 'input-missing');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'input-missing', adapter: adapter.id });
    return;
  }
  const { priceInput, amountInput } = limitInputs;

  const submitBeforeCandidate =
    adapter.orderUi.side.mode === 'submit'
      ? sideButton
      : (findTargetElement(adapter.orderUi.submit, orderRoot) as HTMLButtonElement | null) ?? findFallbackSubmitButton(orderRoot);
  const submitBefore = readSubmitState(submitBeforeCandidate);

  const formattedClickedPrice = formatPriceForInput(payload.clickedPrice, priceInput.value);
  const slotVolumeText = String(payload.slotVolume);

  injectPagePriceBridge();
  const bridgeFill = await requestFormFillFromPageBridge(formattedClickedPrice, slotVolumeText);
  if (!bridgeFill || !bridgeFill.priceSet || !bridgeFill.amountSet) {
    setInputValue(priceInput, formattedClickedPrice);
    setInputValue(amountInput, slotVolumeText);
  }
  await waitMs(50);

  const placeOrderButton =
    adapter.orderUi.side.mode === 'submit'
      ? sideButton
      : (findTargetElement(adapter.orderUi.submit, orderRoot) as HTMLButtonElement | null) ?? findFallbackSubmitButton(orderRoot);

  const submitAfter = readSubmitState(placeOrderButton);
  if (!placeOrderButton || !submitAfter) {
    setExecutionStatus('failed', 'submit-button-missing-after-fill');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, { reason: 'submit-button-missing-after-fill', adapter: adapter.id });
    return;
  }

  const submitReady = !submitAfter.disabled && normalizeText(submitAfter.text) !== 'enter amount';
  if (!submitReady) {
    setExecutionStatus('failed', 'submit-not-ready');
    console.warn(`${LOG_PREFIX} ui-order-submit failed`, {
      reason: 'submit-not-ready',
      adapter: adapter.id,
      before: submitBefore,
      after: submitAfter
    });
    return;
  }

  if (isPaperModeEnabled()) {
    setExecutionStatus('success', 'paper-mode-skip-click');
    console.log(`${LOG_PREFIX} ui-order-submit paper-mode-skip-click`, {
      adapter: adapter.id,
      side: payload.side,
      price: payload.clickedPrice,
      amount: payload.slotVolume,
      clickedButton: (placeOrderButton.textContent ?? '').trim()
    });
    return;
  }

  await waitMs(100);
  placeOrderButton.click();
  setExecutionStatus('success', 'order-clicked');
  console.log(`${LOG_PREFIX} ui-order-submit order-clicked`, {
    adapter: adapter.id,
    side: payload.side,
    price: payload.clickedPrice,
    amount: payload.slotVolume,
    clickedButton: (placeOrderButton.textContent ?? '').trim(),
    submitBefore,
    submitAfter
  });
}
