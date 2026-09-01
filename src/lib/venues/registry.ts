import type { VenueId } from "../types";
import { VENUES } from "../types";
import { fetchBinance } from "./binance";
import { fetchBybit } from "./bybit";
import { fetchOkx } from "./okx";
import type { Adapter } from "./shared";

/**
 * Plug-in API: add a pit by calling registerVenue({ id, fetch }).
 * Built-in adapters live here. New exchange = new file + one registerVenue line
 * (or a call at server boot). UI labels fall back to the id if copy has no name.
 */
export type VenuePlugin = {
  id: string;
  fetch: Adapter;
};

const adapters: Record<string, Adapter> = {
  binance: fetchBinance,
  bybit: fetchBybit,
  okx: fetchOkx,
};

const extra: string[] = [];

export function registerVenue(plugin: VenuePlugin): void {
  const id = plugin.id.trim().toLowerCase();
  if (!id || id === "all" || id === "demo" || id === "consensus") {
    throw new Error(`reserved pit id: ${plugin.id}`);
  }
  adapters[id] = plugin.fetch;
  if (!(VENUES as readonly string[]).includes(id) && !extra.includes(id)) extra.push(id);
}

export function getAdapter(id: string): Adapter | undefined {
  return adapters[id];
}

export function listVenueIds(): VenueId[] {
  return [...VENUES, ...(extra as VenueId[])];
}

export function listVenuePlugins(): { id: string }[] {
  return Object.keys(adapters).map((id) => ({ id }));
}
