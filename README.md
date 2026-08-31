# GRAVITY

**Базовая версия 1.0 · GDI-1.3**

Индикатор price discovery: **кто сейчас ставит цену** на выбранном таймфрейме — спот или бессрочные. Считается **внутри одной биржи** (пит). Режим **Рынок** — консенсус питов, не смесь свечей.

Не RSI, не funding, не прогноз. Предиктор снят после walk-forward (~46%). Дальше проект только в этой рамке: влияние спота и перпов по биржам.

## Что показывает

| Блок | Смысл |
| --- | --- |
| **G** ∈ [−1, +1] | Отрицательный — спот открывает цену. Положительный — перпы. Доля влияния = `50 ± 50·G` |
| Векторы спот / перпы | Куда тянет площадка и сила |
| Режим | Синхронно, борются, один ведёт |
| Результирующий вектор | Сумма векторов + сверка с ценой 1 бар назад |
| Объём | Номинал USDT vs **активность** (каждый рынок к своему среднему) |
| Taker buy/sell | Кто снимает стакан. На перпах это не лонги/шорты |
| Питы | OKX, Binance, Bybit — GDI каждой биржи отдельно |
| Рынок | Медиана live-G и большинство 2 из 3. Демо не голосует |

Веса GDI-1.3: lead-lag 27% · Δ базиса 26% · taker 22% · OI 13% · выровненная активность 12%. Сырой оборот перпов (~90% номинала) в индекс не идёт.

Данные: публичный рынок выбранного пита. Ключи API не нужны. Обновление каждые 15 с. Если биржа недоступна — демо-поток с пометкой.

## Запуск

```bash
npm install
npm run dev
```

API:

```
GET /api/gravity?symbol=BTC&interval=5m&window=48&venue=okx
GET /api/gravity?symbol=BTC&interval=5m&window=48&venue=all
GET /api/venues
```

`venue`: okx, binance, bybit, **all**  
`symbol`: BTC, ETH, SOL, XRP, DOGE, BNB  
`interval`: 1m, 5m, 15m, 1H, 4H  
`window`: 24, 48, 96 баров

Новая биржа — адаптер `fetch(symbol, interval, window) → { bars, funding, premium, oiUsd }`:

```ts
import { registerVenue } from "./lib/venues";
registerVenue({ id: "kraken", fetch: fetchKraken });
```

## Стек

TanStack Start (Vite) · React 19 · TanStack Query · Recharts.

Ядро — [`src/lib/gravity.ts`](src/lib/gravity.ts). Площадки — [`src/lib/venues/`](src/lib/venues). Формулы изолированы от UI и от биржи.

```bash
npm test
npm run typecheck
npm run build
```

## Чего здесь нет и не будет в этой рамке

- Прогноза следующего бара
- Смеси свечей разных бирж в один GDI
- TradingView / OpenMarket как источника
- Разбивки OI на лонги и шорты
- Новых семейств индикаторов (RSI, стакан L2, соцсигналы)
