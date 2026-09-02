# GDI HTTP API

Integrate GRAVITY as a **read-only snapshot**. There is no API key. CORS is `*`.

GDI answers one question on one pit and one timeframe: **who is discovering price — spot or perps.** It is not a forecast and not a second indicator.

Live machine-readable map: `GET /api/export?format=schema`

Replace `ORIGIN` with the host that serves this app (local `http://localhost:8080` or the deployed preview).

## 5-minute integrate

```bash
curl -sS "$ORIGIN/api/export?symbol=BTC&interval=5m&window=48&venue=okx&format=json"
```

```js
const url = new URL("/api/export", ORIGIN);
url.searchParams.set("symbol", "BTC");
url.searchParams.set("interval", "5m");
url.searchParams.set("window", "48");
url.searchParams.set("venue", "okx");
url.searchParams.set("format", "json");

const res = await fetch(url);
const pack = await res.json();
if (pack.snapshot.source === "demo") {
  // synthetic fallback — do not trade or chart this as tape
}
const { g, coupling, spotShare, perpShare } = pack.snapshot;
// g < 0 → read spot tape; g > 0 → read perp tape
```

```python
import requests

r = requests.get(
    f"{ORIGIN}/api/export",
    params={
        "symbol": "BTC",
        "interval": "5m",
        "window": 48,
        "venue": "okx",
        "format": "json",
    },
    timeout=15,
)
r.raise_for_status()
pack = r.json()
snap = pack["snapshot"]
print(snap["g"], snap["coupling"], snap["source"])
```

Poll every **15 seconds**. Faster does not create new bars; the server caches ~12s.

## Endpoints

| Method | Path | Use |
| --- | --- | --- |
| GET | `/api/export` | **Preferred for third parties.** Envelope + snapshot, or CSV, or schema |
| GET | `/api/gravity` | Raw `GravitySnapshot` (what the UI polls) |
| GET | `/api/venues` | Listed pits + pointer to export |
| OPTIONS | same paths | CORS preflight |

All GET responses include:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

No cookies, no `Authorization` header.

## Query parameters

Same catalog on `/api/export` and `/api/gravity`. Unknown keys are ignored. Invalid values fall back to the default — they do **not** error.

| Name | Default | Allowed | Effect on G |
| --- | --- | --- | --- |
| `symbol` | `BTC` | `BTC` `ETH` `SOL` `XRP` `DOGE` `BNB` | Which asset’s spot+perp books |
| `interval` | `5m` | `1m` `5m` `15m` `1H` `4H` | Bar size |
| `window` | `48` | `24` `48` `96` | How many bars enter `computeGravity` |
| `venue` | `binance` | `binance` `bybit` `okx` `all` | One pit, or consensus of pits |
| `format` | `json` | `json` `csv` `schema` | Export only |
| `download` | off | `1` | Export JSON as a file (`Content-Disposition`) |

`3m`, `window=30`, `venue=kraken` are not accepted. They silently become `5m` / `48` / `binance` unless that venue was registered on the host.

## `format=json` envelope

```json
{
  "api": "gdi-export",
  "version": "1.3",
  "model": "GDI-1.3",
  "fetchedAt": 1788250000000,
  "query": { "symbol": "BTC", "interval": "5m", "window": 48, "venue": "okx" },
  "readme": {
    "g": "G in [-1, +1]. Negative = spot discovers the print. Positive = perps.",
    "share": "Influence share = 50 ± 50·G. Not turnover share.",
    "coupling": "sync_up | sync_down | fight | spot_alone | perp_alone | quiet",
    "source": "Venue id is live. demo is synthetic and must not be treated as tape."
  },
  "snapshot": {}
}
```

`/api/gravity` returns only `snapshot` (no envelope). Prefer `/api/export` so you can pin `api` + `version`.

## Snapshot fields

Times are Unix **milliseconds**. Prices are quote of that pit (usually USDT).

### Identity

| Field | Meaning |
| --- | --- |
| `model` | Always `GDI-1.3` |
| `symbol` `interval` `window` `venue` | Echo of the query (after defaults) |
| `source` | `okx` / `binance` / `bybit` = live pit. `demo` = RNG fallback. `consensus` = Market mode |
| `asOf` | Timestamp of the last bar used |

**If `source === "demo"`, discard or flag the row.** Geo-blocks on Binance/Bybit produce demo even when the UI tab exists.

### Core readout

