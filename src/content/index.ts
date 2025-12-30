import { detectExchange } from './exchangeConfigs';
import { ChartClickHandler } from './chartClickHandler';

console.log('🚀 Scalp Trading Extension Content Script Loaded');

const exchangeConfig = detectExchange();

if (exchangeConfig) {
  console.log(`✅ Running on ${exchangeConfig.displayName}`);

  const handler = new ChartClickHandler(exchangeConfig);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'TOGGLE_TRADING') {
      handler.setEnabled(message.enabled);
      sendResponse({ success: true });
    }
    return true;
  });

  console.log('💡 Click on chart to place BUY order');
  console.log('💡 Hold SHIFT + Click to place SELL order');
} else {
  console.log('⚠️ This exchange is not supported yet');
}
