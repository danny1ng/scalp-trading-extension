const SUPPORTED_HOSTS = new Set(['app.lighter.xyz', 'lighter.exchange']);

export function isSupportedTradeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SUPPORTED_HOSTS.has(parsed.hostname) && /^\/trade\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function getSupportedHost(url: string): string | null {
  if (!isSupportedTradeUrl(url)) {
    return null;
  }

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
