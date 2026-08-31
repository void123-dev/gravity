# GRAVITY

**GDI-1.3** — индикатор price discovery: **кто сейчас ставит цену** на выбранном таймфрейме, спот или бессрочные фьючерсы (OKX).

Не RSI, не funding, не прогноз следующего бара. После walk-forward проверки предиктор снят: попадание ~46% — хуже монетки. Остаётся то, что считается честно.

## Что показывает

| Блок | Смысл |
| --- | --- |
| **G** ∈ [−1, +1] | Отрицательный — спот открывает цену. Положительный — перпы. Доля влияния = `50 ± 50·G` |
| Векторы спот / перпы | Куда тянет площадка (вверх / вниз / нейтрально) и сила |
| Режим | Синхронно, борются, один ведёт |
| Результирующий вектор | Сумма векторов + сверка с ценой 1 бар назад |
| Объём | Номинал USDT vs **активность** (каждый рынок к своему среднему) |
| Taker buy/sell | Кто снимает стакан. На перпах это не лонги/шорты |

Веса GDI-1.3: lead-lag 27% · Δ базиса 26% · taker 22% · OI 13% · выровненная активность 12%. Сырой оборот перпов (~90% номинала) в индекс не идёт.

Данные: живой рынок выбранного **пита** (OKX / Binance / Bybit). GDI всегда внутри одной биржи: её спот против её перпов. Ключи API не нужны. Обновление каждые 15 с. Если биржа недоступна — демо-поток с пометкой.

## Запуск

```bash
npm install
npm run dev
```

Откроется терминал на порту 8080. API:

```
GET /api/gravity?symbol=BTC&interval=5m&window=48&venue=okx
GET /api/gravity?symbol=BTC&interval=5m&window=48&venue=all
GET /api/venues
```

`venue`: okx, binance, bybit, **all** (консенсус)  
`symbol`: BTC, ETH, SOL, XRP, DOGE, BNB  
`interval`: 1m, 5m, 15m, 1H, 4H  
`window`: 24, 48, 96 баров

`venue=all` — не смесь свечей. Считается G каждой биржи, потом **медиана live-питов** и большинство 2 из 3. Демо-поток в голосование не входит.

Новая биржа — адаптер `fetch(symbol, interval, window) → { bars, funding, premium, oiUsd }` и одна строка:

```ts
import { registerVenue } from "./lib/venues";
registerVenue({ id: "kraken", fetch: fetchKraken });
```

Список питов: `GET /api/venues`.

## Стек

TanStack Start (Vite) · React 19 · TanStack Query · Recharts.

Ядро расчёта — [`src/lib/gravity.ts`](src/lib/gravity.ts). Площадки — [`src/lib/venues/`](src/lib/venues). Формулы изолированы от UI и от биржи.

```bash
npm test
npm run typecheck
npm run build
```

## Чего здесь нет

- Прогноза «куда пойдёт цена»
- TradingView / OpenMarket как источника
- Разбивки OI на лонги и шорты (биржа её не отдаёт в размере)
- Агрегации нескольких бирж — только OKX
