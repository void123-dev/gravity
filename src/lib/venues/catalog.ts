export type VenuePitInfo = {
  id: string;
  label: string;
  source: "live" | "demo";
  volumeUsd: number;
};

export type VenueCatalog = {
  pits: VenuePitInfo[];
  default: { venue: string; interval: "5m"; window: 48 };
  consensus: "all";
  note: string;
};

export const CATALOG_NOTE =
  "Sorted live first, then volumeUsd desc. Default is first live pit, not largest volume.";

export function pitLabel(id: string): string {
  if (id === "okx") return "OKX";
  if (id === "binance") return "Binance";
  if (id === "bybit") return "Bybit";
  return id.toUpperCase();
}

export function sortVenuePits(pits: VenuePitInfo[]): VenuePitInfo[] {
  return [...pits].sort((a, b) => {
    const al = a.source === "live" ? 0 : 1;
    const bl = b.source === "live" ? 0 : 1;
    if (al !== bl) return al - bl;
    if (b.volumeUsd !== a.volumeUsd) return b.volumeUsd - a.volumeUsd;
    return a.id.localeCompare(b.id);
  });
}

export function pickDefaultVenue(pits: VenuePitInfo[]): string {
  const sorted = sortVenuePits(pits);
  const live = sorted.find((p) => p.source === "live");
  if (live) return live.id;
  return sorted[0]?.id ?? "okx";
}

export function buildVenueCatalog(pits: VenuePitInfo[]): VenueCatalog {
  const sorted = sortVenuePits(pits);
  return {
    pits: sorted,
    default: { venue: pickDefaultVenue(sorted), interval: "5m", window: 48 },
    consensus: "all",
    note: CATALOG_NOTE,
  };
}
