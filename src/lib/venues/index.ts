import { computeGravity } from "../gravity";
import { DEFAULT_VENUE, type GravitySnapshot, type Interval, type PitId, type SymbolCode, type VenueId } from "../types";
import { buildConsensus } from "./consensus";
import { buildDemo } from "./demo";
import { getAdapter, listVenueIds, listVenuePlugins, registerVenue } from "./registry";
import { parseVenue as parseKnown } from "./shared";

export { registerVenue, listVenueIds, listVenuePlugins };
export { decideConsensus } from "./consensus";

const TTL_MS = 12_000;
const cache = new Map<string, { at: number; data: GravitySnapshot }>();

export function parseVenue(raw: unknown): PitId {
  const v = String(raw ?? DEFAULT_VENUE).toLowerCase();
  if (v === "all" || v === "consensus" || v === "market") return "all";
  if (getAdapter(v)) return v as VenueId;
  return parseKnown(raw);
}

async function loadPit(input: {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
  venue: VenueId;
}): Promise<GravitySnapshot> {
  const key = `${input.venue}:${input.symbol}:${input.interval}:${input.window}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const fetch = getAdapter(input.venue);
  try {
    if (!fetch) throw new Error(`no adapter ${input.venue}`);
    const feed = await fetch(input.symbol, input.interval, input.window);
    const data = computeGravity({
      bars: feed.bars,
      window: input.window,
      symbol: input.symbol,
      interval: input.interval,
      venue: input.venue,
      source: input.venue,
      funding: feed.funding,
      premium: feed.premium,
      oiUsd: feed.oiUsd,
    }) as GravitySnapshot;
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    const data = buildDemo(input.venue, input.symbol, input.interval, input.window);
    cache.set(key, { at: Date.now(), data });
    return data;
  }
}

async function loadBoard(input: {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
}): Promise<GravitySnapshot> {
  const key = `all:${input.symbol}:${input.interval}:${input.window}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const ids = listVenueIds();
  const snaps = await Promise.all(
    ids.map((venue) => loadPit({ ...input, venue })),
  );
  const data = buildConsensus(snaps);
  cache.set(key, { at: Date.now(), data });
  return data;
}

export async function loadGravity(input: {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
  venue?: PitId | string;
}): Promise<GravitySnapshot> {
  const venue = parseVenue(input.venue);
  if (venue === "all") return loadBoard(input);
  return loadPit({ ...input, venue });
}
