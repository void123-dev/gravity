# GDI-1.3 kernel

Portable price-discovery core: **who is setting the print on one pit — spot or perps.**

No React, no HTTP, no exchange ids. Input is aligned `Bar[]`. Output is `GravitySnapshot`.

## Files

| File | Role |
| --- | --- |
| `types.ts` | `Bar`, snapshot, interval union |
| `math.ts` | `clamp`, `fin` |
| `compute.ts` | `computeGravity`, `intervalMs` |

Weights (do not change in a port): lead-lag 27% · Δ basis 26% · taker 22% · OI 13% · equalized activity 12%.

## Port (Java / .NET / kScript)

1. Copy this folder.
2. Feed `Bar[]` from your host (spot + perp on the **same** book).
3. Call `computeGravity`. Compare against `src/lib/gravity.test.ts` fixtures.

Do not import `src/lib/utils.ts`, venues, or UI. Venue names (`binance`, …) are host metadata, not inputs to G.

kScript: rewrite the loops; you still need a spot series and a perp series on one timeframe. OI and taker are optional bars fields — without them those blocks go to 0.

Host HTTP export (`/api/export`) is not this folder. It only serializes `GravitySnapshot`.

## Contract

```
computeGravity({ bars, window, interval, symbol?, venue?, source?, funding?, premium?, oiUsd? })
  → GravitySnapshot
```

`G ∈ [-1, +1]`. Negative = spot discovers. Positive = perps. Influence share = `50 ± 50·G`.
