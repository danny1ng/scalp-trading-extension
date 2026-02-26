# Lighter Alt+Click MVP Design

## Goal
Build a Chrome MV3 extension for `https://app.lighter.xyz/trade/*` that calculates the clicked chart price on `Alt + Left Click` and prints a structured console log. Add a popup to store 5 per-ticker volume slots in `chrome.storage.local`.

## Scope (MVP)
- Content script listens for `Alt + Left Mouse`.
- Computes `clickedPrice` from visible right-side price-axis labels with linear interpolation.
- Extracts ticker from URL `/trade/:ticker`.
- Attempts to get current price (`currentPrice`) from DOM.
- Computes side: `clickedPrice < currentPrice => buy`, otherwise `sell`.
- Logs payload to `console.log` for future API integration.
- React popup: ticker + 5 volume slots, read/write via `chrome.storage.local`.

## Architecture
- `src/content/index.ts`: event handlers and orchestration.
- `src/lib/price-axis.ts`: price-label parsing and interpolation.
- `src/lib/ticker.ts`: ticker extraction from URL.
- `src/lib/side.ts`: buy/sell rule.
- `src/lib/slots-storage.ts`: slot read/write.
- `src/App.tsx`: UI popup.

## Error Handling
- No valid price labels: log warning and stop processing.
- No currentPrice: set `side='unknown'`, still log `clickedPrice`.
- Empty/invalid slots: store as `null`.

## Testing
- Unit tests for:
  - price interpolation between two labels,
  - numeric parsing,
  - buy/sell side selection,
  - ticker extraction from URL,
  - slot normalization.

## Future API Hook
- Stub `submitLimitOrderDraft(payload)` in content script.
