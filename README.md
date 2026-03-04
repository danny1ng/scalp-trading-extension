# One-Click Scalping Chrome Extension for Fast Crypto Order Placement

One-Click Chart Scalper is a **scalping Chrome extension** for traders who want **fast order placement** directly from a chart, with no extra desktop terminal or additional software stack.

The core workflow is simple: hold `Alt`, click a chart price level, and the extension drives a **one-click limit order** flow in the exchange UI. It is built for manual scalpers who want faster execution from the browser while keeping control over side, size, and price logic.

## What This Extension Does
- Resolves clicked chart price.
- Reads current market reference price.
- Determines intended side (`buy` / `sell`) from click position.
- Uses per-ticker volume slots for rapid sizing.
- Fills and submits the exchange Limit order form through existing UI controls.

## Why Traders Use It
- Faster than manual form typing for scalping entries.
- Browser-based workflow with no external trading bot software.
- Repeatable click-to-order logic.
- Per-ticker and per-exchange volume presets for consistent risk sizing.

## Supported Platforms
- Lighter (`app.lighter.xyz`, `lighter.exchange`)
- Binance USDT-M Futures

Important Binance note:
- Binance is currently supported when using the **TradingView chart mode**.
- Binance **Original** chart mode is not supported yet.

## How Side Is Calculated
- If `clickedPrice < currentPrice` -> `buy`
- If `clickedPrice >= currentPrice` -> `sell`

## Fast Sizing with Slot Presets
The extension supports 5 size slots per ticker.

Examples:
- `Lighter + BTC` can have one slot profile.
- `Binance + BTCUSDT` can have a different slot profile.

This prevents size presets from leaking across exchanges and keeps scalping setup clean.

## Paper Mode (Safe Dry-Run)
Use paper mode to validate end-to-end order flow without final submit click.

Enable in DevTools:
```js
document.documentElement.setAttribute('data-lac-paper-mode', '1');
```

Disable:
```js
document.documentElement.removeAttribute('data-lac-paper-mode');
```

## Installation
### Option A: GitHub Release (recommended)
1. Open the latest GitHub Release.
2. Download `scalp-alt-click-vX.Y.Z.zip`.
3. Unzip locally.
4. Open `chrome://extensions`.
5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the unzipped folder.

### Option B: Build locally
```bash
pnpm install
pnpm build
```
Then:
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist` folder.

## Quick Start
1. Open a supported trading page.
2. Configure volume slots in popup.
3. Select active slot (`Alt+1..Alt+5` on page).
4. Hold `Alt` and left-click on chart.
5. Extension executes limit order UI flow.

## Who This Is For
- Crypto scalpers executing frequent manual entries.
- Intraday traders using chart-based limit placement.
- Traders who want a **one-click trading extension** without API-key automation.

## SEO Keywords / Search Intent Coverage
This project is relevant for queries like:
- crypto scalping chrome extension
- one-click order placement extension
- fast Binance Futures order entry
- browser-based scalping tool
- TradingView chart click to limit order
- scalp trading without extra software

## FAQ
### Does it work without API keys?
Yes. This extension does not place orders through direct exchange APIs. It interacts with exchange UI controls in your browser session.

### Can I scalp faster without extra desktop software?
Yes. The goal is faster browser-native order entry for manual scalping.

### Does it support Binance Futures?
Yes, for Binance USDT-M Futures. Current limitation: use TradingView chart mode.

### Does it support paper/safe testing?
Yes. Use paper mode (`data-lac-paper-mode="1"`) to run flow without final submit click.

### Is this a trading bot?
No. It is a click-to-order assistant for manual execution.

## Troubleshooting
- Nothing happens on Alt+click:
  - Confirm URL is supported.
  - Reload extension in `chrome://extensions`.
  - Refresh trading page.
- Unexpected behavior on Binance:
  - Ensure chart mode is TradingView.
- Need diagnostics:
  - Check DevTools logs prefixed with `[scalp-alt-click]`.

## Safety Notice
- Not financial advice.
- Test thoroughly in safe conditions before real trading.
- Read [DISCLAIMER.md](./DISCLAIMER.md).

## Privacy
- Slot presets are stored locally in `chrome.storage.local`.
- No direct external trading API call is made by the extension itself in this MVP.

## Project Docs
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
- Contributing: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security: [SECURITY.md](./SECURITY.md)
- License: [LICENSE](./LICENSE)
- Code of Conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

## Donations
If this extension improves your workflow, you can support development:

- EVM (ETH/USDT/USDC): `0x17CF3cD50CAe755C8c80765cFa238077A466dba8`
- BTC: `bc1pzuneekuvzcqd9zjew890lx0776m770vsx0krzer2mqqm4vua37nqmupr6n`
- SOL: `34UwmraTBwwUD1bh866sFyHuVobmaCZZV9crZp3caE6c`

Donations are optional and do not imply guaranteed support or delivery timelines.
