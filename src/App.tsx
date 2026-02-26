import { useEffect, useMemo, useState } from 'react';
import { Badge } from './components/ui/badge';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import { isSupportedTradeUrl } from './core/supported-url';
import { getTickerSlotConfig, saveTickerSlotConfig, type SlotValue } from './lib/slots-storage';
import { tickerFromTradeUrl } from './lib/ticker';

type DraftSlots = string[];

type ActiveTabContext = {
  url: string | null;
  ticker: string | null;
  supported: boolean;
};

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

async function getActiveTabContext(): Promise<ActiveTabContext> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return { url: null, ticker: null, supported: false };
  }

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const currentUrl = tabs[0]?.url ?? null;
  if (!currentUrl) {
    return { url: null, ticker: null, supported: false };
  }

  return {
    url: currentUrl,
    ticker: tickerFromTradeUrl(currentUrl),
    supported: isSupportedTradeUrl(currentUrl)
  };
}

export default function App() {
  const [ticker, setTicker] = useState('BTC');
  const [slots, setSlots] = useState<DraftSlots>(['', '', '', '', '']);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loaded' | 'saved'>('idle');
  const [tabContext, setTabContext] = useState<ActiveTabContext>({
    url: null,
    ticker: null,
    supported: false
  });

  useEffect(() => {
    async function detectActiveTabContext() {
      const context = await getActiveTabContext();
      setTabContext(context);
      if (context.ticker) {
        setTicker(context.ticker);
      }
    }

    void detectActiveTabContext();
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

  async function persistDraft(nextSlots: DraftSlots, nextActiveSlotIndex: number): Promise<void> {
    await saveTickerSlotConfig(ticker, {
      slots: parseDraftSlots(nextSlots),
      activeSlotIndex: nextActiveSlotIndex
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

  async function commitCurrentDraft(): Promise<void> {
    await persistDraft(slots, activeSlotIndex);
  }

  async function selectActiveSlot(index: number): Promise<void> {
    setActiveSlotIndex(index);
    await persistDraft(slots, index);
  }

  const activeVolumePreview = useMemo(() => {
    const value = slots[activeSlotIndex];
    return value.trim() === '' ? 'Not set' : value;
  }, [slots, activeSlotIndex]);

  const displayTicker = tabContext.ticker ?? ticker;

  return (
    <main className="popup">
      <Card className="header-card">
        <div>
          <h1>One-Click Chart Scalper</h1>
          <p>Fast chart click workflow for scalping entries</p>
        </div>
        <Badge tone={tabContext.supported ? 'success' : 'muted'}>
          {tabContext.supported ? 'Supported Site' : 'Unsupported Site'}
        </Badge>
      </Card>

      {tabContext.supported ? (
        <>
          <Card className="context-card">
            <div className="field">
              <span>Ticker</span>
              <div className="ticker-value">{displayTicker}</div>
            </div>
            <div className="context-meta">
              <span>Active Slot: #{activeSlotIndex + 1}</span>
              <span>Volume: {activeVolumePreview}</span>
            </div>
          </Card>

          <Card className="slots-card">
            <h2>Volume Slots</h2>
            <div className="slots-list">
              {slots.map((value, index) => (
                <label key={index} className="slot-row">
                  <input
                    type="radio"
                    name="activeSlot"
                    checked={activeSlotIndex === index}
                    onChange={() => void selectActiveSlot(index)}
                    aria-label={`Active slot ${index + 1}`}
                  />
                  <span className="slot-label">Slot {index + 1}</span>
                  <Input
                    value={value}
                    onChange={(event) => updateSlot(index, event.target.value)}
                    onBlur={() => void commitCurrentDraft()}
                    placeholder="Volume"
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card className="footer-card">
            <p className="hint">Hold Alt + Left Click on chart to generate order draft.</p>
            <p className="hint">Use Alt + 1..5 to switch active slot.</p>
            <p className="status">Status: {status}</p>
          </Card>
        </>
      ) : (
        <Card className="unsupported-card">
          <h2>How to start</h2>
          <p>
            Open a supported platform trade page first, choose a ticker, then volume slots will become available in this
            popup.
          </p>
        </Card>
      )}
    </main>
  );
}
