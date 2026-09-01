import { intervalMs } from "./gravity";
import type {
  ConsensusId,
  CouplingId,
  DataSource,
  GravitySnapshot,
  Interval,
  NetAgree,
  PitId,
  PullDir,
  RegimeId,
} from "./types";
import { DEFAULT_VENUE } from "./types";
import { formatPct, formatUsdCompact } from "./utils";

const REGIME: Record<RegimeId, string> = {
  lev_rally: "Leverage-driven rally",
  short_squeeze: "Short squeeze",
  short_dump: "Short-led selloff",
  long_liq: "Long liquidation",
  spot_bid: "Spot demand",
  spot_offer: "Spot distribution",
  coupled: "Markets coupled",
};

const COUPLING: Record<CouplingId, string> = {
  sync_up: "In sync upward",
  sync_down: "In sync downward",
  fight: "Fighting",
  spot_alone: "Spot pulling alone",
  perp_alone: "Perps pulling alone",
  quiet: "No vector",
};

const COUPLING_SHORT: Record<CouplingId, string> = {
  sync_up: "sync ↑",
  sync_down: "sync ↓",
  fight: "fight",
  spot_alone: "spot",
  perp_alone: "perps",
  quiet: "quiet",
};

const DIR: Record<PullDir, string> = {
  up: "up",
  down: "down",
  flat: "flat",
};

export const ui = {
  product: "GRAVITY",
  tag: "Spot–Perp Discovery",
  sub: "Who is pulling price, and which way — spot or perps.",
  spot: "Spot",
  perp: "Perps",
  leadingNow: "Leading now",
  window: "Window",
  interval: "Timeframe",
  tfScan: "All timeframes",
  live: "live",
  demo: "Demo feed",
  pits: "Pits",
  pitsHint: "Left = typically larger BTC volume. GDI still compares spot vs perps on one pit.",
  pitOkx: "OKX",
  pitBinance: "Binance",
  pitBybit: "Bybit",
  pitOkxBooks: "USDT spot · swap",
  pitBinanceBooks: "USDT spot · USD-M",
  pitBybitBooks: "USDT spot · linear",
  pitAll: "Market",
  pitAllBooks: "pit consensus",
  consensus: "Consensus",
  consensusLive: "live pits",
  agreeSpot: "Pits agree: spot",
  agreePerp: "Pits agree: perps",
  pitsSplit: "Pits disagree",
  pitsQuiet: "No majority",
  pitsChart: "G by pit",
  medianG: "median G",
  confidence: "Confidence",
  basis: "Basis",
  funding: "Funding",
  oi: "Open interest",
  oiDelta: "Δ OI",
  price: "Price",
  components: "Index contributions",
  lead: "Lead-lag",
  basisComp: "Basis",
  flow: "Aggression",
  oiComp: "OI impulse",
  volComp: "Volume",
  method: "GDI-1.3 method",
  hideMethod: "Hide method",
  lagSpot: "Spot lags by",
  lagPerp: "Perps lag by",
  lagTied: "No clear lag",
  bars: "bars",
  share: "influence share",
  ribbon: "Who led the bar",
  gIndex: "Gravity",
  refresh: "Refresh 15s",
  loading: "Measuring market gravity…",
  error: "Could not compute the index. Retrying.",
  retry: "Retry",
  syncing: "Syncing…",
  syncFresh: "Just synced",
  syncIn: "Next update in",
  vectors: "Pull vectors",
  pullRibbon: "Direction by bar",
  sync: "In sync",
  fight: "Fighting",
  force: "force",
  takerBuy: "taker buying",
  takerSell: "taker selling",
  takerMixed: "mixed flow",
  takerFlow: "taker flow",
  takerNone: "no flow data",
  takerNoteSpot: "taker in USDT over the window, not order count",
  takerNotePerp: "taker buy/sell, not open longs vs shorts",
  volume: "Volume",
  volWindow: "Volume over window",
  volVsAvg: "vs average",
  volShare: "activity share",
  volNotional: "notional",
  volEq: "activity",
  volChart: "Volume vs own average",
  volLast: "last bar",
  netVector: "Resultant vector",
  netSum: "spot + perps",
  priceAgo: "ago",
  priceNow: "now",
  barMove: "bar move",
  agreeHit: "Vector matched price",
  agreeMiss: "Vector and price diverged",
  agreeWeak: "Net is weak — bar has no clear print",
} as const;

export function regimeLabel(id: RegimeId): string {
  return REGIME[id];
}

export function couplingLabel(id: CouplingId): string {
  return COUPLING[id];
}

export function pullDirLabel(dir: PullDir): string {
  return DIR[dir];
}

export function agreeLabel(id: NetAgree): string {
  if (id === "hit") return ui.agreeHit;
  if (id === "miss") return ui.agreeMiss;
  return ui.agreeWeak;
}

