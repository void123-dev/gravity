import { INTERVALS, SYMBOLS, WINDOWS, type Interval, type PitId, type SymbolCode } from "./types";
import { parseVenue } from "./venues";

export type GravityQuery = {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
  venue?: PitId;
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
  const venueRaw = url.searchParams.get("venue");
  const venue =
    venueRaw == null || venueRaw === "" ? undefined : parseVenue(venueRaw);
  return { symbol, interval, window, venue };
}