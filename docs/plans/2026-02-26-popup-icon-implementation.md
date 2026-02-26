# Popup Redesign and Dynamic Icon State Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a bold fintech popup UI and dynamic gray/color icon switching for supported trade URLs.

**Architecture:** Introduce shared URL matcher logic, build shadcn-style popup primitives and compose a redesigned App view, then wire a background service worker that sets icon state by active tab URL.

**Tech Stack:** React, TypeScript, Vite, MV3 service worker, Vitest

---

### Task 1: Shared supported URL matcher + tests

**Files:**
- Create: `src/core/supported-url.ts`
- Create: `src/core/supported-url.test.ts`

**Step 1: Write failing tests** for supported/unsupported URLs.

**Step 2: Run test to verify failure**
Run: `pnpm vitest src/core/supported-url.test.ts`

**Step 3: Implement minimal matcher**
- export `isSupportedTradeUrl(url: string): boolean`
- export `getSupportedHost(url: string): string | null`

**Step 4: Re-run test to verify pass**
Run: `pnpm vitest src/core/supported-url.test.ts`

### Task 2: Popup UI redesign with shadcn-style primitives

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/lib/cn.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Step 1: Implement primitives** (reusable React components).

**Step 2: Redesign `App.tsx`**
- status card (supported site or not)
- ticker field
- 5 slot rows with active selection
- clear save CTA and short hint

**Step 3: Validate behavior unchanged**
Run: `pnpm test`

### Task 3: Dynamic icon state in background worker

**Files:**
- Create: `src/background/index.ts`
- Modify: `vite.config.ts`
- Modify: `public/manifest.json`
- Create: `public/icons/gray/icon.svg`
- Create: `public/icons/color/icon.svg`

**Step 1: Implement service worker**
- listen to `tabs.onUpdated`, `tabs.onActivated`, `windows.onFocusChanged`, `runtime.onStartup`
- set icon color based on `isSupportedTradeUrl(tab.url)`

**Step 2: Wire build + manifest**
- add background entry in vite input
- add `background.service_worker` and icon metadata in manifest

**Step 3: Verify**
Run: `pnpm build`

### Task 4: Final validation and docs update

**Files:**
- Modify: `README.md`

**Step 1: Update README**
- describe new popup look
- describe dynamic icon behavior

**Step 2: Verify tests and build**
Run: `pnpm test && pnpm build`
