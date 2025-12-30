# Usage Guide

## Quick Start

1. **Install Extension**
   ```bash
   pnpm install
   pnpm build
   ```
   Load `dist/` folder in Chrome Extensions (Developer mode)

2. **Open Supported Exchange**
   - Navigate to lighter.xyz or bitget.com
   - Go to trading page with chart

3. **Configure Position Sizes**
   - Click extension icon in Chrome toolbar
   - Enter position sizes in the 5 cells (e.g., 0.1, 0.25, 0.5, 1.0, 2.0)
   - Click on a position to activate it (highlighted in green)

4. **Start Trading**
   - **Click on chart** → Places BUY order at clicked price
   - **Shift + Click on chart** → Places SELL order at clicked price
   - Check browser console for order details

## Position Size Management

### Per-Exchange, Per-Ticker Storage
Position sizes are saved separately for each exchange and ticker:
- `lighter.xyz/trade/BTC-USD` → Separate positions
- `lighter.xyz/trade/ETH-USD` → Separate positions
- `bitget.com/BTCUSDT` → Separate positions

### Active Position Selection
Only ONE position is active at a time (green highlight). Click to switch between positions.

## Console Output Example

```javascript
═══════════════════════════════════════════════════════
🎯 ORDER PLACEMENT REQUEST
═══════════════════════════════════════════════════════
Exchange: LIGHTER
Ticker: BTC-USD
Side: BUY
Price: 51234.56
Size: 0.5
Timestamp: 2024-12-30T12:34:56.789Z
Active Position: Pos 1
═══════════════════════════════════════════════════════

📡 [LIGHTER API CALL]
   URL: https://api.lighter.xyz/v1/orders
   Headers: { "Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN" }
   Body: {
     symbol: "BTC-USD",
     side: "buy",
     type: "limit",
     price: 51234.56,
     quantity: 0.5,
     timestamp: 1234567890123
   }
```

## API Integration

Currently all orders are logged to console. To integrate with real APIs:

### Edit [src/background/index.ts](src/background/index.ts)

```typescript
async function placeOrder(order: OrderPlacement) {
  if (order.exchange === 'lighter') {
    // Replace with actual API call
    const response = await fetch('https://api.lighter.xyz/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${YOUR_API_KEY}`,
      },
      body: JSON.stringify({
        symbol: order.ticker,
        side: order.side,
        type: 'limit',
        price: order.price,
        quantity: order.size,
      }),
    });

    const result = await response.json();
    console.log('Order placed:', result);
  }
}
```

## Adding New Exchanges

### 1. Update manifest.json

```json
"host_permissions": [
  "https://*.newexchange.com/*"
],
"content_scripts": [
  {
    "matches": ["https://*.newexchange.com/*"]
  }
]
```

### 2. Add Exchange Config

Edit [src/content/exchangeConfigs.ts](src/content/exchangeConfigs.ts):

```typescript
export const newExchangeConfig: ExchangeConfig = {
  name: 'newexchange',
  displayName: 'New Exchange',
  domain: 'newexchange.com',

  // CSS selector for chart canvas/container
  chartSelector: 'canvas.trading-chart',

  // Extract price from Y coordinate
  priceExtractor: (event: MouseEvent, element: Element): number | null => {
    const rect = element.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    // Implement your logic to convert Y position to price
    // This might require inspecting the exchange's chart library
    const relativeY = 1 - (y / height);
    const price = calculatePriceFromY(relativeY);
    return price;
  },

  // Extract current ticker from page
  tickerExtractor: (): string | null => {
    // Try URL pattern first
    const urlMatch = window.location.pathname.match(/\/trade\/([^\/]+)/);
    if (urlMatch) return urlMatch[1];

    // Try DOM selector
    const element = document.querySelector('.ticker-display');
    return element?.textContent?.trim() || null;
  },
};
```

### 3. Add to configs array

```typescript
export const exchangeConfigs: ExchangeConfig[] = [
  lighterConfig,
  bitgetConfig,
  newExchangeConfig, // Add here
];
```

### 4. Update types

Edit [src/types/index.ts](src/types/index.ts):

```typescript
export type Exchange = 'lighter' | 'bitget' | 'newexchange';
```

## Troubleshooting

### Orders not placing
1. Open browser console (F12)
2. Check for error messages
3. Verify chart selector is correct
4. Ensure position size > 0

### Price extraction wrong
1. Inspect chart element
2. Check if chart library adds price scales
3. Adjust `priceExtractor` logic in exchange config

### Ticker not detected
1. Check URL pattern in `tickerExtractor`
2. Inspect page for ticker element
3. Update selector in config

## Development Tips

- Use `console.log` extensively in content scripts
- Test price extraction by clicking different chart areas
- Verify storage with Chrome DevTools → Application → Storage
- Background script logs appear in extension service worker console
