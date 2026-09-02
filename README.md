# GRAVITY

**Baseline 1.0 · GDI-1.3**

One price-discovery indicator: **who is setting the print** on the selected timeframe — spot or perpetuals.

GDI is a tape router, not a forecast. Negative G → read spot. Positive G → read perps. Always computed **inside one exchange** (pit). **Market** mode is the median live-G and a 2-of-3 majority, not blended candles. Demo pits do not vote.

The predictor was removed (walk-forward ~46%). **One repository, one indicator.** A new indicator is a new repo; compose later via snapshots (`GravitySnapshot`), without mixing weights into G.

Changes land on `main` only through a PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

English only: repo docs, comments, commits, UI.

## What it shows

| Block | Meaning |
| --- | --- |
| **G** ∈ [−1, +1] | Who discovers price. Influence share = `50 ± 50·G` |
| Spot / perp vectors | Direction and force of each book |
| Coupling | In sync, fighting, or one side leading — terminal headline |
| Resultant vector | Sum of vectors + last-bar price check |
| Volume | USDT notional vs **activity** (each market vs its own average) |
| Taker buy/sell | Who lifts the book. On perps this is not longs vs shorts |
| Pits | Binance → Bybit → OKX (typical BTC volume, not live G) |
| Market | Pit consensus |

GDI-1.3 weights: lead-lag 27% · Δ basis 26% · taker 22% · OI 13% · equalized activity 12%. Raw perp notional (~90%) never enters G. Confidence follows |G| and component agreement, not glued-tape correlation.

Data: public market of the selected pit. No API keys. Refresh every 15s. Unavailable venues fall back to a labeled demo feed. Default pit is Binance.

## Run

```bash
npm install
npm run dev
```

API for third-party apps: **[docs/API.md](docs/API.md)** (endpoints, query catalog, snapshot fields, curl / JS / Python).

```
GET /api/gravity?symbol=BTC&interval=5m&window=48&venue=binance
GET /api/export?symbol=BTC&interval=5m&window=48&venue=okx&format=json
GET /api/export?format=schema
GET /api/venues
```
New exchange — adapter `fetch(symbol, interval, window) → { bars, funding, premium, oiUsd }`:

```ts
import { registerVenue } from "./lib/venues";
registerVenue({ id: "kraken", fetch: fetchKraken });
```

## Stack

TanStack Start (Vite) · React 19 · TanStack Query · Recharts.

Core: [`src/gdi/`](src/gdi) (`computeGravity`). Host venues: [`src/lib/venues/`](src/lib/venues). Formulas stay isolated from UI and from the exchange. Port Java/.NET by copying `src/gdi/` only.

```bash
npm test
npm run typecheck
npm run build
```

## Out of scope

- A second indicator in this repository
- Next-bar forecasts
- Blending candles from several exchanges into one G
- TradingView / OpenMarket as a data source (GDI only says which tape to read there)
- Splitting OI into longs and shorts
- RSI, L2 book, social signals
