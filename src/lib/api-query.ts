import { INTERVALS, SYMBOLS, WINDOWS, type Interval, type SymbolCode } from "./types";
import { parseVenue } from "./venues";

export type GravityQuery = {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
  venue: ReturnType<typeof parseVenue>;
};

export function parseGravityQuery(url: URL): GravityQuery {
  const symbolRaw = (url.searchParams.get("symbol") ?? "BTC").toUpperCase();
  const intervalRaw = url.searchParams.get("interval") ?? "5m";
  const windowRaw = Number(url.searchParams.get("window") ?? 48);
  const symbol = (SYMBOLS as readonly string[]).includes(symbolRaw)
    ? (symbolRaw as SymbolCode)
    : "BTC";
  const interval = (INTERVALS as readonly string[]).includes(intervalRaw)
    ? (intervalRaw as Interval)
    : "5m";
  const window = (WINDOWS as readonly number[]).includes(windowRaw) ? windowRaw : 48;
  return { symbol, interval, window, venue: parseVenue(url.searchParams.get("venue")) };
}

export function gravityQueryString(q: GravityQuery): string {
  const p = new URLSearchParams({
    symbol: q.symbol,
    interval: q.interval,
    window: String(q.window),
    venue: q.venue,
  });
  return p.toString();
}