export function venueLabel(id: PitId | undefined): string {
  if (id === "all") return ui.pitAll;
  if (id === "binance") return ui.pitBinance;
  if (id === "bybit") return ui.pitBybit;
  if (id === "okx") return ui.pitOkx;
  return String(id).toUpperCase();
}

export function venueBooks(id: PitId): string {
  if (id === "all") return ui.pitAllBooks;
  if (id === "binance") return ui.pitBinanceBooks;
  if (id === "bybit") return ui.pitBybitBooks;
  if (id === "okx") return ui.pitOkxBooks;
  return id;
}

export function sourceLabel(source: DataSource | undefined, venue?: PitId): string {
  if (source === "consensus" || venue === "all") return ui.consensus;
  const name = venueLabel(venue ?? (source === "demo" || !source ? DEFAULT_VENUE : source));
  if (!source || source === "demo") return `${ui.demo} · ${name}`;
  return `${name} ${ui.live}`;
}

export function consensusLabel(id: ConsensusId | undefined): string {
  if (id === "agree_spot") return ui.agreeSpot;
  if (id === "agree_perp") return ui.agreePerp;
  if (id === "split") return ui.pitsSplit;
  return ui.pitsQuiet;
}

export function flowHint(flow: number): string {
  if (Math.abs(flow) < 0.04) return ui.takerMixed;
  return flow > 0 ? ui.takerBuy : ui.takerSell;
}

function formatDuration(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = m / 60;
  if (h < 24) {
    const v = Number.isInteger(h) ? h.toFixed(0) : h.toFixed(1);
    return `${v}h`;
  }
  const d = h / 24;
  const v = Number.isInteger(d) ? d.toFixed(0) : d.toFixed(1);
  return `${v}d`;
}

export function couplingShort(id: CouplingId): string {
  return COUPLING_SHORT[id];
}

export function windowChipLabel(window: number): string {
  return `${window} bars`;
}

export function tfShort(interval: Interval, window: number): string {
  return `${interval} · ${formatDuration(intervalMs(interval) * window)}`;
}

export function tfPhrase(interval: Interval, window: number): string {
  return `${interval} over the last ${formatDuration(intervalMs(interval) * window)}`;
}

export function windowLabel(interval: Interval, window: number): string {
  return formatDuration(intervalMs(interval) * window);
}

export function couplingBlurb(data: GravitySnapshot): string {
  const tf = tfPhrase(data.interval, data.window);
  const sDir = pullDirLabel(data.spotPull.dir);
  const pDir = pullDirLabel(data.perpPull.dir);
  const sPx = formatPct(data.spotPull.retPct);
  const pPx = formatPct(data.perpPull.retPct);
  const stronger =
    Math.abs(data.spotPull.score) >= Math.abs(data.perpPull.score) ? "spot" : "perps";

  switch (data.coupling) {
    case "sync_up":
      return `On ${tf}, spot and perps are working in sync to the upside. Spot ${sPx}, perps ${pPx} — both pulling price higher.`;
    case "sync_down":
      return `On ${tf}, spot and perps are working in sync to the downside. Spot ${sPx}, perps ${pPx} — both pressing price lower.`;
    case "fight":
      return `On ${tf} the markets are fighting: spot pulls ${sDir} (${sPx}), perps ${pDir} (${pPx}). Price follows the stronger vector (${stronger}).`;
    case "spot_alone":
      return `On ${tf} spot sets the direction (${sDir}, ${sPx}). Perps are nearly neutral (${pPx}).`;
    case "perp_alone":
      return `On ${tf} perps set the direction (${pDir}, ${pPx}). Spot is nearly neutral (${sPx}).`;
    case "quiet":
      return `On ${tf} there is no clear vector: neither spot nor perps are pulling price meaningfully up or down.`;
  }
}

export function volumeBlurb(data: GravitySnapshot): string {
  const tf = tfPhrase(data.interval, data.window);
  const s = formatUsdCompact(data.spotVol.total);
  const p = formatUsdCompact(data.perpVol.total);
  const sd = formatPct(data.spotVol.deltaPct, 0);
  const pd = formatPct(data.perpVol.deltaPct, 0);
  const split = `${data.spotVol.eqShare.toFixed(0)}/${data.perpVol.eqShare.toFixed(0)}`;
  const raw = `${data.spotVol.share.toFixed(0)}/${data.perpVol.share.toFixed(0)}`;
  return `Activity on ${tf} (vs own average) ${split}. USDT notional ${raw} — perps almost always print more; that is not influence. Spot ${s} (last bar ${sd} vs average), perps ${p} (${pd}).`;
}

export function consensusVerdict(data: GravitySnapshot): string {
  const tf = tfPhrase(data.interval, data.window);
  const head = consensusLabel(data.consensus);
  const live = data.consensusLive ?? 0;
  const n = data.pits?.length ?? 0;
  const bits = (data.pits ?? [])
    .map(
      (p) =>
        `${venueLabel(p.venue)} ${p.g >= 0 ? "+" : ""}${p.g.toFixed(2)}${p.source === "demo" ? " demo" : ""}`,
    )
    .join(", ");
  return `On ${tf}: ${head.toLowerCase()}. Median G ${data.g >= 0 ? "+" : ""}${data.g.toFixed(2)} (spot/perps ${data.spotShare.toFixed(0)}/${data.perpShare.toFixed(0)}). Live pits vote (${live} of ${n}); demo does not count toward majority. ${bits}. Not blended candles.`;
}

