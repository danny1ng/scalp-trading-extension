# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-03-05
### Added
- Binance USDT-M Futures support (TradingView chart mode).
- Runtime paper mode via `data-lac-paper-mode` to dry-run order flow without final submit click.
- Exchange-scoped ticker slot storage so slot presets are isolated per exchange.

### Changed
- README was rewritten for clearer product positioning and SEO-focused discoverability.
- Expanded roadmap in README with upcoming exchange support targets.

### Fixed
- Stabilized Binance runtime binding and click flow in multi-frame chart environments.
- Improved locale resilience in number and UI text handling during order flow.

## [0.1.1] - 2026-02-27
### Fixed
- Content script bundle compatibility for Chrome extension injection (removed module import issue in `content.js`).
- Per-ticker slot refresh now updates immediately on `/trade/<TICKER>` URL change without page reload.

## [0.1.0] - 2026-02-27
### Added
- Alt + left click chart workflow that resolves clicked price and determines side (`buy`/`sell`).
- Per-ticker volume slots (5 slots), active slot selection, and `Alt+1..Alt+5` slot hotkeys.
- Floating in-page HUD label with selected slot/volume and per-domain corner/visibility settings.
- Safe mode (default ON), which prepares order flow without final submit click.
- UI order-flow automation via exchange controls (`Limit`, side tab, price/amount fields, place-order button).
- Support for Lighter domains:
  - `https://app.lighter.xyz/trade/*`
  - `https://lighter.exchange/trade/*`
- Popup UI with supported-site detection, autosave behavior, and safe mode toggle.
- Open-source baseline docs (`CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, `DISCLAIMER`, `LICENSE`).
- GitHub Actions CI workflow and release workflow that uploads ready-to-install build archives.
