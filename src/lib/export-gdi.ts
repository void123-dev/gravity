import type { GravityPoint, GravitySnapshot } from "../gdi/types";

type Point = GravityPoint & { pits?: Record<string, number> };

export const EXPORT_API = "gdi-export" as const;
export const EXPORT_VERSION = "1.3" as const;

export type GdiExport = {
  api: typeof EXPORT_API;
  version: typeof EXPORT_VERSION;
  model: "GDI-1.3";
  fetchedAt: number;
  query: {
    symbol: string;
    interval: string;
    window: number;
    venue: string;
  };
  readme: {
    g: string;
    share: string;
    coupling: string;
    source: string;
  };
  snapshot: GravitySnapshot;
};

const README = {
  g: "G in [-1, +1]. Negative = spot discovers the print. Positive = perps.",
  share: "Influence share = 50 ± 50·G. Not turnover share.",
  coupling: "sync_up | sync_down | fight | spot_alone | perp_alone | quiet",
  source: "Venue id is live. demo is synthetic and must not be treated as tape.",
} as const;

export function packExport(snapshot: GravitySnapshot, fetchedAt = Date.now()): GdiExport {
  return {
    api: EXPORT_API,
    version: EXPORT_VERSION,
    model: snapshot.model,
    fetchedAt,
    query: {
      symbol: snapshot.symbol,
      interval: snapshot.interval,
      window: snapshot.window,
      venue: snapshot.venue,
    },
    readme: README,
    snapshot,
  };
}

export const EXPORT_SCHEMA = {
  api: EXPORT_API,
  version: EXPORT_VERSION,
  endpoints: {
    snapshot: "GET /api/gravity?symbol=BTC&interval=5m&window=48&venue=binance",
    exportJson: "GET /api/export?symbol=BTC&interval=5m&window=48&venue=binance&format=json",
    exportCsv: "GET /api/export?symbol=BTC&interval=5m&window=48&venue=binance&format=csv",
    venues: "GET /api/venues",
    schema: "GET /api/export?format=schema",
  },
  query: {
    symbol: ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB"],
    interval: ["1m", "5m", "15m", "1H", "4H"],
    window: [24, 48, 96],
    venue: ["binance", "bybit", "okx", "all"],
    format: ["json", "csv", "schema"],
  },
  snapshot: {
    g: "number [-1, 1]",
    spotShare: "50 * (1 - g)",
    perpShare: "50 * (1 + g)",
    coupling: README.coupling,
    series: "GravityPoint[] one row per bar",
    pits: "present when venue=all — independent pit G, not blended candles",
  },
  cors: true,
  auth: "none",
} as const;

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function pitKeys(series: Point[]): string[] {
  const keys = new Set<string>();
  for (const row of series) {
    if (!row.pits) continue;
    for (const k of Object.keys(row.pits)) keys.add(k);
  }
  return [...keys].sort();
}

export function snapshotToCsv(data: GravitySnapshot): string {
  const pits = pitKeys(data.series as Point[]);
  const header = [
    "t",
    "iso",
    "spot",
    "perp",
    "basisBps",
    "g",
    "spotShare",
    "perpShare",
    "spotPull",
    "perpPull",
    "netPull",
    "spotVol",
    "perpVol",
    "spotVolRel",
    "perpVolRel",
    ...pits.map((id) => `g_${id}`),
  ];
  const lines = [
    `# GDI-1.3 export`,
    `# symbol=${data.symbol} interval=${data.interval} window=${data.window} venue=${data.venue} source=${data.source}`,
    `# g=${data.g.toFixed(4)} coupling=${data.coupling} spotShare=${data.spotShare.toFixed(1)} perpShare=${data.perpShare.toFixed(1)}`,
    `# ${README.g}`,
    header.join(","),
  ];
  for (const row of data.series) {
    const cells = [
      row.t,
      new Date(row.t).toISOString(),
      row.spot,
      row.perp,
      row.basisBps,
      row.g,
      row.spotShare,
      row.perpShare,
      row.spotPull,
      row.perpPull,
      row.netPull,
      row.spotVol,
      row.perpVol,
      row.spotVolRel,
      row.perpVolRel,
      ...pits.map((id) => (row as Point).pits?.[id] ?? ""),
    ];
    lines.push(cells.map(csvEscape).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function exportFilename(data: GravitySnapshot, ext: "json" | "csv"): string {
  return `gdi-${data.symbol}-${data.interval}-${data.venue}-${data.window}.${ext}`;
}
