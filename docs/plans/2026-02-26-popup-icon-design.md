# Popup Redesign and Dynamic Icon State Design

## Goal
Create a bold fintech popup UI with shadcn-style React components and add dynamic gray/color extension icon behavior based on supported trade URL detection.

## Decisions
- Visual direction: bold fintech.
- Icon style: flat geometric mark.
- Colors:
  - inactive icon: `#6B7280`
  - active icon: `#84CC16`
- Active icon condition: only for supported `/trade/*` pages.

## Scope
- Redesign popup UI for end users.
- Keep slot/ticker behavior and storage compatibility.
- Add background service worker to switch extension icon by active tab URL.
- Support active icon on:
  - `https://app.lighter.xyz/trade/*`
  - `https://lighter.exchange/trade/*`

## Architecture
- `src/components/ui/*`: shadcn-style reusable React primitives.
- `src/App.tsx`: composed popup view with status + slot controls.
- `src/core/supported-url.ts`: single source of truth for supported URL matching.
- `src/background/index.ts`: dynamic icon switching logic.

## UX Notes
- Popup should clearly show whether current tab is supported.
- Inputs should remain compact and trader-friendly.
- Keep interaction minimal: edit slot -> save.

## Non-Goals
- No order API execution yet.
- No additional exchange adapters beyond current lighter URLs.
