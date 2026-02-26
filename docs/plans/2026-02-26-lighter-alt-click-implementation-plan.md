# Lighter Alt+Click Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome MV3 extension for `app.lighter.xyz` that logs correctly computed click price on `Alt+LeftClick` and stores 5 volume slots per ticker.

**Architecture:** Use a Vite + React setup for popup UI and a dedicated content-script entry for chart interaction. Keep core behavior in pure utility modules to enable strict TDD.

**Tech Stack:** TypeScript, React, Vite, Vitest, Chrome Extension MV3, pnpm.

---

### Task 1: Scaffold project files

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `public/manifest.json`

**Step 1: Write the failing test**
- N/A for scaffold.

**Step 2: Run test to verify it fails**
- N/A.

**Step 3: Write minimal implementation**
- Create base config files and scripts.

**Step 4: Run verification**
- Run: `pnpm test` (expected: runs once tests exist).

**Step 5: Commit**
- `git add ... && git commit -m "chore: scaffold extension project"`

### Task 2: Add failing tests for core logic

**Files:**
- Create: `src/lib/price-axis.test.ts`, `src/lib/side.test.ts`, `src/lib/ticker.test.ts`, `src/lib/slots-storage.test.ts`

**Step 1: Write the failing test**
- Add tests for interpolation, side logic, ticker extraction, slot normalization.

**Step 2: Run test to verify it fails**
- Run: `pnpm test -- run src/lib/*.test.ts`
- Expected: FAIL due to missing implementation.

**Step 3: Write minimal implementation**
- N/A in this task.

**Step 4: Run test to verify it still fails properly**
- Confirm failures are missing symbol/module failures.

**Step 5: Commit**
- `git add ... && git commit -m "test: add failing tests for alt-click core logic"`

### Task 3: Implement core logic to pass tests

**Files:**
- Create: `src/lib/price-axis.ts`, `src/lib/side.ts`, `src/lib/ticker.ts`, `src/lib/slots-storage.ts`

**Step 1: Write the failing test**
- Already done in Task 2.

**Step 2: Run test to verify it fails**
- Re-run targeted tests.

**Step 3: Write minimal implementation**
- Implement smallest logic to satisfy tests.

**Step 4: Run test to verify it passes**
- Run: `pnpm test -- run src/lib/*.test.ts`
- Expected: PASS.

**Step 5: Commit**
- `git add ... && git commit -m "feat: implement core alt-click calculation utilities"`

### Task 4: Implement content script + popup UI

**Files:**
- Create: `src/content/index.ts`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/env.d.ts`

**Step 1: Write the failing test**
- Optional integration tests skipped for MVP.

**Step 2: Run test to verify it fails**
- N/A.

**Step 3: Write minimal implementation**
- Wire click listener, storage reads, and console payload.
- Build popup with ticker and five slots.

**Step 4: Run verification**
- Run: `pnpm test -- run`
- Run: `pnpm build`

**Step 5: Commit**
- `git add ... && git commit -m "feat: add alt-click content script and slot popup"`

### Task 5: Validate and document usage

**Files:**
- Create: `README.md`

**Step 1: Write the failing test**
- N/A.

**Step 2: Run verification**
- Ensure build artifacts include `manifest.json` and `assets/content.js`.

**Step 3: Write minimal implementation**
- Add setup/use instructions.

**Step 4: Run final checks**
- Run: `pnpm test -- run`
- Run: `pnpm build`

**Step 5: Commit**
- `git add ... && git commit -m "docs: add setup and usage for lighter extension mvp"`
