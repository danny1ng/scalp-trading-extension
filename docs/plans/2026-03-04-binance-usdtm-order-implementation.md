# Binance USDT-M Futures Order Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Binance USDT-M Futures support via the adapter architecture so Alt+Click can submit Limit orders through Binance UI controls with locale-resilient URL matching.

**Architecture:** Introduce a dedicated Binance adapter and extend adapter contract with order UI selectors/hints, then make the existing order-flow module consume adapter configuration instead of hardcoded Lighter selectors. Keep content orchestration unchanged and ensure supported-url/icon logic recognizes Binance futures routes.

**Tech Stack:** TypeScript, Vite, Vitest, Chrome Extension MV3 content scripts.

---

### Task 1: Extend Adapter Contract for Order UI Metadata

**Files:**
- Modify: `src/core/exchange-adapter.ts`
- Modify: `src/exchanges/lighter/adapter.ts`
- Test: `src/exchanges/lighter/adapter.test.ts`

**Step 1: Write failing test for adapter contract usage**

```ts
// in src/exchanges/lighter/adapter.test.ts
import { lighterAdapter } from './adapter';

test('exposes orderUi selectors', () => {
  expect(lighterAdapter.orderUi).toBeTruthy();
  expect(lighterAdapter.orderUi.limitType).toBeTruthy();
  expect(lighterAdapter.orderUi.side).toBeTruthy();
  expect(lighterAdapter.orderUi.fields).toBeTruthy();
  expect(lighterAdapter.orderUi.submit).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/exchanges/lighter/adapter.test.ts`
Expected: FAIL due to missing `orderUi` on adapter type/object.

**Step 3: Add minimal adapter type + lighter implementation**

```ts
// in src/core/exchange-adapter.ts
export type OrderUiDescriptor = {
  limitType: { testIds?: string[]; texts?: string[] };
  side: {
    buy: { testIds?: string[]; texts?: string[] };
    sell: { testIds?: string[]; texts?: string[] };
  };
  fields: {
    price: { testIds?: string[]; labels?: string[] };
    amount: { testIds?: string[]; labels?: string[] };
  };
  submit: { testIds?: string[]; texts?: string[]; ignoreTexts?: string[] };
};

export type ExchangeAdapter = {
  // existing fields...
  orderUi: OrderUiDescriptor;
};
```

```ts
// in src/exchanges/lighter/adapter.ts
orderUi: {
  limitType: { testIds: ['select-order-type-limit'], texts: ['Limit'] },
  side: {
    buy: { testIds: ['order-buy-button'], texts: ['Buy / Long'] },
    sell: { testIds: ['order-sell-button'], texts: ['Sell / Short'] }
  },
  fields: {
    price: { testIds: ['limit-order-limit-input'], labels: ['Limit Price'] },
    amount: { labels: ['Amount'] }
  },
  submit: {
    testIds: ['place-order-button'],
    texts: ['Place Order'],
    ignoreTexts: ['Buy / Long', 'Sell / Short', 'Market', 'Limit', 'Enter Amount']
  }
}
```

**Step 4: Run tests to verify pass**

Run: `pnpm vitest src/exchanges/lighter/adapter.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/exchange-adapter.ts src/exchanges/lighter/adapter.ts src/exchanges/lighter/adapter.test.ts
git commit -m "refactor: extend exchange adapter with order ui descriptors"
```

### Task 2: Add Binance Adapter and Register It

**Files:**
- Create: `src/exchanges/binance/adapter.ts`
- Create: `src/exchanges/binance/adapter.test.ts`
- Modify: `src/core/adapter-registry.ts`
- Modify: `src/core/adapter-registry.test.ts`

**Step 1: Write failing tests for Binance matching and registry resolution**

```ts
// src/exchanges/binance/adapter.test.ts
import { binanceAdapter } from './adapter';

test('matches binance futures url with locale prefix', () => {
  expect(binanceAdapter.matches('https://www.binance.com/en/futures/BTCUSDT')).toBe(true);
});

test('matches binance futures url without locale prefix', () => {
  expect(binanceAdapter.matches('https://www.binance.com/futures/ETHUSDT')).toBe(true);
});

test('rejects non-futures urls', () => {
  expect(binanceAdapter.matches('https://www.binance.com/en/trade/BTC_USDT')).toBe(false);
});
```

```ts
// src/core/adapter-registry.test.ts
expect(resolveAdapterForUrl('https://www.binance.com/en/futures/BTCUSDT')?.id).toBe('binance');
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest src/exchanges/binance/adapter.test.ts src/core/adapter-registry.test.ts`
Expected: FAIL due to missing module/registration.

**Step 3: Implement minimal Binance adapter and register**

```ts
// src/exchanges/binance/adapter.ts
export const binanceAdapter: ExchangeAdapter = {
  id: 'binance',
  matches: (url) => {/* locale-resilient futures matcher */},
  getTicker: (url) => {/* parse symbol segment */},
  getCurrentPrice: () => null,
  isClickInsideChartArea: (event, doc = document) => {/* chart bounds check */},
  getChartCanvas: (doc = document) => doc.querySelector('canvas'),
  resolveClickedPrice: async (event, deps) => {
    const canvas = /* resolve chart canvas */;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const localY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    return await deps.requestPriceFromPageBridge(localY);
  },
  orderUi: {
    // binance-specific selectors with text fallbacks
  }
};
```

