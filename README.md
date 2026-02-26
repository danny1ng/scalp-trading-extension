# Lighter Alt+Click Extension (MVP)

## What it does
- Runs on `https://app.lighter.xyz/trade/*`
- On `Alt + Left Click` on chart area, calculates clicked price from visible right price axis labels
- Tries to detect current price and resolves side:
  - `clickedPrice < currentPrice => buy`
  - otherwise `sell`
- Logs payload to console (API call placeholder)
- Popup stores 5 volume slots per ticker in `chrome.storage.local`

## Install
```bash
pnpm install
pnpm build
```

Then load extension in Chrome:
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Load unpacked extension from `dist`

## Usage
1. Open `app.lighter.xyz/trade/ARC`
2. Open extension popup and set slot volumes for `ARC`
3. Select active slot via radio button
4. On chart, press `Alt` and left-click
5. Check DevTools console for `[lighter-alt-click] draft-limit-order`

## Notes
- Current implementation is a DOM heuristic for price extraction.
- Next step is replacing `submitLimitOrderDraft` with real API integration.
