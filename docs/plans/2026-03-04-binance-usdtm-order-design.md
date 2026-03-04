# Binance USDT-M Futures Order Support Design

## Goal
Add Binance USDT-M Futures support to the existing exchange-adapter architecture so Alt+Click can draft and submit a UI-based Limit order flow on Binance, with selector logic resilient to locale-specific URLs.

## Scope
- In scope:
  - Binance Futures URL detection and adapter resolution.
  - Binance adapter implementation for ticker/chart/price resolution hooks.
  - Exchange-agnostic UI order execution using adapter-provided UI config.
  - Supported URL/icon state updates for Binance Futures pages.
  - Tests for adapter matching, registry resolution, supported URL checks, and order flow behavior.
- Out of scope:
  - Direct Binance API integration (API keys/secrets).
  - Market/Stop order modes.
  - Non-USDT-M Binance products.

## Architecture
- Keep `src/content/index.ts` as orchestration entrypoint.
- Add `binanceAdapter` under `src/exchanges/binance/` and register it in adapter registry.
- Extend `ExchangeAdapter` with exchange-specific order UI hints/config so `executeUiOrderFlow` no longer hardcodes Lighter-only selectors.
- Refactor `src/content/modules/order-flow.ts` to consume the active adapter and run a shared sequence:
  1. select Limit tab,
  2. select side tab,
  3. resolve/fill price + amount inputs,
  4. verify submit readiness,
  5. click submit button.

## Binance URL & Locale Strategy
- Support Binance host variants used by web futures pages.
- Match optional locale prefix in URL path (for example `/en`, `/ru`, and no prefix).
- Require futures trade route semantics to avoid false positives on non-trading pages.

## Error Handling
- Preserve current status markers and failure reason taxonomy (`data-lac-last-exec-*`).
- Emit logs including `adapter.id` for exchange-specific troubleshooting.
- Prefer structural selectors and stable attributes over visible text.
- Use text-based matching only as fallback and keep it normalization-based.
- If required controls are missing/disabled, abort safely and mark failed (no blind clicks).

## Testing Strategy
- Unit tests for Binance adapter:
  - URL matching across locale variants.
  - Ticker extraction from futures trade URLs.
  - Chart-related helpers fallbacks.
- Unit tests for adapter registry:
  - Binance URL resolves to `binance` adapter.
  - Lighter behavior remains intact.
- Unit tests for supported-url module:
  - Binance futures pages are recognized as supported.
- Unit tests for order flow:
  - Adapter-driven control discovery and submit behavior for Binance-like DOM.
  - Failure paths for missing controls/disabled submit.
- Verification commands:
  - `pnpm vitest <targeted tests>`
  - `pnpm build`

## Rollout Notes
- This is still browser-UI-driven order placement in the user session.
- README supported exchanges section should include Binance once implementation lands.
