# Exchange Adapter Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce an exchange adapter architecture with URL auto-detection and migrate current Lighter logic into a dedicated adapter supporting both `app.lighter.xyz` and `lighter.exchange` trade pages.

**Architecture:** Split exchange-specific logic from content orchestration by adding a typed adapter contract and a registry resolver. Keep `src/content/index.ts` as exchange-agnostic runtime flow and route all exchange operations through the selected adapter. Implement one `LighterAdapter` that supports both Lighter domains and preserve existing click-to-log behavior.

**Tech Stack:** TypeScript, Vite (MV3 extension build), Vitest, Chrome Extension APIs

---

### Task 1: Add adapter contract and registry with URL matching tests

**Files:**
- Create: `src/core/exchange-adapter.ts`
- Create: `src/core/adapter-registry.ts`
- Create: `src/core/adapter-registry.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';
import { resolveAdapterForUrl } from './adapter-registry';

describe('resolveAdapterForUrl', () => {
  test('resolves lighter adapter for app.lighter.xyz trade url', () => {
    expect(resolveAdapterForUrl('https://app.lighter.xyz/trade/BTC')?.id).toBe('lighter');
  });

  test('resolves lighter adapter for lighter.exchange trade url', () => {
    expect(resolveAdapterForUrl('https://lighter.exchange/trade/BTC')?.id).toBe('lighter');
  });

  test('returns null for unsupported url', () => {
    expect(resolveAdapterForUrl('https://example.com/trade/BTC')).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/core/adapter-registry.test.ts`
Expected: FAIL (module/functions not found)

**Step 3: Write minimal implementation**

- Add `ExchangeAdapter` interface in `src/core/exchange-adapter.ts`.
- Add registry + `resolveAdapterForUrl(url)` in `src/core/adapter-registry.ts`.
- Temporarily stub lighter adapter reference with TODO import if needed.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest src/core/adapter-registry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/exchange-adapter.ts src/core/adapter-registry.ts src/core/adapter-registry.test.ts
git commit -m "feat: add exchange adapter contract and resolver"
```

### Task 2: Implement Lighter adapter for both domains

**Files:**
- Create: `src/exchanges/lighter/adapter.ts`
- Create: `src/exchanges/lighter/adapter.test.ts`
- Modify: `src/core/adapter-registry.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';
import { lighterAdapter } from './adapter';

describe('lighterAdapter.matches', () => {
  test('matches app.lighter.xyz trade path', () => {
    expect(lighterAdapter.matches('https://app.lighter.xyz/trade/BTC')).toBe(true);
  });

  test('matches lighter.exchange trade path', () => {
    expect(lighterAdapter.matches('https://lighter.exchange/trade/BTC')).toBe(true);
  });

  test('does not match non-trade path', () => {
    expect(lighterAdapter.matches('https://lighter.exchange/stats')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/exchanges/lighter/adapter.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

- Implement `lighterAdapter` with:
  - `id = 'lighter'`
  - strict URL matching (`/trade/` path + two allowed hosts)
  - methods for ticker/current price/clicked price by moving current Lighter-specific logic from content script.
- Wire adapter into registry list.

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest src/exchanges/lighter/adapter.test.ts src/core/adapter-registry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/exchanges/lighter/adapter.ts src/exchanges/lighter/adapter.test.ts src/core/adapter-registry.ts
git commit -m "feat: add lighter adapter with multi-domain matching"
```

### Task 3: Refactor content script to adapter-driven orchestration

**Files:**
- Modify: `src/content/index.ts`
- Modify: `src/content/page-bridge.ts` (only if bridge hooks need adapter-facing wrappers)

**Step 1: Write failing behavior test (or focused regression test)**

If a direct content-script test is heavy, add a pure helper test for side/action flow:

```ts
import { describe, expect, test } from 'vitest';
import { decideSide } from '../lib/side';

describe('side decisions', () => {
  test('below current => buy', () => {
    expect(decideSide(99, 100)).toBe('buy');
  });

  test('above current => sell', () => {
    expect(decideSide(101, 100)).toBe('sell');
  });
});
```

**Step 2: Run test to verify baseline**

Run: `pnpm vitest src/lib/side.test.ts`
Expected: PASS baseline before refactor

**Step 3: Refactor implementation**

- In `src/content/index.ts`:
  - resolve active adapter via `resolveAdapterForUrl(window.location.href)`
  - if no adapter: exit gracefully
  - replace direct Lighter-specific calls with adapter methods
  - preserve existing payload shape and single-log behavior
- Keep `Alt + Left Click` flow and marker/debug attributes intact.

**Step 4: Run targeted tests + full tests**

Run:
- `pnpm vitest src/lib/side.test.ts src/core/adapter-registry.test.ts src/exchanges/lighter/adapter.test.ts`
- `pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/content/index.ts src/content/page-bridge.ts
git commit -m "refactor: drive content flow through exchange adapters"
```

### Task 4: Update extension manifest and docs for second Lighter domain

**Files:**
- Modify: `public/manifest.json`
- Modify: `README.md`
- Test: `pnpm build`

**Step 1: Write failing check (manual expectation)**

Define expected manifest conditions:
- host permissions include both domains
- content script matches include both trade URL patterns

**Step 2: Apply minimal config/doc updates**

- Add `https://lighter.exchange/*` to `host_permissions`.
- Add `https://lighter.exchange/trade/*` to `content_scripts.matches`.
- Update README supported URLs section.

**Step 3: Verify build and output manifest**

Run:
- `pnpm build`
- `cat dist/manifest.json`
Expected:
- build succeeds
- built manifest includes both domains and trade patterns

**Step 4: Run full verification**

Run: `pnpm test && pnpm build`
Expected: PASS

**Step 5: Commit**

```bash
git add public/manifest.json README.md docs/plans/2026-02-26-exchange-adapter-design.md docs/plans/2026-02-26-exchange-adapter-implementation.md
git commit -m "chore: add lighter.exchange support via adapter architecture"
```
