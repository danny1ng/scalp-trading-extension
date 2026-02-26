export type HudCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type HudSettings = {
  enabled: boolean;
  corner: HudCorner;
};

type HudSettingsStore = Record<string, HudSettings>;

const STORAGE_KEY = 'lacHudSettingsByDomain';

const DEFAULT_SETTINGS: HudSettings = {
  enabled: true,
  corner: 'bottom-right'
};

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

function normalizeCorner(value: unknown): HudCorner {
  if (value === 'top-left' || value === 'top-right' || value === 'bottom-left' || value === 'bottom-right') {
    return value;
  }

  return DEFAULT_SETTINGS.corner;
}

function normalizeSettings(raw: unknown): HudSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const maybeSettings = raw as Partial<HudSettings>;
  return {
    enabled: typeof maybeSettings.enabled === 'boolean' ? maybeSettings.enabled : DEFAULT_SETTINGS.enabled,
    corner: normalizeCorner(maybeSettings.corner)
  };
}

async function getStore(): Promise<HudSettingsStore> {
  if (!hasChromeStorage()) {
    return {};
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const store = result[STORAGE_KEY];
  if (!store || typeof store !== 'object') {
    return {};
  }

  return store as HudSettingsStore;
}

async function setStore(store: HudSettingsStore): Promise<void> {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: store });
}

export function getHudSettingsStorageKey(): string {
  return STORAGE_KEY;
}

export function getDefaultHudSettings(): HudSettings {
  return { ...DEFAULT_SETTINGS };
}

export function domainFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function getHudSettingsForDomain(domain: string): Promise<HudSettings> {
  const store = await getStore();
  return normalizeSettings(store[domain.toLowerCase()]);
}

export async function saveHudSettingsForDomain(domain: string, settings: HudSettings): Promise<void> {
  const store = await getStore();
  store[domain.toLowerCase()] = normalizeSettings(settings);
  await setStore(store);
}
