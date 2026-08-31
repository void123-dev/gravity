import { intervalMs } from "../gravity";
import type { Interval, SymbolCode } from "../types";
import {
  alignBars,
  jsonGet,
  toMap,
  type Candle,
  type Feed,
  withTimeout,
} from "./shared";

const OKX = "https://www.okx.com";

type OkxCandle = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];
type TakerRow = [string, string, string];
type OiRow = [string, string, string, string];

function instIds(symbol: SymbolCode) {
  return { spot: `${symbol}-USDT`, swap: `${symbol}-USDT-SWAP`, ccy: symbol };
}

function auxPeriod(interval: Interval): "5m" | "1H" {
  return interval === "1H" || interval === "4H" ? "1H" : "5m";
}

async function okxGet<T>(path: string, signal: AbortSignal): Promise<T> {
  const json = await jsonGet<{ code?: string; msg?: string; data?: T }>(`${OKX}${path}`, signal);
  if (json.code && json.code !== "0") throw new Error(`OKX ${json.code}: ${json.msg ?? path}`);
  if (json.data === undefined) throw new Error(`OKX empty ${path}`);
  return json.data;
}

function parseCandles(raw: OkxCandle[]): Candle[] {
  return raw
    .map((c) => {
      const close = Number(c[4]);
      const volQuote = Number(c[7]);
      const volCcy = Number(c[6]);
      const volBase = Number(c[5]);
      const vol =
        Number.isFinite(volQuote) && volQuote > 0
          ? volQuote
          : Number.isFinite(volCcy) && volCcy > 0
            ? volCcy
            : Number.isFinite(volBase) && volBase > 0 && close > 0
              ? volBase * close
              : 0;
      return { t: Number(c[0]), close, vol };
    })
    .filter((c) => Number.isFinite(c.t) && c.close > 0)
    .sort((a, b) => a.t - b.t);
}

export async function fetchOkx(
  symbol: SymbolCode,
  interval: Interval,
  _window: number,
): Promise<Feed> {
  const { spot, swap, ccy } = instIds(symbol);
  const period = auxPeriod(interval);
  const limit = 180;
  const { signal, clear } = withTimeout(9000);
  try {
    const [spotRaw, perpRaw, oiRaw, spotTaker, perpTaker, fundingRaw, oiNow] = await Promise.all([
      okxGet<OkxCandle[]>(`/api/v5/market/candles?instId=${spot}&bar=${interval}&limit=${limit}`, signal),
      okxGet<OkxCandle[]>(`/api/v5/market/candles?instId=${swap}&bar=${interval}&limit=${limit}`, signal),
      okxGet<OiRow[]>(
        `/api/v5/rubik/stat/contracts/open-interest-history?instId=${swap}&period=${period}&limit=200`,
        signal,
      ).catch(() => [] as OiRow[]),
      okxGet<TakerRow[]>(
        `/api/v5/rubik/stat/taker-volume?ccy=${ccy}&instType=SPOT&period=${period}&limit=200`,
        signal,
      ).catch(() => [] as TakerRow[]),
      okxGet<TakerRow[]>(
        `/api/v5/rubik/stat/taker-volume?ccy=${ccy}&instType=CONTRACTS&period=${period}&limit=200`,
        signal,
      ).catch(() => [] as TakerRow[]),
      okxGet<{ fundingRate: string; premium: string }[]>(
        `/api/v5/public/funding-rate?instId=${swap}`,
        signal,
      ).catch(() => []),
      okxGet<{ oiUsd: string }[]>(`/api/v5/public/open-interest?instId=${swap}`, signal).catch(() => []),
    ]);

    const spotBars = parseCandles(spotRaw);
    const perpBars = parseCandles(perpRaw);
    const oiMap = toMap(
      oiRaw.map((r) => ({ t: Number(r[0]), oi: Number(r[3] || r[2] || r[1]) })),
      (r) => r.t,
    );
    const oiNum = new Map<number, number>();
    for (const [t, v] of oiMap) if (Number.isFinite(v.oi)) oiNum.set(t, v.oi);

    const sTaker = toMap(
      spotTaker.map((r) => ({ t: Number(r[0]), sell: Number(r[1]), buy: Number(r[2]) })),
      (r) => r.t,
    );
    const pTaker = toMap(
      perpTaker.map((r) => ({ t: Number(r[0]), sell: Number(r[1]), buy: Number(r[2]) })),
      (r) => r.t,
    );

    const ms = intervalMs(interval);
    const bars = alignBars(spotBars, perpBars, oiNum, ms, {
      spotTaker: sTaker,
      perpTaker: pTaker,
    }).map((b) => {
      const px = b.spot > 0 ? b.spot : 0;
      return {
        ...b,
        spotBuy: b.spotBuy && px ? b.spotBuy * px : b.spotBuy,
        spotSell: b.spotSell && px ? b.spotSell * px : b.spotSell,
      };
    });

    if (bars.length < 16) throw new Error("okx aligned series too short");
    const fund = fundingRaw[0];
    const oiUsd = oiNow[0]?.oiUsd ? Number(oiNow[0].oiUsd) : (bars[bars.length - 1]?.oi ?? null);
    return {
      bars,
      funding: fund ? Number(fund.fundingRate) : null,
      premium: fund ? Number(fund.premium) : null,
      oiUsd: oiUsd && Number.isFinite(oiUsd) ? oiUsd : null,
    };
  } finally {
    clear();
  }
}
