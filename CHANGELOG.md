# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

