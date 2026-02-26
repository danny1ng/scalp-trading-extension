export type OrderSide = 'buy' | 'sell' | 'unknown';

export function decideSide(clickedPrice: number, currentPrice: number | null): OrderSide {
  if (currentPrice === null) {
    return 'unknown';
  }

  if (clickedPrice < currentPrice) {
    return 'buy';
  }

  return 'sell';
}
