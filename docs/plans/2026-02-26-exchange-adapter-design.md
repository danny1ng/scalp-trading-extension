# Exchange Adapter Layer Design

## Goal
Refactor the extension to be exchange-agnostic at runtime by introducing an adapter architecture with auto-detection by URL, while keeping current behavior intact for Lighter.

## Scope
- Introduce a generic `ExchangeAdapter` contract.
- Add an adapter registry with URL-based auto-detection.
- Move current Lighter-specific logic from content orchestration into a dedicated Lighter adapter.
- Support both domains with one adapter:
  - `https://app.lighter.xyz/trade/*`
  - `https://lighter.exchange/trade/*`
- Keep user-facing behavior unchanged:
  - `Alt + Left Click` on chart logs one structured payload
  - Correct `side`/`action` from clicked vs current price

## Runtime Architecture
- `src/content/index.ts` becomes orchestration-only:
  - detect adapter
  - bind click flow
  - compute side/action
  - emit one payload log
- `src/core/exchange-adapter.ts` defines the adapter interface.
- `src/core/adapter-registry.ts` resolves adapter by URL.
- `src/exchanges/lighter/adapter.ts` implements Lighter logic for both supported domains.

## Matching Rules
- `LighterAdapter.matches(url)` returns true only for:
  - host in `{app.lighter.xyz, lighter.exchange}`
  - path starting with `/trade/`
- Unsupported URLs must fail gracefully (no crashes, no event handling).

## Manifest Rules
- `host_permissions` includes both domains.
- `content_scripts.matches` includes both trade patterns.
- Existing frame behavior remains (`all_frames`, bridge behavior).

## Testing Strategy
- Add unit tests for adapter matching:
  - positive for both domains/trade paths
  - negative for non-trade paths and unrelated domains
- Add unit tests for adapter registry resolution:
  - resolves Lighter adapter for both domains
  - returns `null` for unsupported URLs
- Keep existing side/ticker/price tests and adapt imports only as needed.

## Non-Goals
- No API order submission integration yet.
- No popup-based manual exchange selection in this phase.
- No support for additional non-Lighter exchanges in this phase.
