import { OrderPlacement } from '@/types';

console.log('🔧 Scalp Trading Extension Background Script Loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PLACE_ORDER') {
    const order: OrderPlacement = message.payload;

    console.log('═══════════════════════════════════════════════════════');
    console.log('📨 BACKGROUND: Order received from content script');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Exchange:', order.exchange);
    console.log('Ticker:', order.ticker);
    console.log('Side:', order.side);
    console.log('Price:', order.price);
    console.log('Size:', order.size);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('🔌 TODO: Integrate with', order.exchange, 'API');
    console.log('   - Endpoint: [Your API endpoint here]');
    console.log('   - Method: POST');
    console.log('   - Body:', JSON.stringify(order, null, 2));
    console.log('═══════════════════════════════════════════════════════');

    placeOrder(order);

    sendResponse({ success: true });
  }

  return true;
});

async function placeOrder(order: OrderPlacement) {
  console.log(`\n🎯 Placing ${order.side.toUpperCase()} order...`);

  if (order.exchange === 'lighter') {
    console.log('📡 [LIGHTER API CALL]');
    console.log('   URL: https://api.lighter.xyz/v1/orders');
    console.log('   Headers: { "Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN" }');
    console.log('   Body:', {
      symbol: order.ticker,
      side: order.side,
      type: 'limit',
      price: order.price,
      quantity: order.size,
      timestamp: order.timestamp,
    });
  } else if (order.exchange === 'bitget') {
    console.log('📡 [BITGET API CALL]');
    console.log('   URL: https://api.bitget.com/api/v2/mix/order/place-order');
    console.log('   Headers: { "Content-Type": "application/json", "ACCESS-KEY": "YOUR_KEY" }');
    console.log('   Body:', {
      symbol: order.ticker,
      side: order.side,
      orderType: 'limit',
      price: order.price.toString(),
      size: order.size.toString(),
    });
  }

  console.log('\n⏳ Simulating API call...');
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log('✅ Order would be placed successfully (simulation)\n');
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('🎉 Scalp Trading Extension installed successfully');
});
