import { isSupportedTradeUrl } from '../core/supported-url';

const INACTIVE_COLOR = '#6B7280';
const ACTIVE_COLOR = '#84CC16';
const BG_COLOR = '#0F172A';

function drawIcon(size: number, accent: string): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get OffscreenCanvas context');
  }

  const pad = Math.max(1, Math.floor(size * 0.08));
  const radius = Math.max(2, Math.floor(size * 0.22));

  ctx.clearRect(0, 0, size, size);

  // Outer rounded square
  ctx.fillStyle = BG_COLOR;
  ctx.beginPath();
  ctx.moveTo(pad + radius, pad);
  ctx.lineTo(size - pad - radius, pad);
  ctx.quadraticCurveTo(size - pad, pad, size - pad, pad + radius);
  ctx.lineTo(size - pad, size - pad - radius);
  ctx.quadraticCurveTo(size - pad, size - pad, size - pad - radius, size - pad);
  ctx.lineTo(pad + radius, size - pad);
  ctx.quadraticCurveTo(pad, size - pad, pad, size - pad - radius);
  ctx.lineTo(pad, pad + radius);
  ctx.quadraticCurveTo(pad, pad, pad + radius, pad);
  ctx.closePath();
  ctx.fill();

  // Geometric mark: rising zig-zag + arrow head
  const w = size - pad * 2;
  const h = size - pad * 2;
  const x0 = pad + w * 0.2;
  const y0 = pad + h * 0.68;
  const x1 = pad + w * 0.42;
  const y1 = pad + h * 0.5;
  const x2 = pad + w * 0.57;
  const y2 = pad + h * 0.58;
  const x3 = pad + w * 0.78;
  const y3 = pad + h * 0.33;

  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.6, size * 0.11);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.stroke();

  const ah = Math.max(2, size * 0.1);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(x3, y3 - ah * 0.9);
  ctx.lineTo(x3 + ah * 0.95, y3 + ah * 0.2);
  ctx.lineTo(x3 - ah * 0.35, y3 + ah * 0.5);
  ctx.closePath();
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function buildIconSet(accent: string): Record<number, ImageData> {
  return {
    16: drawIcon(16, accent),
    32: drawIcon(32, accent),
    48: drawIcon(48, accent),
    128: drawIcon(128, accent)
  };
}

const ICON_INACTIVE = buildIconSet(INACTIVE_COLOR);
const ICON_ACTIVE = buildIconSet(ACTIVE_COLOR);

async function setIconForTab(tabId: number, url?: string): Promise<void> {
  const isActive = typeof url === 'string' && isSupportedTradeUrl(url);
  await chrome.action.setIcon({ tabId, imageData: isActive ? ICON_ACTIVE : ICON_INACTIVE });
}

async function updateIconForActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) {
    return;
  }

  await setIconForTab(tab.id, tab.url);
}

chrome.runtime.onInstalled.addListener(() => {
  void updateIconForActiveTab();
});

chrome.runtime.onStartup.addListener(() => {
  void updateIconForActiveTab();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void chrome.tabs
    .get(tabId)
    .then((tab) => setIconForTab(tabId, tab.url))
    .catch(() => undefined);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    void setIconForTab(tabId, changeInfo.url ?? tab.url);
  }
});

chrome.windows.onFocusChanged.addListener(() => {
  void updateIconForActiveTab();
});
