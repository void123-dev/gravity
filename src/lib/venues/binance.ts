import { intervalMs } from "../gravity";
import type { Interval, SymbolCode } from "../types";
import {
  alignBars,
  firstJson,
  jsonGet,
  toMap,
  type Candle,
  type Feed,
  withTimeout,
} from "./shared";

type Kline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

function bar(interval: Interval): string {
  if (interval === "1H") return "1h";
  if (interval === "4H") return "4h";
  return interval;
}

function oiPeriod(interval: Interval): string {
  if (interval === "1m") return "5m";
  if (interval === "1H") return "1h";
  if (interval === "4H") return "4h";
  return interval;
}

function parseKlines(raw: Kline[]): Candle[] {
  return raw
    .map((c) => {
      const close = Number(c[4]);
      const quote = Number(c[7]);
      const takerBuy = Number(c[10]);
      const buy = Number.isFinite(takerBuy) && takerBuy > 0 ? takerBuy : undefined;
      const sell =
        buy !== undefined && Number.isFinite(quote) && quote >= buy ? quote - buy : undefined;
      return {
        t: Number(c[0]),
        close,
        vol: Number.isFinite(quote) && quote > 0 ? quote : 0,
        buy,
        sell,
      };
    })
    .filter((c) => Number.isFinite(c.t) && c.close > 0)
    .sort((a, b) => a.t - b.t);
}

export async function fetchBinance(
  symbol: SymbolCode,
  interval: Interval,
  _window: number,
): Promise<Feed> {
  const pair = `${symbol}USDT`;
  const iv = bar(interval);
  const period = oiPeriod(interval);
  const limit = 180;
  const { signal, clear } = withTimeout(9000);
  try {
    const [spotRaw, perpRaw, premium, oiRaw, takerRaw] = await Promise.all([
      firstJson<Kline[]>(
        [
          `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${iv}&limit=${limit}`,
          `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=${iv}&limit=${limit}`,
        ],
        signal,
      ),
      jsonGet<Kline[]>(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${pair}&interval=${iv}&limit=${limit}`,
        signal,
      ),
      jsonGet<{ lastFundingRate?: string; markPrice?: string; indexPrice?: string }>(
        `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${pair}`,
        signal,
      ).catch(() => ({ lastFundingRate: undefined, markPrice: undefined, indexPrice: undefined })),
      jsonGet<{ timestamp: number; sumOpenInterestValue: string }[]>(
        `https://fapi.binance.com/futures/data/openInterestHist?symbol=${pair}&period=${period}&limit=200`,
        signal,
      ).catch(() => []),
      jsonGet<{ timestamp: number; buyVol: string; sellVol: string }[]>(
        `https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${pair}&period=${period}&limit=200`,
        signal,
      ).catch(() => []),
    ]);

    const spot = parseKlines(spotRaw);
    const perp = parseKlines(perpRaw);
    const oi = new Map<number, number>();
    for (const row of oiRaw) {
      const v = Number(row.sumOpenInterestValue);
      if (Number.isFinite(row.timestamp) && Number.isFinite(v)) oi.set(row.timestamp, v);
    }
    const perpTaker = toMap(
      takerRaw.map((r) => ({
        t: Number(r.timestamp),
        buy: Number(r.buyVol),
        sell: Number(r.sellVol),
      })),
      (r) => r.t,
    );
    const bars = alignBars(spot, perp, oi, intervalMs(interval), { perpTaker });
    if (bars.length < 16) throw new Error("binance aligned series too short");
    const mark = Number(premium.markPrice);
    const index = Number(premium.indexPrice);
    const last = bars[bars.length - 1];
    return {
      bars,
      funding: premium.lastFundingRate != null ? Number(premium.lastFundingRate) : null,
      premium: index > 0 && Number.isFinite(mark) ? (mark - index) / index : last ? (last.perp - last.spot) / last.spot : null,
      oiUsd: last?.oi ?? null,
    };
  } finally {
    clear();
  }
}
