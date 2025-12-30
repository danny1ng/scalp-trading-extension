# API Integration Examples

## Lighter.xyz Integration

```typescript
// src/background/index.ts

async function placeOrderLighter(order: OrderPlacement) {
  const API_KEY = 'your_lighter_api_key';
  const API_SECRET = 'your_lighter_api_secret';

  try {
    const response = await fetch('https://api.lighter.xyz/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
        'X-API-SIGNATURE': generateSignature(order, API_SECRET),
      },
      body: JSON.stringify({
        symbol: order.ticker,
        side: order.side,
        type: 'limit',
        price: order.price.toString(),
        quantity: order.size.toString(),
        timeInForce: 'GTC',
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Lighter order placed:', result);
    return result;

  } catch (error) {
    console.error('❌ Lighter order failed:', error);
    throw error;
  }
}

function generateSignature(order: OrderPlacement, secret: string): string {
  // Implement signature generation according to Lighter API docs
  // Usually HMAC-SHA256 of request parameters
  return 'signature_placeholder';
}
```

## Bitget Integration

```typescript
// src/background/index.ts

async function placeOrderBitget(order: OrderPlacement) {
  const API_KEY = 'your_bitget_api_key';
  const API_SECRET = 'your_bitget_api_secret';
  const PASSPHRASE = 'your_bitget_passphrase';

  const timestamp = Date.now().toString();
  const requestPath = '/api/v2/mix/order/place-order';

  const bodyData = {
    symbol: order.ticker,
    marginMode: 'isolated', // or 'cross'
    side: order.side,
    orderType: 'limit',
    price: order.price.toString(),
    size: order.size.toString(),
    timeinForce: 'GTC',
  };

  const body = JSON.stringify(bodyData);

  try {
    const signature = generateBitgetSignature(
      timestamp,
      'POST',
      requestPath,
      body,
      API_SECRET
    );

    const response = await fetch(`https://api.bitget.com${requestPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ACCESS-KEY': API_KEY,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': PASSPHRASE,
      },
      body,
    });

    const result = await response.json();

    if (result.code !== '00000') {
      throw new Error(`Bitget Error: ${result.msg}`);
    }

    console.log('✅ Bitget order placed:', result);
    return result;

  } catch (error) {
    console.error('❌ Bitget order failed:', error);
    throw error;
  }
}

function generateBitgetSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  secret: string
): string {
  // Bitget requires HMAC-SHA256 of: timestamp + method + path + body
  const message = timestamp + method + path + body;
  // Use crypto library to generate HMAC-SHA256
  // import { createHmac } from 'crypto';
  // return createHmac('sha256', secret).update(message).digest('base64');
  return 'signature_placeholder';
}
```

## Complete Background Script Example

```typescript
// src/background/index.ts

import { OrderPlacement } from '@/types';
import { createHmac } from 'crypto'; // For Node.js environment

console.log('🔧 Scalp Trading Extension Background Script Loaded');

// Store API credentials (better to use chrome.storage.sync)
const API_CREDENTIALS = {
  lighter: {
    key: '',
    secret: '',
  },
  bitget: {
    key: '',
    secret: '',
    passphrase: '',
  },
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PLACE_ORDER') {
    const order: OrderPlacement = message.payload;

    placeOrder(order)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  }
});

async function placeOrder(order: OrderPlacement) {
  console.log(`🎯 Placing ${order.side.toUpperCase()} order on ${order.exchange}...`);

  try {
    let result;

    if (order.exchange === 'lighter') {
      result = await placeOrderLighter(order);
    } else if (order.exchange === 'bitget') {
      result = await placeOrderBitget(order);
    } else {
      throw new Error(`Unsupported exchange: ${order.exchange}`);
    }

    console.log('✅ Order placed successfully:', result);

    // Store order in history
    await saveOrderToHistory(order, result);

    return result;

  } catch (error) {
    console.error('❌ Order failed:', error);
    throw error;
  }
}

async function saveOrderToHistory(order: OrderPlacement, result: any) {
  const historyKey = 'order_history';
  const storage = await chrome.storage.local.get(historyKey);
  const history = storage[historyKey] || [];

  history.unshift({
    ...order,
    result,
    placedAt: new Date().toISOString(),
  });

  // Keep last 100 orders
  if (history.length > 100) {
    history.length = 100;
  }

  await chrome.storage.local.set({ [historyKey]: history });
}
```

## Storing API Keys Securely

```typescript
// Create a settings page for API credentials

// src/settings.tsx
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function Settings() {
  const [credentials, setCredentials] = useState({
    lighter_key: '',
    lighter_secret: '',
    bitget_key: '',
    bitget_secret: '',
    bitget_passphrase: '',
  });

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    const result = await chrome.storage.sync.get('api_credentials');
    if (result.api_credentials) {
      setCredentials(result.api_credentials);
    }
  };

  const saveCredentials = async () => {
    await chrome.storage.sync.set({ api_credentials: credentials });
    alert('Credentials saved!');
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">API Settings</h2>

      <div>
        <h3 className="font-semibold mb-2">Lighter</h3>
        <Input
          type="password"
          placeholder="API Key"
          value={credentials.lighter_key}
          onChange={(e) => setCredentials({...credentials, lighter_key: e.target.value})}
        />
        <Input
          type="password"
          placeholder="API Secret"
          value={credentials.lighter_secret}
          onChange={(e) => setCredentials({...credentials, lighter_secret: e.target.value})}
        />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Bitget</h3>
        <Input
          type="password"
          placeholder="API Key"
          value={credentials.bitget_key}
          onChange={(e) => setCredentials({...credentials, bitget_key: e.target.value})}
        />
        <Input
          type="password"
          placeholder="API Secret"
          value={credentials.bitget_secret}
          onChange={(e) => setCredentials({...credentials, bitget_secret: e.target.value})}
        />
        <Input
          type="password"
          placeholder="Passphrase"
          value={credentials.bitget_passphrase}
          onChange={(e) => setCredentials({...credentials, bitget_passphrase: e.target.value})}
        />
      </div>

      <Button onClick={saveCredentials}>Save Credentials</Button>
    </div>
  );
}
```

## Testing Without Real API

Use a mock server or test environment:

```typescript
async function placeOrder(order: OrderPlacement) {
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Test mode - simulating order placement');
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      orderId: `test_${Date.now()}`,
      status: 'filled',
      executedPrice: order.price,
      executedSize: order.size,
    };
  }

  // Real API calls here
}
```
