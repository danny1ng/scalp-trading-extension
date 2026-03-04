import {
  MESSAGE_SOURCE,
  MESSAGE_TYPE_FORM_FILL_REQUEST,
  MESSAGE_TYPE_FORM_FILL_RESPONSE,
  MESSAGE_TYPE_PRICE_REQUEST,
  MESSAGE_TYPE_PRICE_RESPONSE
} from '../types';

export type FormFillBridgeResponse = {
  priceSet: boolean;
  amountSet: boolean;
  priceValue: string | null;
  amountValue: string | null;
};

export function injectPagePriceBridge(targetDocument: Document = document): void {
  const marker = '__scalpAltClickPageBridgeInjected';
  const markedDocument = targetDocument as Document & Record<string, unknown>;
  if (markedDocument[marker]) {
    return;
  }

  markedDocument[marker] = true;
  const script = targetDocument.createElement('script');
  script.src = chrome.runtime.getURL('assets/page-bridge.js');
  script.async = false;

  (targetDocument.head ?? targetDocument.documentElement).appendChild(script);
  script.remove();
}

export async function requestPriceFromPageBridge(localY: number, targetWindow: Window = window): Promise<number | null> {
  const requestId = `lac-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return await new Promise<number | null>((resolve) => {
    const timeoutId = targetWindow.setTimeout(() => {
      targetWindow.removeEventListener('message', onMessage);
      resolve(null);
    }, 150);

    const onMessage = (event: MessageEvent): void => {
      const data = event.data as
        | {
            source?: string;
            type?: string;
            requestId?: string;
            price?: number | null;
          }
        | null;

      if (!data || data.source !== MESSAGE_SOURCE || data.type !== MESSAGE_TYPE_PRICE_RESPONSE || data.requestId !== requestId) {
        return;
      }

      targetWindow.clearTimeout(timeoutId);
      targetWindow.removeEventListener('message', onMessage);
      resolve(typeof data.price === 'number' && Number.isFinite(data.price) ? data.price : null);
    };

    targetWindow.addEventListener('message', onMessage);
    targetWindow.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: MESSAGE_TYPE_PRICE_REQUEST,
        requestId,
        localY
      },
      '*'
    );
  });
}

export async function requestFormFillFromPageBridge(price: string, amount: string): Promise<FormFillBridgeResponse | null> {
  const requestId = `lac-fill-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return await new Promise<FormFillBridgeResponse | null>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(null);
    }, 300);

    const onMessage = (event: MessageEvent): void => {
      const data = event.data as
        | {
            source?: string;
            type?: string;
            requestId?: string;
            priceSet?: boolean;
            amountSet?: boolean;
            priceValue?: string | null;
            amountValue?: string | null;
          }
        | null;

      if (!data || data.source !== MESSAGE_SOURCE || data.type !== MESSAGE_TYPE_FORM_FILL_RESPONSE || data.requestId !== requestId) {
        return;
      }

      window.clearTimeout(timeoutId);
      window.removeEventListener('message', onMessage);
      resolve({
        priceSet: Boolean(data.priceSet),
        amountSet: Boolean(data.amountSet),
        priceValue: typeof data.priceValue === 'string' ? data.priceValue : null,
        amountValue: typeof data.amountValue === 'string' ? data.amountValue : null
      });
    };

    window.addEventListener('message', onMessage);
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: MESSAGE_TYPE_FORM_FILL_REQUEST,
        requestId,
        price,
        amount
      },
      '*'
    );
  });
}
