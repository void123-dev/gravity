/** GDI-1.3 kernel types. No exchange ids, no UI. */

export const INTERVALS = ["1m", "5m", "15m", "1H", "4H"] as const;
export type Interval = (typeof INTERVALS)[number];

export type Leader = "spot" | "perp" | "tied";
export type PullDir = "up" | "down" | "flat";

export type CouplingId =
  | "sync_up"
  | "sync_down"
  | "fight"
  | "spot_alone"
  | "perp_alone"
  | "quiet";

export type RegimeId =
  | "lev_rally"
  | "short_squeeze"
  | "short_dump"
  | "long_liq"
  | "spot_bid"
  | "spot_offer"
  | "coupled";

export type NetAgree = "hit" | "miss" | "weak";

/** One aligned timestamp: spot + perp on the same pit. */
export type Bar = {
  t: number;
  spot: number;
  perp: number;
  spotVol: number;
  perpVol: number;
  oi?: number;
  spotBuy?: number;
  spotSell?: number;
  perpBuy?: number;
  perpSell?: number;
};

export type VenuePull = {
  dir: PullDir;
  score: number;
  retPct: number;
  flow: number;
  buy: number;
  sell: number;
};

export type VenueVolume = {
  total: number;
  last: number;
  avg: number;
  deltaPct: number;
  share: number;
  eqShare: number;
};

export type NetPull = {
  score: number;
  dir: PullDir;
  agree: NetAgree;
};

export type GravityPoint = {
  t: number;
  spot: number;
  perp: number;
  basisBps: number;
  g: number;
  spotShare: number;
  perpShare: number;
  spotPull: number;
  perpPull: number;
  netPull: number;
  spotVol: number;
  perpVol: number;
  spotVolRel: number;
  perpVolRel: number;
};

export type GravityComponents = {
  lead: number;
  basis: number;
  flow: number;
  oi: number;
  vol: number;
};

export type GravitySnapshot = {
  model: "GDI-1.3";
  symbol: string;
  interval: Interval;
  window: number;
  venue: string;
  source: string;
  asOf: number;
  spot: number;
  perp: number;
  basisBps: number;
  funding: number | null;
  premium: number | null;
  oiUsd: number | null;
  oiDeltaPct: number | null;
  g: number;
  spotShare: number;
  perpShare: number;
  confidence: number;
  lag: { leader: Leader; bars: number };
  components: GravityComponents;
  regime: RegimeId;
  priceChangePct: number;
  spotPull: VenuePull;
  perpPull: VenuePull;
  coupling: CouplingId;
  couplingScore: number;
  netPull: NetPull;
  prevPx: number;
  barRetPct: number;
  spotVol: VenueVolume;
  perpVol: VenueVolume;
  series: GravityPoint[];
};

export type ComputeGravityInput = {
  bars: Bar[];
  window: number;
  interval: Interval;
  symbol?: string;
  venue?: string;
  source?: string;
  funding?: number | null;
  premium?: number | null;
  oiUsd?: number | null;
};