| Field | Meaning |
| --- | --- |
| `g` | `[-1, +1]`. Negative → spot discovers. Positive → perps |
| `spotShare` `perpShare` | `50 ± 50·G`. Not volume share |
| `confidence` | `0–1`. Strength of *who leads*, not “price will go up” |
| `coupling` | How the two books pull together |
| `couplingScore` | Signed sync vs fight |
| `lag.leader` | `spot` `perp` `tied` on tick lead-lag |
| `lag.bars` | Lead in bars |
| `regime` | Short label (`spot_bid`, `lev_rally`, `coupled`, …) — secondary to `coupling` |

`coupling` values:

- `sync_up` / `sync_down` — both books pull the same way
- `fight` — opposite pull
- `spot_alone` / `perp_alone` — only one side has a vector
- `quiet` — no vector

### Price and basis

| Field | Meaning |
| --- | --- |
| `spot` `perp` | Last print |
| `basisBps` | `(perp/spot − 1) × 10_000` |
| `funding` `premium` `oiUsd` `oiDeltaPct` | Pit extras; `null` if the adapter has no feed |
| `priceChangePct` | Mid move over the window |
| `prevPx` `barRetPct` | Last completed spot bar vs prior bar |

### Vectors and volume

| Field | Meaning |
| --- | --- |
| `spotPull` `perpPull` | `{ dir, score, retPct, flow, buy, sell }` |
| `netPull` | Sum of scores + whether it matched `barRetPct` (`hit` `miss` `weak`) |
| `spotVol` `perpVol` | Notional vs **activity** (`eqShare` is what feeds G) |
| `components` | `{ lead, basis, flow, oi, vol }` — signed blocks that built `g` |

`dir` is `up` `down` `flat`. `flow` is taker imbalance, not open longs/shorts.

### Series

`series[]` — one object per bar in the computed window:

`t, spot, perp, basisBps, g, spotShare, perpShare, spotPull, perpPull, netPull, spotVol, perpVol, spotVolRel, perpVolRel`

In Market mode (`venue=all`) a point may also have `pits: { binance: 0.12, okx: -0.08, … }` — **each G is independent**. Candles are never blended.

Market snapshot extras: `pits[]`, `consensus` (`agree_spot` `agree_perp` `split` `quiet`), `consensusLive`, `consensusDemo`. Demo pits do not vote. Need ≥2 live pits for a live majority.

## `format=csv`

Attachment. Header comments then rows:

```
# GDI-1.3 export
# symbol=BTC interval=5m window=48 venue=okx source=okx
# g=-0.2100 coupling=sync_down spotShare=60.5 perpShare=39.5
t,iso,spot,perp,basisBps,g,spotShare,perpShare,spotPull,perpPull,netPull,spotVol,perpVol,spotVolRel,perpVolRel
```

Market mode adds `g_binance`, `g_bybit`, `g_okx` when those series exist.

```bash
curl -sS -o gdi.csv "$ORIGIN/api/export?symbol=BTC&interval=5m&venue=okx&format=csv"
```

## How to wire it

1. Call `/api/venues` once. Note which pits exist.
2. Pick `symbol`, `interval`, `window`, `venue`.
3. GET `/api/export?format=json`.
4. Drop the payload if `snapshot.source === "demo"` (or show a warning).
5. Route your own UI:
   - `g < 0` → your **spot** tools
   - `g > 0` → your **perp** tools
   - `coupling === "fight"` → do not treat books as one tape
6. Repeat on a 15s timer. Keep the last good **live** snapshot if a poll returns demo.

### Suggested TypeScript type

```ts
type GdiExport = {
  api: "gdi-export";
  version: "1.3";
  model: "GDI-1.3";
  fetchedAt: number;
  query: { symbol: string; interval: string; window: number; venue: string };
  snapshot: {
    source: string;
    g: number;
    spotShare: number;
    perpShare: number;
    coupling: string;
    series: Array<{ t: number; g: number; spot: number; perp: number }>;
  };
};
```

Full field list: [`src/gdi/types.ts`](../src/gdi/types.ts).

## Errors and limits

| Situation | What you get |
| --- | --- |
| Bad query value | `200` with defaults applied |
| Pit HTTP failure | `200` + `source: "demo"` |
| OPTIONS | `204` |
| Write / POST | not supported |

Do not POST candles. Do not send API keys. This host only reads public exchange market data.

## Not in this API

- Custom GDI weights
- Arbitrary timeframes (`3m`) or windows (`30`)
- Historical “G as of yesterday 14:00”
- Next-bar prediction
- Blended multi-exchange candles
- Auth, webhooks, streaming WebSocket

To run the same formula on another stack, copy [`src/gdi/`](../src/gdi) and feed it `Bar[]`. The HTTP export is only a serializer around that snapshot.
