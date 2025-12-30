# Scalp Trading Chrome Extension

Fast scalp trading extension for crypto exchanges. Click on charts to place orders instantly.

## Features

- **Click-to-Trade**: Click on chart → BUY order, Shift+Click → SELL order
- **5 Position Presets**: Configure and switch between 5 position sizes instantly
- **Multi-Exchange Support**: Lighter, Bitget (more exchanges coming)
- **Per-Ticker Storage**: Position sizes saved separately for each exchange and ticker
- **React + Tailwind + shadcn/ui**: Modern, beautiful UI

## Supported Exchanges

- ✅ Lighter (lighter.xyz)
- ✅ Bitget (bitget.com)
- 🔜 More exchanges coming soon

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Build the extension:
```bash
pnpm build
```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Development

```bash
pnpm dev
```

## Icons

The extension includes placeholder icons. To create custom icons:

1. Use `public/icons/icon.svg` as reference (TrendingUp from lucide)
2. Export to PNG at sizes: 16x16, 48x48, 128x128
3. Replace files in `public/icons/`
4. Run `pnpm build`

Or run `pnpm icons` to regenerate placeholder icons.

## How to Use

1. Click the extension icon to open popup
2. Configure 5 position sizes for the current ticker
3. Select active position (highlighted in green)
4. Go to exchange chart and click to place orders:
   - **Left Click**: Place BUY order at clicked price
   - **Shift + Left Click**: Place SELL order at clicked price

## Order Placement (Current Implementation)

Currently all orders are logged to console. Check browser console for detailed order information:

```javascript
// Example console output
🎯 ORDER PLACEMENT REQUEST
Exchange: LIGHTER
Ticker: BTC-USD
Side: BUY
Price: 51234.56
Size: 0.5
Active Position: Pos 1
```

## Integration with Exchange APIs

To integrate with actual exchange APIs, modify [src/background/index.ts](src/background/index.ts):

```typescript
async function placeOrder(order: OrderPlacement) {
  if (order.exchange === 'lighter') {
    // Add your Lighter API integration here
    const response = await fetch('https://api.lighter.xyz/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN',
      },
      body: JSON.stringify({
        symbol: order.ticker,
        side: order.side,
        type: 'limit',
        price: order.price,
        quantity: order.size,
      }),
    });
  }
}
```

## Adding New Exchanges

Add exchange configuration in [src/content/exchangeConfigs.ts](src/content/exchangeConfigs.ts):

```typescript
export const newExchangeConfig: ExchangeConfig = {
  name: 'newexchange',
  displayName: 'New Exchange',
  domain: 'newexchange.com',
  chartSelector: 'canvas.chart',
  priceExtractor: (event, element) => {
    // Extract price from Y coordinate
  },
  tickerExtractor: () => {
    // Extract ticker from page
  },
};
```

## Tech Stack

- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- Vite 7
- Chrome Extension Manifest V3

## License

ISC
