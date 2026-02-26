export function tickerFromTradeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/trade\/([^/]+)/i);
    if (!match) {
      return null;
    }

    return decodeURIComponent(match[1]).toUpperCase();
  } catch {
    return null;
  }
}
