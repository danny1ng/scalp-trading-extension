# Lighter Alt+Click MVP Design

## Goal
Сделать Chrome MV3 расширение для `https://app.lighter.xyz/trade/*`, которое на `Alt + Left Click` по чару вычисляет цену клика и пишет структурированный лог в консоль. Добавить popup для хранения 5 слотов объема по тикеру в `chrome.storage.local`.

## Scope (MVP)
- Контент-скрипт слушает `Alt + Left Mouse`.
- Вычисляет `clickedPrice` по видимым меткам price-axis справа с линейной интерполяцией.
- Определяет тикер из URL `/trade/:ticker`.
- Пытается получить текущую цену (`currentPrice`) из DOM.
- Вычисляет сторону: `clickedPrice < currentPrice => buy`, иначе `sell`.
- Лог в `console.log` с payload для будущего API.
- Popup на React: тикер + 5 слотов объема, сохранение/чтение из `chrome.storage.local`.

## Architecture
- `src/content/index.ts`: обработчик событий, orchestration.
- `src/lib/price-axis.ts`: парсинг price labels и интерполяция.
- `src/lib/ticker.ts`: тикер из URL.
- `src/lib/side.ts`: правило buy/sell.
- `src/lib/slots-storage.ts`: чтение/запись слотов.
- `src/App.tsx`: UI popup.

## Error Handling
- Нет валидных price labels: логировать предупреждение и завершать обработку.
- Нет currentPrice: side=`unknown`, но clickedPrice логируется.
- Пустые/невалидные слоты: сохранять как `null`.

## Testing
- Unit-тесты на:
  - интерполяцию цены по двум меткам,
  - парсинг чисел,
  - сторону buy/sell,
  - извлечение тикера из URL,
  - нормализацию слотов.

## Future API Hook
- Заглушка `submitLimitOrderDraft(payload)` в content-скрипте.
