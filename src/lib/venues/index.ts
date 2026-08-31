import { computeGravity } from "../gravity";
import type { GravitySnapshot, Interval, SymbolCode, VenueId } from "../types";
import { fetchBinance } from "./binance";
import { fetchBybit } from "./bybit";
import { buildDemo } from "./demo";
import { fetchOkx } from "./okx";
import { parseVenue, type Adapter } from "./shared";

const TTL_MS = 12_000;
const cache = new Map<string, { at: number; data: GravitySnapshot }>();

const ADAPTERS: Record<VenueId, Adapter> = {
  okx: fetchOkx,
  binance: fetchBinance,
  bybit: fetchBybit,
};

export { parseVenue };

export async function loadGravity(input: {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
  venue?: VenueId | string;
}): Promise<GravitySnapshot> {
  const venue = parseVenue(input.venue);
  const key = `${venue}:${input.symbol}:${input.interval}:${input.window}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  try {
    const feed = await ADAPTERS[venue](input.symbol, input.interval, input.window);
    const data = computeGravity({
      bars: feed.bars,
      window: input.window,
      symbol: input.symbol,
      interval: input.interval,
      venue,
      source: venue,
      funding: feed.funding,
      premium: feed.premium,
      oiUsd: feed.oiUsd,
    });
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    const data = buildDemo(venue, input.symbol, input.interval, input.window);
    cache.set(key, { at: Date.now(), data });
    return data;
  }
}