```ts
// src/core/adapter-registry.ts
import { binanceAdapter } from '../exchanges/binance/adapter';
const adapters: ExchangeAdapter[] = [lighterAdapter, binanceAdapter];
```

**Step 4: Run tests to verify pass**

Run: `pnpm vitest src/exchanges/binance/adapter.test.ts src/core/adapter-registry.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/exchanges/binance/adapter.ts src/exchanges/binance/adapter.test.ts src/core/adapter-registry.ts src/core/adapter-registry.test.ts
git commit -m "feat: add binance futures exchange adapter"
```

### Task 3: Make Supported URL Detection Include Binance Futures

**Files:**
- Modify: `src/core/supported-url.ts`
- Modify: `src/core/supported-url.test.ts`

**Step 1: Write failing supported-url tests for Binance**

```ts
test('matches binance futures path with locale', () => {
  expect(isSupportedTradeUrl('https://www.binance.com/ru/futures/BTCUSDT')).toBe(true);
});

test('matches binance futures path without locale', () => {
  expect(isSupportedTradeUrl('https://www.binance.com/futures/BNBUSDT')).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/core/supported-url.test.ts`
Expected: FAIL for new Binance cases.

**Step 3: Implement URL matcher extension**

```ts
// src/core/supported-url.ts
// keep lighter matcher + add binance futures matcher with optional locale segment
```

**Step 4: Run tests to verify pass**

Run: `pnpm vitest src/core/supported-url.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/supported-url.ts src/core/supported-url.test.ts
git commit -m "feat: treat binance futures pages as supported urls"
```

### Task 4: Refactor Order Flow to Use Adapter Order UI Descriptors

**Files:**
- Modify: `src/content/modules/order-flow.ts`
- Modify: `src/content/index.ts`
- Test: `src/content/modules/order-flow.test.ts` (create if missing)

**Step 1: Write failing order-flow tests for adapter-driven selectors**

```ts
// create/extend order-flow tests
// scenario: provided adapter descriptor points to controls in mock DOM
// expect executeUiOrderFlow to click limit/side/submit and set success status
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest src/content/modules/order-flow.test.ts`
Expected: FAIL due to missing adapter parameterization.

**Step 3: Implement minimal refactor**

```ts
// executeUiOrderFlow(payload, adapter)
// use adapter.orderUi.* for:
// - resolving limit button
// - resolving side button
// - resolving price/amount inputs
// - resolving submit button
```

```ts
// in content/index.ts
void executeUiOrderFlow(draftPayload, activeAdapter)
```

**Step 4: Run tests to verify pass**

Run: `pnpm vitest src/content/modules/order-flow.test.ts src/exchanges/lighter/adapter.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/content/modules/order-flow.ts src/content/index.ts src/content/modules/order-flow.test.ts
git commit -m "refactor: drive ui order flow from adapter order descriptors"
```

### Task 5: Add Binance Permission/Injection Scope and README Update

**Files:**
- Modify: `public/manifest.json`
- Modify: `README.md`

**Step 1: Write/adjust tests if manifest/supported host checks exist**

```ts
// if manifest host tests exist, add binance hosts/matches assertions
```

**Step 2: Run related tests (or skip with note if none exist)**

Run: `pnpm vitest src/core/supported-url.test.ts`
Expected: PASS.

**Step 3: Implement manifest and docs updates**

```json
// manifest additions
"host_permissions": [
  "https://app.lighter.xyz/*",
  "https://lighter.exchange/*",
  "https://www.binance.com/*",
  "https://binance.com/*"
]
```

```json
// content_scripts matches add locale-resilient futures routes as explicit patterns
```

```md
# README supported exchanges
- Lighter
- Binance (USDT-M Futures)
```

**Step 4: Run build to verify extension bundles**

Run: `pnpm build`
Expected: build succeeds.

**Step 5: Commit**

```bash
git add public/manifest.json README.md
git commit -m "chore: add binance futures host permissions and docs"
```

### Task 6: Final Verification

**Files:**
- Verify modified/created files from Tasks 1-5

**Step 1: Run targeted full test set**

Run: `pnpm vitest src/core/adapter-registry.test.ts src/core/supported-url.test.ts src/exchanges/lighter/adapter.test.ts src/exchanges/binance/adapter.test.ts src/content/modules/order-flow.test.ts`
Expected: PASS.

**Step 2: Run full project test command**

Run: `pnpm test`
Expected: PASS.

**Step 3: Run production build**

Run: `pnpm build`
Expected: PASS.

**Step 4: Inspect git status**

Run: `git status --short --branch`
Expected: only intended changes remain.

**Step 5: Commit verification artifacts (if needed) and summarize**

```bash
# Usually no extra files expected
```

