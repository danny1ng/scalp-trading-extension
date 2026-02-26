export type OrderSide = 'buy' | 'sell' | 'unknown';

export type DraftOrderPayload = {
  ticker: string | null;
  clickedPrice: number;
  currentPrice: number | null;
  side: OrderSide;
  action: 'buy' | 'sell' | 'unknown';
  slotVolume: number | null;
  activeSlotIndex: number;
  clickY: number;
  timestamp: string;
};

export type UiOrderSide = 'buy' | 'sell';

export type SlotValue = number | null;
export type HudCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type HudSettings = {
  enabled: boolean;
  corner: HudCorner;
};

export type TickerSlotConfig = {
  slots: SlotValue[];
  activeSlotIndex: number;
};

export const LOG_PREFIX = '[scalp-alt-click]';
export const MESSAGE_SOURCE = 'scalp-alt-click-extension';
export const MESSAGE_TYPE_DRAFT = 'lac-draft-limit-order';
export const MESSAGE_TYPE_UI_DRY_RUN = 'lac-ui-dry-run';
export const MESSAGE_TYPE_PRICE_REQUEST = 'lac-price-request';
export const MESSAGE_TYPE_PRICE_RESPONSE = 'lac-price-response';
export const MESSAGE_TYPE_FORM_FILL_REQUEST = 'lac-form-fill-request';
export const MESSAGE_TYPE_FORM_FILL_RESPONSE = 'lac-form-fill-response';
