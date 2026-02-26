type SafeModeStore = Record<string, boolean>;

const STORAGE_KEY = 'lacSafeModeByDomain';
const DEFAULT_SAFE_MODE = true;

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

function normalizeSafeMode(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : DEFAULT_SAFE_MODE;
}

async function getStore(): Promise<SafeModeStore> {
  if (!hasChromeStorage()) {
    return {};
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const store = result[STORAGE_KEY];
  if (!store || typeof store !== 'object') {
    return {};
  }

  return store as SafeModeStore;
}

async function setStore(store: SafeModeStore): Promise<void> {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: store });
}

export function getSafeModeStorageKey(): string {
  return STORAGE_KEY;
}

export function getDefaultSafeMode(): boolean {
  return DEFAULT_SAFE_MODE;
}

export async function getSafeModeForDomain(domain: string): Promise<boolean> {
  const store = await getStore();
  return normalizeSafeMode(store[domain.toLowerCase()]);
}

export async function saveSafeModeForDomain(domain: string, safeMode: boolean): Promise<void> {
  const store = await getStore();
  store[domain.toLowerCase()] = normalizeSafeMode(safeMode);
  await setStore(store);
}
