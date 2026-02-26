import { useEffect, useState } from 'react';
import { getTickerSlotConfig, saveTickerSlotConfig, type SlotValue } from './lib/slots-storage';

type DraftSlots = string[];

function toDraftSlots(values: SlotValue[]): DraftSlots {
  return values.map((value) => (value === null ? '' : String(value)));
}

function parseDraftSlots(values: DraftSlots): SlotValue[] {
  return values.map((value) => {
    if (value.trim() === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });
}

function tickerFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/trade\/([^/]+)/i);
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

async function getActiveTabTicker(): Promise<string | null> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return null;
  }

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const currentUrl = tabs[0]?.url;

  if (!currentUrl) {
    return null;
  }

  try {
    const parsed = new URL(currentUrl);
    if (parsed.hostname !== 'app.lighter.xyz') {
      return null;
    }

    return tickerFromPath(parsed.pathname);
  } catch {
    return null;
  }
}

export default function App() {
  const [ticker, setTicker] = useState('ARC');
  const [slots, setSlots] = useState<DraftSlots>(['', '', '', '', '']);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function detectTicker() {
      const activeTicker = await getActiveTabTicker();
      if (activeTicker) {
        setTicker(activeTicker);
      }
    }

    void detectTicker();
  }, []);

  useEffect(() => {
    async function load() {
      const config = await getTickerSlotConfig(ticker);
      setSlots(toDraftSlots(config.slots));
      setActiveSlotIndex(config.activeSlotIndex);
      setStatus('loaded');
    }

    void load();
  }, [ticker]);

  async function onSave(): Promise<void> {
    await saveTickerSlotConfig(ticker, {
      slots: parseDraftSlots(slots),
      activeSlotIndex
    });
    setStatus('saved');
  }

  function updateSlot(index: number, value: string): void {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  return (
    <main className="popup">
      <h1>Lighter Volumes</h1>
      <label className="field">
        <span>Ticker</span>
        <input
          value={ticker}
          onChange={(event) => setTicker(event.target.value.toUpperCase())}
          placeholder="ARC"
        />
      </label>

      <section className="slots">
        {slots.map((value, index) => (
          <label key={index} className="field row">
            <input
              type="radio"
              name="activeSlot"
              checked={activeSlotIndex === index}
              onChange={() => setActiveSlotIndex(index)}
              aria-label={`Active slot ${index + 1}`}
            />
            <span>Slot {index + 1}</span>
            <input
              value={value}
              onChange={(event) => updateSlot(index, event.target.value)}
              placeholder="Volume"
            />
          </label>
        ))}
      </section>

      <button onClick={() => void onSave()} type="button">
        Save
      </button>

      <p className="status">{status}</p>
    </main>
  );
}
