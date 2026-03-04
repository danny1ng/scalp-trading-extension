export type SlotValue = number | null;

export type TickerSlotConfig = {
  slots: SlotValue[];
  activeSlotIndex: number;
};

type ExchangeStorageRecord = Record<string, TickerSlotConfig>;
type StorageRecord = Record<string, ExchangeStorageRecord>;

const STORAGE_KEY = 'lacVolumeByExchangeTicker';
const LEGACY_STORAGE_KEY = 'lighterVolumeByTicker';

const DEFAULT_CONFIG: TickerSlotConfig = {
  slots: [null, null, null, null, null],
  activeSlotIndex: 0
};

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

export function normalizeSlots(input: unknown[]): SlotValue[] {
  const normalized: SlotValue[] = [null, null, null, null, null];

  for (let i = 0; i < 5; i += 1) {
    const value = input[i];

    if (value === null || value === undefined || value === '') {
      normalized[i] = null;
      continue;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    normalized[i] = Number.isFinite(parsed) ? parsed : null;
  }

  return normalized;
}

function normalizeConfig(raw: Partial<TickerSlotConfig> | undefined): TickerSlotConfig {
  if (!raw) {
    return { ...DEFAULT_CONFIG, slots: [...DEFAULT_CONFIG.slots] };
  }

  const slots = normalizeSlots(Array.isArray(raw.slots) ? raw.slots : []);
  const rawIndex = typeof raw.activeSlotIndex === 'number' ? raw.activeSlotIndex : 0;
  const boundedIndex = Math.max(0, Math.min(4, Math.trunc(rawIndex)));

  return {
    slots,
    activeSlotIndex: boundedIndex
  };
}

async function getStore(): Promise<StorageRecord> {
  if (!hasChromeStorage()) {
    return {};
  }

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const store = result[STORAGE_KEY];

  if (store && typeof store === 'object') {
    return store as StorageRecord;
  }

  const legacyResult = await chrome.storage.local.get(LEGACY_STORAGE_KEY);
  const legacyStore = legacyResult[LEGACY_STORAGE_KEY];
  if (!legacyStore || typeof legacyStore !== 'object') {
    return {};
  }

  const migrated: StorageRecord = { lighter: {} };
  for (const [ticker, rawConfig] of Object.entries(legacyStore as Record<string, Partial<TickerSlotConfig>>)) {
    migrated.lighter[ticker.toUpperCase()] = normalizeConfig(rawConfig);
  }

  await setStore(migrated);
  return migrated;
}

async function setStore(store: StorageRecord): Promise<void> {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: store });
}

export async function getTickerSlotConfig(exchangeId: string, ticker: string): Promise<TickerSlotConfig> {
  const exchangeKey = exchangeId.toLowerCase();
  const key = ticker.toUpperCase();
  const store = await getStore();
  return normalizeConfig(store[exchangeKey]?.[key]);
}

export async function saveTickerSlotConfig(exchangeId: string, ticker: string, config: TickerSlotConfig): Promise<void> {
  const exchangeKey = exchangeId.toLowerCase();
  const key = ticker.toUpperCase();
  const store = await getStore();
  const exchangeStore: ExchangeStorageRecord = store[exchangeKey] && typeof store[exchangeKey] === 'object' ? { ...store[exchangeKey] } : {};
  exchangeStore[key] = normalizeConfig(config);
  store[exchangeKey] = exchangeStore;
  await setStore(store);
}
