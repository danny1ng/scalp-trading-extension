# One-Click Chart Scalper (MVP)

## What this product is
One-Click Chart Scalper is a Chrome extension for fast chart-based scalping workflow.

You hold `Alt` and left-click on the chart, and the extension calculates:
- clicked price
- current mark price
- intended side (`buy` or `sell`)
- selected volume slot for the ticker

Then it produces a structured order draft.

The popup is optimized for quick scalping setup:
- bold fintech visual style
- compact 5-slot volume editor
- active-site status indicator

## Important MVP status
This version **does not place real orders yet**.  
It only logs the order draft to DevTools Console so you can validate behavior before API execution is enabled.

## Supported exchanges/pages
- `https://app.lighter.xyz/trade/*`
- `https://lighter.exchange/trade/*`

## Icon behavior
- Gray icon: current tab is not a supported `/trade/*` page.
- Green icon: current tab is a supported `/trade/*` page.

## Why use it
- Faster manual scalping workflow
- Consistent click-to-side logic
- Per-ticker volume presets (5 slots)
- Foundation for future one-click order execution

## How side is decided
- If `clickedPrice < currentPrice` -> `buy`
- If `clickedPrice >= currentPrice` -> `sell`

## Install (for end users)
1. Build the extension:
```bash
pnpm install
pnpm build
```
2. Open `chrome://extensions`
3. Turn on **Developer mode**
4. Click **Load unpacked**
5. Select the `dist` folder from this project

## How to use
1. Open a supported trade page, for example:
   - `https://app.lighter.xyz/trade/BTC`
2. Open the extension popup and set your volume slots for the ticker.
3. Pick the active slot.
4. Hold `Alt` and left-click in the chart area.
5. Open DevTools Console and find:
   - `[lighter-alt-click] draft-limit-order`

## What you will see in the log
The payload includes:
- `ticker`
- `clickedPrice`
- `currentPrice`
- `side` and `action`
- `slotVolume` / `activeSlotIndex`
- `timestamp`

## Troubleshooting
- Nothing happens on click:
  - Make sure you are on a supported `/trade/*` URL.
  - Reload the extension in `chrome://extensions`.
  - Refresh the trade page.
- Icon does not change color:
  - Switch tabs once or refresh the current tab.
  - Ensure the URL is exactly a supported `/trade/*` route.
- Wrong or missing output:
  - Ensure chart is fully loaded before clicking.
  - Check console for warnings with `[lighter-alt-click]`.

## Privacy
- Data is stored locally in `chrome.storage.local` for slot presets.
- No remote order API call is made in this MVP.
