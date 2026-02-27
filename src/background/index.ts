import { isSupportedTradeUrl } from '../core/supported-url';

const ICON_SIZES = [16, 32, 48, 128] as const;

type IconSize = (typeof ICON_SIZES)[number];
type IconSet = Record<IconSize, ImageData>;

type Palette = {
  bg: string;
  line: string;
  dot: string;
  gradientStart?: string;
  gradientEnd?: string;
};

const ACTIVE_PALETTE: Palette = {
  bg: '#1A1A1A',
  line: '#00C853',
  dot: '#FFFFFF',
  gradientStart: '#00C853',
  gradientEnd: '#B2FF59'
};

const INACTIVE_PALETTE: Palette = {
  bg: '#424242',
  line: '#EEEEEE',
  dot: '#FFFFFF'
};

function drawCircle(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoundedRect(
  ctx: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawChartIcon(size: IconSize, palette: Palette): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get OffscreenCanvas context');
  }

  ctx.clearRect(0, 0, size, size);
  ctx.scale(size / 100, size / 100);

  if (palette.gradientStart && palette.gradientEnd) {
    const lineGradient = ctx.createLinearGradient(0, 100, 100, 0);
    lineGradient.addColorStop(0, palette.gradientStart);
    lineGradient.addColorStop(1, palette.gradientEnd);
    ctx.strokeStyle = lineGradient;
  } else {
    ctx.strokeStyle = palette.line;
  }
  ctx.fillStyle = palette.bg;
  drawRoundedRect(ctx, 5, 5, 90, 90, 15);
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(20, 75);
  ctx.lineTo(40, 50);
  ctx.lineTo(55, 70);
  ctx.lineTo(75, 35);
  ctx.lineTo(85, 20);
  ctx.lineTo(85, 40);
  ctx.moveTo(85, 20);
  ctx.lineTo(65, 20);
  ctx.stroke();

  ctx.fillStyle = palette.dot;
  drawCircle(ctx, 85, 20, 5);

  return ctx.getImageData(0, 0, size, size);
}

function buildIconSet(palette: Palette): IconSet {
  return {
    16: drawChartIcon(16, palette),
    32: drawChartIcon(32, palette),
    48: drawChartIcon(48, palette),
    128: drawChartIcon(128, palette)
  };
}

const ACTIVE_ICONS = buildIconSet(ACTIVE_PALETTE);
const INACTIVE_ICONS = buildIconSet(INACTIVE_PALETTE);

async function setIconForTab(tabId: number, url?: string): Promise<void> {
  const isActive = typeof url === 'string' && isSupportedTradeUrl(url);
  await chrome.action.setIcon({ tabId, imageData: isActive ? ACTIVE_ICONS : INACTIVE_ICONS });
}

async function updateIconForActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) {
    await chrome.action.setIcon({ imageData: INACTIVE_ICONS });
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
