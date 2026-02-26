export type PriceLabelPoint = {
  y: number;
  price: number;
};

const PRICE_TEXT_REGEX = /^\s*[+-]?(?:\d+\.\d+|\d+|\.\d+)\s*$/;

export function parsePriceText(text: string): number | null {
  if (!PRICE_TEXT_REGEX.test(text)) {
    return null;
  }

  const normalized = text.trim().replace(/,/g, '');
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export function interpolatePriceAtY(labels: PriceLabelPoint[], y: number): number | null {
  if (labels.length < 2) {
    return null;
  }

  const sorted = [...labels].sort((a, b) => a.y - b.y);

  for (let i = 0; i < sorted.length; i += 1) {
    if (Math.abs(sorted[i].y - y) < 0.5) {
      return sorted[i].price;
    }
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const top = sorted[i];
    const bottom = sorted[i + 1];

    if (y >= top.y && y <= bottom.y) {
      const yRange = bottom.y - top.y;
      if (yRange === 0) {
        return top.price;
      }

      const ratio = (y - top.y) / yRange;
      return top.price + (bottom.price - top.price) * ratio;
    }
  }

  return null;
}

export function extractAxisPriceLabels(doc: Document = document): PriceLabelPoint[] {
  const elements = Array.from(doc.querySelectorAll<HTMLElement>('div, span'));
  const points = new Map<number, number>();

  for (const element of elements) {
    const text = element.textContent?.trim();
    if (!text) {
      continue;
    }

    const price = parsePriceText(text);
    if (price === null) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }

    if (rect.left < window.innerWidth * 0.75) {
      continue;
    }

    const y = rect.top + rect.height / 2;
    const roundedY = Math.round(y * 10) / 10;

    if (!points.has(roundedY)) {
      points.set(roundedY, price);
    }
  }

  return Array.from(points.entries())
    .map(([y, price]) => ({ y, price }))
    .sort((a, b) => a.y - b.y);
}

export function detectCurrentPrice(doc: Document = document): number | null {
  const elements = Array.from(doc.querySelectorAll<HTMLElement>('div, span'));

  for (const element of elements) {
    const text = element.textContent?.trim();
    if (!text) {
      continue;
    }

    const price = parsePriceText(text);
    if (price === null) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }

    if (rect.left < window.innerWidth * 0.75) {
      continue;
    }

    const style = window.getComputedStyle(element);
    const hasHighlight = style.fontWeight === '700' || style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    if (hasHighlight) {
      return price;
    }
  }

  return null;
}
