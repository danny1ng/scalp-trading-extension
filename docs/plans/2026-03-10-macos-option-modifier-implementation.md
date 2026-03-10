# macOS Option Modifier Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add macOS support so order placement and slot hotkeys trigger with Option, while preserving existing Alt behavior on Windows/Linux.

**Architecture:** Introduce a single shared modifier helper in content layer and route both click-to-place and slot-hotkey handlers through it. Keep behavior identical for non-macOS platforms and centralize key semantics to avoid drift between modules.

**Tech Stack:** TypeScript, Vitest, content-script modules

---

### Task 1: Shared Modifier Helper

**Files:**
- Create: `src/content/modules/modifier-key.ts`
- Test: `src/content/modules/modifier-key.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';
import { isOrderModifierPressed } from './modifier-key';

describe('isOrderModifierPressed', () => {
  test('returns true when altKey is pressed', () => {
    expect(isOrderModifierPressed({ altKey: true, metaKey: false, ctrlKey: false, shiftKey: false })).toBe(true);
  });

  test('returns false when altKey is not pressed', () => {
    expect(isOrderModifierPressed({ altKey: false, metaKey: false, ctrlKey: false, shiftKey: false })).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/content/modules/modifier-key.test.ts`
Expected: FAIL with module/function missing.

**Step 3: Write minimal implementation**

```ts
export function isOrderModifierPressed(event: Pick<MouseEvent | KeyboardEvent, 'altKey'>): boolean {
  return Boolean(event.altKey);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/content/modules/modifier-key.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/content/modules/modifier-key.ts src/content/modules/modifier-key.test.ts
git commit -m "feat: add shared modifier helper for alt/option"
```

### Task 2: Use Helper in Click Order Flow

**Files:**
- Modify: `src/content/index.ts`
- Test: `src/content/content-bundle-compat.test.ts`

**Step 1: Write the failing test**

Add/adjust test to assert order flow gate uses shared helper semantics and accepts modifier-on-click only.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/content/content-bundle-compat.test.ts`
Expected: FAIL due to old `event.altKey` check.

**Step 3: Write minimal implementation**

Replace direct `event.altKey` condition with helper call.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/content/content-bundle-compat.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/content/index.ts src/content/content-bundle-compat.test.ts
git commit -m "feat: use shared modifier for chart click order flow"
```

### Task 3: Use Helper in Slot Hotkeys

**Files:**
- Modify: `src/content/modules/hud-slots.ts`
- Test: `src/content/modules/hud-slots.test.ts`

**Step 1: Write the failing test**

Add/adjust test to ensure slot selection responds when shared modifier is active and ignores bare digits.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/content/modules/hud-slots.test.ts`
Expected: FAIL because handler still hardcodes `event.altKey`.

**Step 3: Write minimal implementation**

Replace direct `event.altKey` check with helper call.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/content/modules/hud-slots.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/content/modules/hud-slots.ts src/content/modules/hud-slots.test.ts
git commit -m "feat: use shared modifier for slot hotkeys"
```

### Task 4: Regression Verification

**Files:**
- Modify: none
- Test: existing suite

**Step 1: Run targeted tests**

Run: `pnpm vitest run src/content/modules/modifier-key.test.ts src/content/modules/hud-slots.test.ts src/content/modules/order-flow.test.ts src/content/content-bundle-compat.test.ts`
Expected: PASS.

**Step 2: Run full test suite**

Run: `pnpm test`
Expected: PASS with no new warnings/errors.

**Step 3: Commit verification-ready state**

```bash
git add -A
git commit -m "test: verify modifier key behavior across content flows"
```
