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
- autosave on field blur (no manual save button)
- per-domain chart label visibility and corner position settings

## Important MVP status
This version places orders through the exchange UI flow:
- switches to **Limit** order type
- selects **Buy/Long** or **Sell/Short** side
- fills price and amount inputs
- clicks `data-testid="place-order-button"`

Order placement is real. Use with caution on live accounts.

## Safety notice
- This project is not financial advice.
- The extension can submit real orders through exchange UI controls.
- Always test on demo/sandbox environments first.
- See [DISCLAIMER.md](/root/projects/my/scalp-trading-extention/DISCLAIMER.md) for details.

## Supported exchanges/pages
- `https://app.lighter.xyz/trade/*`
- `https://lighter.exchange/trade/*`

## Icon behavior
- Gray icon: current tab is not a supported `/trade/*` page.
- Teal icon: current tab is a supported `/trade/*` page.

## Why use it
- Faster manual scalping workflow
- Consistent click-to-side logic
- Per-ticker volume presets (5 slots)
- Real one-click order submission flow in the UI

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
3. Slot values auto-save when an input loses focus.
4. Pick the active slot in popup or with `Alt+1..Alt+5` on the trade page.
5. Hold `Alt` and left-click in the chart area.
6. The extension automatically prepares and submits a limit order via UI.
7. Optional: open DevTools Console and check extension logs (`[scalp-alt-click] ...`) for debugging.

On supported pages, a floating in-page label shows `Slot N: Volume`.
You can enable/disable this label and choose its corner per supported domain.

On unsupported pages, popup editors are hidden and a quick instruction is shown to open a supported `/trade/<TICKER>` URL first.

## What you will see in the log
The log payload includes:
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
  - Check console for warnings with `[scalp-alt-click]`.

## Privacy
- Data is stored locally in `chrome.storage.local` for slot presets.
- No direct external trading API call is made by the extension itself in this MVP.
- Orders are submitted by clicking existing exchange UI controls in your browser session.

## Open-source docs
- License: [LICENSE](/root/projects/my/scalp-trading-extention/LICENSE)
- Contributing: [CONTRIBUTING.md](/root/projects/my/scalp-trading-extention/CONTRIBUTING.md)
- Security: [SECURITY.md](/root/projects/my/scalp-trading-extention/SECURITY.md)
- Code of Conduct: [CODE_OF_CONDUCT.md](/root/projects/my/scalp-trading-extention/CODE_OF_CONDUCT.md)