export function verdict(data: GravitySnapshot): string {
  if (data.venue === "all") return consensusVerdict(data);
  const tf = tfPhrase(data.interval, data.window);
  const split = `${data.spotShare.toFixed(0)}/${data.perpShare.toFixed(0)}`;
  const basisState =
    Math.abs(data.basisBps) < 2
      ? "nearly flat"
      : data.basisBps > 0
        ? "at a premium"
        : "at a discount";
  const lagBit =
    data.lag.leader === "tied"
      ? ui.lagTied
      : data.lag.leader === "perp"
        ? `ticks: perps lead spot by ~${data.lag.bars} ${ui.bars}`
        : `ticks: spot leads perps by ~${data.lag.bars} ${ui.bars}`;
  const regime = regimeLabel(data.regime);
  const dir =
    data.priceChangePct > 0.08
      ? "move up"
      : data.priceChangePct < -0.08
        ? "move down"
        : "no clear drift";
  const couple = couplingBlurb(data);
  const vol = volumeBlurb(data);

  if (Math.abs(data.g) < 0.1) {
    return `On ${tf} there is no clear leader (spot/perps ${split}). ${dir}, ${lagBit}. Basis ${data.basisBps.toFixed(1)} bps, ${basisState}. Regime: ${regime.toLowerCase()}. ${couple} ${vol}`;
  }
  const driver = data.g > 0 ? "perpetual futures" : "spot";
  const share = data.g > 0 ? data.perpShare : data.spotShare;
  return `On ${tf}, ${dir}: ${driver} are pulling (${share.toFixed(0)}% influence). ${lagBit}. Basis ${data.basisBps.toFixed(1)} bps, ${basisState}. Regime: ${regime.toLowerCase()}. ${couple} ${vol}`;
}

export const METHOD = {
  title: "GDI — Gravity Discovery Index",
  lead: "The index answers which venue is discovering price right now: spot (cash demand) or perpetual futures (leverage). Not RSI, not funding — a price-discovery share.",
  w1: "Lead-lag (27%)",
  w1d: "Correlation of perp returns with future spot minus the reverse, plus a pulse of who printed the larger move on the last bars.",
  w2: "Basis (26%)",
  w2d: "Only basis change in the direction of the move. A static perp premium (normal crypto contango) does not enter G — otherwise any rally with a premium would look futures-led.",
  w3: "Aggression (22%)",
  w3d: "Taker buy/sell as a ratio, not USDT. Each venue's imbalance is weighted by its own volume impulse: a tilt on a dead book is weaker than the same tilt on a spike.",
  w4: "OI impulse (13%)",
  w4d: "ΔOI × sign(perp impulse − spot impulse). OI exists only on futures, but if spot is hotter than its own average this block pulls G toward spot instead of handing perps a free plus.",
  w5: "Volume (12%)",
  w5d: "Equalized activity: recent/avg per venue. 50/50 when both print their normal. Plus log-deviation of perp/spot ratio from the window median. Raw 7/93 notional never enters G.",
  dir: "Direction vectors",
  dird: "The shared mid print is not a unique pull. Residual (own return − mid) counts only if basis actually breathes — glued ticks do not fake a fight. Then taker and impulse.",
  vol: "Volume",
  vold: "USDT notional is turnover, almost always 5–10% spot. The activity bar is who is hotter than their own normal. Only that feeds G and the vectors.",
  net: "Resultant vector",
  netd: "Sum of the spot and perp vectors. Sync up — one large green. Sync down — red. Fight — they cancel, net is short. Beside it: price 1 bar ago on the selected TF, so you can see whether net sign matches the bar.",
  pits: "Pits",
  pitsd: "One pit = one exchange. GDI stays inside it. Market mode is the median live-pit G and a 2-of-3 majority — not blended candles. New venue: registerVenue({ id, fetch }) then GET /api/gravity?venue=id.",
  read: "G ∈ [−1, +1]. Negative = spot. Positive = perps. Influence share = 50 ± 50·G — not turnover share. Venue vector ∈ [−1, +1]: minus down, plus up. Volume scales magnitude, not sign.",
  kata: "For kScript / Kata: residual = r_venue − r_mid, deadzone 0.18σ. Taker imb × volImpulse. eqShare = rel_s / (rel_s+rel_p). OI = |ΔOI| × tanh(perpImp−spotImp). Basis: z(Δbasis) + sign(Δpx)·Δbasis, not premium level. Weights 0.27 / 0.26 / 0.22 / 0.13 / 0.12.",
} as const;
