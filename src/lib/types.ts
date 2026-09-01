export type {
  Bar,
  CouplingId,
  GravityComponents,
  Interval,
  Leader,
  NetAgree,
  NetPull,
  PullDir,
  RegimeId,
  VenuePull,
  VenueVolume,
} from "../gdi/types.ts";
export { INTERVALS } from "../gdi/types.ts";
import type {
  CouplingId,
  GravityPoint as KernelPoint,
  GravitySnapshot as KernelSnapshot,
} from "../gdi/types.ts";

export const SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB"] as const;
export type SymbolCode = (typeof SYMBOLS)[number];

export const WINDOWS = [24, 48, 96] as const;
export type WindowSize = (typeof WINDOWS)[number];

// Left → right = typical BTC USD volume rank, not live G.
export const VENUES = ["binance", "bybit", "okx"] as const;
export type VenueId = (typeof VENUES)[number];
export const DEFAULT_VENUE: VenueId = VENUES[0];
export const PIT_ALL = "all" as const;
export type PitId = VenueId | typeof PIT_ALL;
export type DataSource = VenueId | "demo" | "consensus";

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

export type GravityPoint = KernelPoint & {
  pits?: Record<string, number>;
};

export type GravitySnapshot = Omit<KernelSnapshot, "symbol" | "venue" | "source" | "series"> & {
  symbol: SymbolCode;
  venue: PitId;
  source: DataSource;
  series: GravityPoint[];
  pits?: PitRow[];
  consensus?: ConsensusId;
  consensusLive?: number;
  consensusDemo?: number;
};
