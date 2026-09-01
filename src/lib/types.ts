export const SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB"] as const;
export type SymbolCode = (typeof SYMBOLS)[number];

export const INTERVALS = ["1m", "5m", "15m", "1H", "4H"] as const;
export type Interval = (typeof INTERVALS)[number];

export const WINDOWS = [24, 48, 96] as const;
export type WindowSize = (typeof WINDOWS)[number];

// Left → right = typical BTC USD volume rank, not live G.
export const VENUES = ["binance", "bybit", "okx"] as const;
export type VenueId = (typeof VENUES)[number];
export const DEFAULT_VENUE: VenueId = VENUES[0];
export const PIT_ALL = "all" as const;
export type PitId = VenueId | typeof PIT_ALL;
export type DataSource = VenueId | "demo" | "consensus";

export type Leader = "spot" | "perp" | "tied";

export type PullDir = "up" | "down" | "flat";

export type CouplingId =
  | "sync_up"
  | "sync_down"
  | "fight"
  | "spot_alone"
  | "perp_alone"
  | "quiet";

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

export type RegimeId =
  | "lev_rally"
  | "short_squeeze"
  | "short_dump"
  | "long_liq"
  | "spot_bid"
  | "spot_offer"
  | "coupled";

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

export type NetAgree = "hit" | "miss" | "weak";

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
  pits?: Record<string, number>;
};

export type GravityComponents = {
  lead: number;
  basis: number;
  flow: number;
  oi: number;
  vol: number;
};

export type ConsensusId = "agree_spot" | "agree_perp" | "split" | "quiet";

export type PitRow = {
  venue: VenueId;
  source: DataSource;
  g: number;
  spotShare: number;
  perpShare: number;
  coupling: CouplingId;
  spotPull: number;
  perpPull: number;
  confidence: number;
  spot: number;
};

export type GravitySnapshot = {
  model: "GDI-1.3";
  symbol: SymbolCode;
  interval: Interval;
  window: number;
  venue: PitId;
  source: DataSource;
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
  pits?: PitRow[];
  consensus?: ConsensusId;
  consensusLive?: number;
  consensusDemo?: number;
};
