import { ExchangeConfig, OrderPlacement } from '@/types';
import { PositionStorage } from '@/storage/positionStorage';

export class ChartClickHandler {
  private config: ExchangeConfig;
  private chartElements: Element[] = [];
  private isEnabled: boolean = true;

  constructor(config: ExchangeConfig) {
    this.config = config;
    this.init();
  }

  private init() {
    console.log(`[ChartClickHandler] Initializing for ${this.config.displayName}`);
    this.findChartElements();
    this.attachListeners();

    const observer = new MutationObserver(() => {
      this.findChartElements();
      this.attachListeners();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private findChartElements() {
    const elements = document.querySelectorAll(this.config.chartSelector);
    this.chartElements = Array.from(elements);
    console.log(`[ChartClickHandler] Found ${this.chartElements.length} chart elements`);
  }

  private attachListeners() {
    this.chartElements.forEach((element) => {
      if (!element.hasAttribute('data-scalp-listener')) {
        element.setAttribute('data-scalp-listener', 'true');
        element.addEventListener('click', this.handleClick.bind(this) as EventListener);
        console.log('[ChartClickHandler] Listener attached to element');
      }
    });
  }

  private async handleClick(event: Event) {
    if (!this.isEnabled) return;

    const mouseEvent = event as MouseEvent;
    const element = mouseEvent.currentTarget as Element;
    const price = this.config.priceExtractor(mouseEvent, element);

    if (price === null) {
      console.warn('[ChartClickHandler] Could not extract price from click');
      return;
    }

    const ticker = this.config.tickerExtractor();
    if (!ticker) {
      console.warn('[ChartClickHandler] Could not extract ticker');
      return;
    }

    const activePositionIndex = await PositionStorage.getCurrentActivePosition();
    const positions = await PositionStorage.getPositions(this.config.name, ticker);

    if (activePositionIndex === null || !positions[activePositionIndex]) {
      console.warn('[ChartClickHandler] No active position selected');
      return;
    }

    const activePosition = positions[activePositionIndex];
    const size = activePosition.size;

    if (size <= 0) {
      console.warn('[ChartClickHandler] Position size is 0 or negative');
      return;
    }

    const side = mouseEvent.shiftKey ? 'sell' : 'buy';

    const order: OrderPlacement = {
      exchange: this.config.name,
      ticker,
      price,
      size,
      side,
      timestamp: Date.now(),
    };

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎯 ORDER PLACEMENT REQUEST');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Exchange:', order.exchange.toUpperCase());
    console.log('Ticker:', order.ticker);
    console.log('Side:', order.side.toUpperCase());
    console.log('Price:', order.price.toFixed(2));
    console.log('Size:', order.size);
    console.log('Timestamp:', new Date(order.timestamp).toISOString());
    console.log('Active Position:', activePosition.label);
    console.log('═══════════════════════════════════════════════════════');

    this.sendOrderToBackground(order);
  }

  private sendOrderToBackground(order: OrderPlacement) {
    chrome.runtime.sendMessage(
      {
        type: 'PLACE_ORDER',
        payload: order,
      },
      (response) => {
        if (response?.success) {
          console.log('✅ Order message sent to background successfully');
        } else {
          console.error('❌ Failed to send order message:', response?.error);
        }
      }
    );
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`[ChartClickHandler] ${enabled ? 'Enabled' : 'Disabled'}`);
  }
}
