import { clamp, fin } from "../utils.ts";
import type {
  ConsensusId,
  GravityPoint,
  GravitySnapshot,
  PitRow,
  VenueId,
  VenuePull,
  VenueVolume,
} from "../types.ts";

const G_EPS = 0.12;

export function median(xs: number[]): number {
  const a = xs.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (a.length === 0) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
}

export function toPitRow(snap: GravitySnapshot): PitRow {
  return {
    venue: snap.venue as VenueId,
    source: snap.source,
    g: snap.g,
    spotShare: snap.spotShare,
    perpShare: snap.perpShare,
    coupling: snap.coupling,
    spotPull: snap.spotPull.score,
    perpPull: snap.perpPull.score,
    confidence: snap.confidence,
    spot: snap.spot,
  };
}

export function decideConsensus(rows: PitRow[]): {
  id: ConsensusId;
  g: number;
  live: number;
  demo: number;
  used: PitRow[];
} {
  const live = rows.filter((r) => r.source !== "demo");
  const demo = rows.length - live.length;
  if (live.length >= 2) {
    return { ...vote(live), live: live.length, demo };
  }
  if (live.length === 1) {
    return { id: "quiet", g: live[0]!.g, live: 1, demo, used: live };
  }
  return { ...vote(rows), live: 0, demo };
}

function vote(used: PitRow[]): { id: ConsensusId; g: number; used: PitRow[] } {
  const g = median(used.map((r) => r.g));
  if (used.length < 2) return { id: "quiet", g, used };
  const nSpot = used.filter((r) => r.g < -G_EPS).length;
  const nPerp = used.filter((r) => r.g > G_EPS).length;
  const need = 2;
  let id: ConsensusId = "quiet";
  if (nSpot >= need && nPerp === 0) id = "agree_spot";
  else if (nPerp >= need && nSpot === 0) id = "agree_perp";
  else if (nSpot > 0 && nPerp > 0) id = "split";
  return { id, g, used };
}

export function alignPitSeries(snaps: GravitySnapshot[]): GravityPoint[] {
  if (snaps.length === 0) return [];
  const n = Math.min(...snaps.map((s) => s.series.length));
  const out: GravityPoint[] = [];
  for (let i = 0; i < n; i++) {
    const pts = snaps.map((s) => s.series[s.series.length - n + i]!).filter(Boolean);
    if (pts.length === 0) continue;
    const pits: Record<string, number> = {};
    snaps.forEach((s, k) => {
      const p = s.series[s.series.length - n + i];
      if (p) pits[String(s.venue)] = p.g;
    });
    const g = median(pts.map((p) => p.g));
    out.push({
      t: median(pts.map((p) => p.t)),
      spot: median(pts.map((p) => p.spot)),
      perp: median(pts.map((p) => p.perp)),
      basisBps: median(pts.map((p) => p.basisBps)),
      g: fin(g),
      spotShare: fin(50 * (1 - g)),
      perpShare: fin(50 * (1 + g)),
      spotPull: median(pts.map((p) => p.spotPull)),
      perpPull: median(pts.map((p) => p.perpPull)),
      netPull: median(pts.map((p) => p.netPull)),
      spotVol: median(pts.map((p) => p.spotVol)),
      perpVol: median(pts.map((p) => p.perpVol)),
      spotVolRel: median(pts.map((p) => p.spotVolRel)),
      perpVolRel: median(pts.map((p) => p.perpVolRel)),
      pits,
    });
  }
  return out;
}

function pullFromScore(score: number): VenuePull {
  const dir = Math.abs(score) < 0.16 ? "flat" : score > 0 ? "up" : "down";
  return { dir, score: fin(score), retPct: 0, flow: 0, buy: 0, sell: 0 };
}

const emptyVol = (): VenueVolume => ({
  total: 0,
  last: 0,
  avg: 0,
  deltaPct: 0,
  share: 50,
  eqShare: 50,
});

export function buildConsensus(snaps: GravitySnapshot[]): GravitySnapshot {
  const first = snaps[0];
  if (!first) throw new Error("no pits");
  const rows = snaps.map(toPitRow);
  const c = decideConsensus(rows);
  const g = clamp(c.g, -1, 1);
  const series = alignPitSeries(snaps);
  const last = series[series.length - 1];
  const spot = last?.spot ?? median(snaps.map((s) => s.spot));
  const perp = last?.perp ?? median(snaps.map((s) => s.perp));
  const spotPull = pullFromScore(median(c.used.map((r) => r.spotPull)));
  const perpPull = pullFromScore(median(c.used.map((r) => r.perpPull)));
  const net = fin(clamp(spotPull.score + perpPull.score, -2, 2));
  const coupling =
    c.id === "split" ? "fight" : c.id === "agree_spot" ? "spot_alone" : c.id === "agree_perp" ? "perp_alone" : "quiet";
  const funds = snaps.map((s) => s.funding).filter((x): x is number => x != null && Number.isFinite(x));
  const premiums = snaps.map((s) => s.premium).filter((x): x is number => x != null && Number.isFinite(x));
  const conf = clamp(
    median(c.used.map((r) => r.confidence)) * (c.id === "split" || c.id === "quiet" ? 0.7 : 1),
    0.2,
    0.96,
  );
  const prev = series.length >= 2 ? series[series.length - 2]!.spot : spot;
  return {
    model: "GDI-1.3",
    symbol: first.symbol,
    interval: first.interval,
    window: first.window,
    venue: "all",
    source: "consensus",
    asOf: Math.max(...snaps.map((s) => s.asOf)),
    spot: fin(spot),
    perp: fin(perp),
    basisBps: fin(last?.basisBps ?? median(snaps.map((s) => s.basisBps))),
    funding: funds.length ? median(funds) : null,
    premium: premiums.length ? median(premiums) : null,
    oiUsd: null,
    oiDeltaPct: null,
    g: fin(g),
    spotShare: fin(50 * (1 - g)),
    perpShare: fin(50 * (1 + g)),
    confidence: fin(conf),
    lag: { leader: "tied", bars: 0 },
    components: {
      lead: median(snaps.map((s) => s.components.lead)),
      basis: median(snaps.map((s) => s.components.basis)),
      flow: median(snaps.map((s) => s.components.flow)),
      oi: median(snaps.map((s) => s.components.oi)),
      vol: median(snaps.map((s) => s.components.vol)),
    },
    regime: g > 0.28 ? "lev_rally" : g < -0.28 ? "spot_bid" : "coupled",
    priceChangePct: fin(last && series[0] ? ((last.spot - series[0].spot) / series[0].spot) * 100 : 0),
    spotPull,
    perpPull,
    coupling,
    couplingScore: c.id === "split" ? -0.6 : c.id === "quiet" ? 0 : 0.55,
    netPull: {
      score: net,
      dir: Math.abs(net) < 0.16 ? "flat" : net > 0 ? "up" : "down",
      agree: "weak",
    },
    prevPx: fin(prev),
    barRetPct: prev > 0 ? fin(((spot - prev) / prev) * 100) : 0,
    spotVol: emptyVol(),
    perpVol: emptyVol(),
    series,
    pits: rows,
    consensus: c.id,
    consensusLive: c.live,
    consensusDemo: c.demo,
  };
}
