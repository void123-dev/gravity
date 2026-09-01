import { clamp, fin } from "./utils.ts";
import type {
  Bar,
  CouplingId,
  DataSource,
  GravityComponents,
  GravityPoint,
  GravitySnapshot,
  Interval,
  Leader,
  NetAgree,
  NetPull,
  PullDir,
  RegimeId,
  SymbolCode,
  VenueId,
  VenuePull,
  VenueVolume,
} from "./types.ts";

export function intervalMs(interval: Interval): number {
  switch (interval) {
    case "1m":
      return 60_000;
    case "5m":
      return 5 * 60_000;
    case "15m":
      return 15 * 60_000;
    case "1H":
      return 60 * 60_000;
    case "4H":
      return 4 * 60 * 60_000;
  }
}

export function windowDurationMs(interval: Interval, window: number): number {
  return intervalMs(interval) * window;
}

const DIR_EPS = 0.1;
const STRONG_EPS = 0.16;

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 6) return 0;
  let sa = 0;
  let sb = 0;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    sa += x;
    sb += y;
    sab += x * y;
    saa += x * x;
    sbb += y * y;
  }
  const cov = sab - (sa * sb) / n;
  const va = saa - (sa * sa) / n;
  const vb = sbb - (sb * sb) / n;
  const den = Math.sqrt(Math.max(va, 0) * Math.max(vb, 0));
  if (den < 1e-18) return 0;
  return clamp(cov / den, -1, 1);
}

function stdev(xs: number[]): number {
  if (xs.length < 3) return 0;
  const m = xs.reduce((s, v) => s + v, 0) / xs.length;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

function logret(from: number, to: number): number {
  if (from <= 0 || to <= 0) return 0;
  return Math.log(to / from);
}

function returns(bars: Bar[], key: "spot" | "perp"): number[] {
  const out: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1];
    const cur = bars[i];
    if (!prev || !cur) continue;
    out.push(logret(prev[key], cur[key]));
  }
  return out;
}

function dirFromScore(score: number): PullDir {
  if (score > DIR_EPS) return "up";
  if (score < -DIR_EPS) return "down";
  return "flat";
}

function venueDirection(bars: Bar[], key: "spot" | "perp"): VenuePull {
  if (bars.length < 2) {
    return { dir: "flat", score: 0, retPct: 0, flow: 0, buy: 0, sell: 0 };
  }
  const first = bars[0]!;
  const last = bars[bars.length - 1]!;
  const px0 = first[key];
  const px1 = last[key];
  const retPct = px0 > 0 ? ((px1 - px0) / px0) * 100 : 0;
  const own = logret(px0, px1);
  const mid0 = (first.spot + first.perp) / 2;
  const mid1 = (last.spot + last.perp) / 2;
  const mid = logret(mid0, mid1);
  const residual = own - mid;
  const rets = returns(bars, key);
  const midRets: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const a = bars[i - 1];
    const b = bars[i];
    if (!a || !b) continue;
    midRets.push(logret((a.spot + a.perp) / 2, (b.spot + b.perp) / 2));
  }
  const resRets = rets.map((r, i) => r - (midRets[i] ?? 0));
  const n = Math.max(rets.length, 1);
  const scaleOwn = Math.max(stdev(rets) * Math.sqrt(n) * 0.7, 0.0008);
  const scaleRes = Math.max(stdev(resRets) * Math.sqrt(n) * 0.7, 0.00012);
  const resNorm = residual / scaleRes;
  // Residuals of spot and perp vs mid are near-opposites by construction.
  // Ignore tiny basis ticks so glued tape does not fake a fight.
  const unique = Math.abs(resNorm) >= 0.18;
  const priceDir = unique
    ? 0.28 * Math.tanh(own / scaleOwn) + 0.72 * Math.tanh(resNorm)
    : 0.22 * Math.tanh(own / scaleOwn);

  const buyKey = key === "spot" ? "spotBuy" : "perpBuy";
  const sellKey = key === "spot" ? "spotSell" : "perpSell";
  let buy = 0;
  let sell = 0;
  for (const b of bars) {
    buy += b[buyKey] ?? 0;
    sell += b[sellKey] ?? 0;
  }
  const tot = buy + sell;
  const hasFlow = tot > 1e-8;
  const rawFlow = hasFlow ? (buy - sell) / tot : 0;
  const flowScore = Math.tanh(rawFlow * 2.4);

  const tailN = Math.min(4, resRets.length);
  const tail = resRets.slice(-tailN);
  const meanTail = tail.length ? tail.reduce((s, v) => s + v, 0) / tail.length : 0;
  const volRes = stdev(resRets);
  const pulse = Math.tanh(meanTail / Math.max(volRes, 1e-6) / 0.9);

  const raw = hasFlow
    ? clamp(0.28 * priceDir + 0.58 * flowScore + 0.14 * pulse, -1, 1)
    : clamp(0.7 * priceDir + 0.3 * pulse, -1, 1);
  const amp = clamp(1 + 0.55 * volImpulse(bars, key), 0.45, 1.55);
  const score = clamp(raw * amp, -1, 1);

  return {
    dir: dirFromScore(score),
    score: fin(score),
    retPct: fin(retPct),
    flow: fin(hasFlow ? rawFlow : 0),
    buy: fin(buy),
    sell: fin(sell),
  };
}

function pickAgree(net: number, barRetPct: number): NetAgree {
  const nUp = net > 0.16;
  const nDown = net < -0.16;
  const pUp = barRetPct > 0.025;
  const pDown = barRetPct < -0.025;
  if (!nUp && !nDown && !pUp && !pDown) return "hit";
  if (!nUp && !nDown) return "weak";
  if (!pUp && !pDown) return "weak";
  if ((nUp && pUp) || (nDown && pDown)) return "hit";
  return "miss";
}

function netFromPulls(spot: VenuePull, perp: VenuePull, barRetPct: number): NetPull {
  const score = fin(clamp(spot.score + perp.score, -2, 2));
  const dir: PullDir = Math.abs(score) < 0.16 ? "flat" : score > 0 ? "up" : "down";
  return { score, dir, agree: pickAgree(score, barRetPct) };
}

function pickCoupling(spot: VenuePull, perp: VenuePull): CouplingId {
  const s = spot.score;
  const p = perp.score;
  const sStrong = Math.abs(s) >= STRONG_EPS;
  const pStrong = Math.abs(p) >= STRONG_EPS;
  const sLive = Math.abs(s) >= DIR_EPS;
  const pLive = Math.abs(p) >= DIR_EPS;
  const product = s * p;

  if (sLive && pLive && product < 0 && (sStrong || pStrong)) return "fight";
  if (sLive && pLive && product > 0) return s > 0 ? "sync_up" : "sync_down";
  if (sLive && !pLive) return "spot_alone";
  if (pLive && !sLive) return "perp_alone";
  return "quiet";
}

function alignScore(spot: VenuePull, perp: VenuePull, corr: number): number {
  const sLive = Math.abs(spot.score) >= DIR_EPS;
  const pLive = Math.abs(perp.score) >= DIR_EPS;
  if (!sLive && !pLive) {
    return fin(clamp(corr * 0.35, -0.4, 0.4));
  }
  const mag = Math.sqrt(Math.abs(spot.score) * Math.abs(perp.score));
  const sign = Math.sign(spot.score || 1) * Math.sign(perp.score || 1);
  const signed = sign * mag;
  return fin(clamp(0.4 * corr + 0.6 * Math.tanh(signed * 2.6), -1, 1));
}

function leadScore(rS: number[], rP: number[]): number {
  const lags = [1, 2, 3];
  let p = 0;
  let s = 0;
  let w = 0;
  for (const lag of lags) {
    if (rS.length <= lag + 6) continue;
    const weight = 1 / lag;
    p += pearson(rP.slice(0, -lag), rS.slice(lag)) * weight;
    s += pearson(rS.slice(0, -lag), rP.slice(lag)) * weight;
    w += weight;
  }
  const corrLead = w === 0 ? 0 : (p - s) / w;

  let pulse = 0;
  const tail = Math.min(4, rS.length);
  for (let i = rS.length - tail; i < rS.length; i++) {
    const rs = rS[i] ?? 0;
    const rp = rP[i] ?? 0;
    if (Math.abs(rp) > Math.abs(rs) * 1.12) pulse += Math.sign(rp || 1);
    else if (Math.abs(rs) > Math.abs(rp) * 1.12) pulse -= Math.sign(rs || 1);
  }
  const pulseScore = Math.tanh(pulse / 2.2);
  return Math.tanh(corrLead * 2.8) * 0.62 + pulseScore * 0.38;
}

function basisScore(bars: Bar[]): number {
  if (bars.length < 4) return 0;
  const pulls: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const a = bars[i - 1];
    const b = bars[i];
    if (!a || !b || a.spot <= 0 || b.spot <= 0) continue;
    const b0 = (a.perp - a.spot) / a.spot;
    const b1 = (b.perp - b.spot) / b.spot;
    const mid0 = (a.perp + a.spot) / 2;
    const mid1 = (b.perp + b.spot) / 2;
    const dMid = logret(mid0, mid1);
    const dB = b1 - b0;
    pulls.push(Math.sign(dMid || 1) * dB * 10_000);
  }
  if (pulls.length < 3) return 0;
  const last = pulls[pulls.length - 1] ?? 0;
  const sd = stdev(pulls);
  const meanP = pulls.reduce((s, v) => s + v, 0) / pulls.length;
  // Quiet basis (static premium) must not explode via tiny σ.
  const direction = sd < 0.35 ? 0 : Math.tanh((last - meanP) / sd / 1.35);
  const level = bars[bars.length - 1];
  const first = bars[0];
  if (!level || !first || first.spot <= 0 || level.spot <= 0) return direction;
  const basisNow = (level.perp - level.spot) / level.spot;
  const basisThen = (first.perp - first.spot) / first.spot;
  const midNow = (level.perp + level.spot) / 2;
  const midThen = (first.perp + first.spot) / 2;
  const dPx = logret(midThen, midNow);
  // Static premium (normal crypto contango) is not a lead. Only Δbasis
  // in the direction of the move counts.
  const levelPull = Math.sign(dPx || 1) * (basisNow - basisThen) * 12_000;
  return clamp(direction * 0.65 + Math.tanh(levelPull) * 0.35, -1, 1);
}

function flowScore(bars: Bar[]): number | null {
  let sBuy = 0;
  let sSell = 0;
  let pBuy = 0;
  let pSell = 0;
  for (const b of bars) {
    sBuy += b.spotBuy ?? 0;
    sSell += b.spotSell ?? 0;
    pBuy += b.perpBuy ?? 0;
    pSell += b.perpSell ?? 0;
  }
  const sTot = sBuy + sSell;
  const pTot = pBuy + pSell;
  if (sTot < 1e-8 || pTot < 1e-8) return null;
  const sImb = (sBuy - sSell) / sTot;
  const pImb = (pBuy - pSell) / pTot;
  // Weight imbalance by how unusually active that venue is vs itself —
  // a 3% tilt on a dead book does not outrank a 3% tilt on a spike.
  const sW = clamp(0.5 + 0.5 * volImpulse(bars, "spot"), 0.2, 1);
  const pW = clamp(0.5 + 0.5 * volImpulse(bars, "perp"), 0.2, 1);
  return Math.tanh((pImb * pW - sImb * sW) * 2.15);
}

function oiScore(bars: Bar[]): number | null {
  const withOi = bars.filter((b) => b.oi && b.oi > 0);
  if (withOi.length < 6) return null;
  const first = withOi[0];
  const last = withOi[withOi.length - 1];
  if (!first?.oi || !last?.oi) return null;
  const dOi = (last.oi - first.oi) / first.oi;
  if (Math.abs(dOi) < 0.001) return 0;
  const mag = Math.tanh(Math.abs(dOi) * 9);
  const pImp = volImpulse(bars, "perp");
  const sImp = volImpulse(bars, "spot");
  // OI lives on perps, but a quiet perp book vs a hot spot book must not
  // mint a free +G. Sign follows who is unusually active.
  const tilt = Math.tanh((pImp - sImp) * 1.6);
  return mag * tilt;
}

function quoteVol(bar: Bar, key: "spot" | "perp"): number {
  const candle = key === "spot" ? bar.spotVol : bar.perpVol;
  if (candle > 0) return candle;
  if (key === "spot") return (bar.spotBuy ?? 0) + (bar.spotSell ?? 0);
  return (bar.perpBuy ?? 0) + (bar.perpSell ?? 0);
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 === 1 ? (a[m] ?? 0) : ((a[m - 1] ?? 0) + (a[m] ?? 0)) / 2;
}

function activityRel(bars: Bar[], key: "spot" | "perp"): number {
  if (bars.length < 6) return 1;
  const vals = bars.map((b) => quoteVol(b, key));
  const avg = mean(vals);
  if (avg < 1e-8) return 1;
  const tail = Math.max(3, Math.floor(vals.length * 0.25));
  return mean(vals.slice(-tail)) / avg;
}

function volImpulse(bars: Bar[], key: "spot" | "perp"): number {
  return Math.tanh((activityRel(bars, key) - 1) * 1.35);
}

function volLeadScore(bars: Bar[]): number | null {
  let sTot = 0;
  let pTot = 0;
  const ratios: number[] = [];
  for (const b of bars) {
    const s = quoteVol(b, "spot");
    const p = quoteVol(b, "perp");
    sTot += s;
    pTot += p;
    ratios.push(p / Math.max(s, 1e-8));
  }
  if (sTot < 1e-8 && pTot < 1e-8) return null;
  const sRel = activityRel(bars, "spot");
  const pRel = activityRel(bars, "perp");
  const eq = sRel / Math.max(sRel + pRel, 1e-8);
  // Equalized activity: 0.5 / 0.5 when both print their own normal.
  const eqLead = Math.tanh((0.5 - eq) * 3.0);
  const med = median(ratios);
  const tail = Math.max(3, Math.floor(ratios.length * 0.25));
  const now = mean(ratios.slice(-tail));
  const ratioLead =
    med > 1e-12 && now > 0 ? Math.tanh(Math.log(now / med) * 1.25) : 0;
  return clamp(0.65 * eqLead + 0.35 * ratioLead, -1, 1);
}

function venueVolume(bars: Bar[], key: "spot" | "perp"): Omit<VenueVolume, "share" | "eqShare"> & {
  rel: number;
} {
  let total = 0;
  for (const b of bars) total += quoteVol(b, key);
  const n = Math.max(bars.length, 1);
  const avg = total / n;
  const lastBar = bars[bars.length - 1];
  const last = lastBar ? quoteVol(lastBar, key) : 0;
  const deltaPct = avg > 0 ? ((last - avg) / avg) * 100 : 0;
  return {
    total: fin(total),
    last: fin(last),
    avg: fin(avg),
    deltaPct: fin(deltaPct),
    rel: fin(activityRel(bars, key), 1),
  };
}

function withShares(
  spot: Omit<VenueVolume, "share" | "eqShare"> & { rel: number },
  perp: Omit<VenueVolume, "share" | "eqShare"> & { rel: number },
): { spotVol: VenueVolume; perpVol: VenueVolume } {
  const sum = spot.total + perp.total;
  const spotShare = sum > 0 ? (spot.total / sum) * 100 : 50;
  const act = Math.max(spot.rel + perp.rel, 1e-8);
  const eqSpot = (spot.rel / act) * 100;
  return {
    spotVol: {
      total: spot.total,
      last: spot.last,
      avg: spot.avg,
      deltaPct: spot.deltaPct,
      share: fin(spotShare),
      eqShare: fin(eqSpot),
    },
    perpVol: {
      total: perp.total,
      last: perp.last,
      avg: perp.avg,
      deltaPct: perp.deltaPct,
      share: fin(100 - spotShare),
      eqShare: fin(100 - eqSpot),
    },
  };
}

function estimateLag(rS: number[], rP: number[]): { leader: Leader; bars: number } {
  let bestP = -Infinity;
  let bestS = -Infinity;
  let lagP = 1;
  let lagS = 1;
  for (let lag = 1; lag <= 6; lag++) {
    if (rS.length <= lag + 8) break;
    const cP = pearson(rP.slice(0, -lag), rS.slice(lag));
    const cS = pearson(rS.slice(0, -lag), rP.slice(lag));
    if (cP > bestP) {
      bestP = cP;
      lagP = lag;
    }
    if (cS > bestS) {
      bestS = cS;
      lagS = lag;
    }
  }
  if (!Number.isFinite(bestP) || !Number.isFinite(bestS)) {
    return { leader: "tied", bars: 0 };
  }
  if (Math.abs(bestP - bestS) < 0.06) return { leader: "tied", bars: 0 };
  if (bestP > bestS) return { leader: "perp", bars: lagP };
  return { leader: "spot", bars: lagS };
}

function pickRegime(g: number, dPx: number, dOi: number | null): RegimeId {
  const perpLed = g > 0.28;
  const spotLed = g < -0.28;
  const up = dPx > 0.0015;
  const down = dPx < -0.0015;
  const oiUp = (dOi ?? 0) > 0.004;
  const oiDown = (dOi ?? 0) < -0.004;
  if (perpLed && up && oiUp) return "lev_rally";
  if (perpLed && up && oiDown) return "short_squeeze";
  if (perpLed && down && oiUp) return "short_dump";
  if (perpLed && down && oiDown) return "long_liq";
  if (spotLed && up) return "spot_bid";
  if (spotLed && down) return "spot_offer";
  return "coupled";
}

function scoreWindow(bars: Bar[]): {
  g: number;
  components: GravityComponents;
  confidence: number;
  lag: { leader: Leader; bars: number };
  corr: number;
  spotPull: VenuePull;
  perpPull: VenuePull;
} {
  const rS = returns(bars, "spot");
  const rP = returns(bars, "perp");
  const lead = leadScore(rS, rP);
  const basis = basisScore(bars);
  const flow = flowScore(bars);
  const oi = oiScore(bars);
  const vol = volLeadScore(bars);

  let wL = 0.27;
  let wB = 0.26;
  let wF = flow === null ? 0 : 0.22;
  let wO = oi === null ? 0 : 0.13;
  let wV = vol === null ? 0 : 0.12;
  const sum = wL + wB + wF + wO + wV;
  wL /= sum;
  wB /= sum;
  wF /= sum;
  wO /= sum;
  wV /= sum;

  const g = clamp(
    wL * lead + wB * basis + wF * (flow ?? 0) + wO * (oi ?? 0) + wV * (vol ?? 0),
    -1,
    1,
  );

  const components: GravityComponents = {
    lead: fin(lead),
    basis: fin(basis),
    flow: fin(flow ?? 0),
    oi: fin(oi ?? 0),
    vol: fin(vol ?? 0),
  };
  const corr = pearson(rS, rP);
  const nFactor = clamp(bars.length / 36, 0.35, 1);
  const activity = stdev(rS) + stdev(rP);
  const live = activity > 1e-6 ? 1 : 0.4;
  const mag = Math.abs(g);
  const parts = [lead, basis, flow ?? 0, oi ?? 0, vol ?? 0].filter((x) => Math.abs(x) >= 0.08);
  const gSign = Math.sign(g);
  const agree =
    parts.length && gSign !== 0
      ? parts.filter((x) => Math.sign(x) === gSign).length / parts.length
      : 0;
  // Certainty of WHO leads — not how glued the tape is. High spot–perp
  // correlation means coupling, not a confident 60/40 split.
  const confidence =
    clamp(0.16 + 0.52 * mag + 0.18 * nFactor + 0.14 * agree, 0.16, 0.92) * live;

  return {
    g: fin(g),
    components,
    confidence: fin(confidence),
    lag: estimateLag(rS, rP),
    corr: fin(corr),
    spotPull: venueDirection(bars, "spot"),
    perpPull: venueDirection(bars, "perp"),
  };
}

export function computeGravity(input: {
  bars: Bar[];
  window: number;
  symbol: SymbolCode;
  interval: Interval;
  source: DataSource;
  venue: VenueId;
  funding: number | null;
  premium: number | null;
  oiUsd: number | null;
}): GravitySnapshot {
  const { bars, window, symbol, interval, source, venue } = input;
  const w = clamp(Math.floor(window), 16, 120);
  if (bars.length < 10) {
    throw new Error("Not enough bars to compute GRAVITY");
  }

  const series: GravityPoint[] = [];
  const start = Math.max(w, 12);
  for (let i = start; i <= bars.length; i++) {
    const slice = bars.slice(Math.max(0, i - w), i);
    const last = slice[slice.length - 1];
    if (!last) continue;
    const scored = scoreWindow(slice);
    const basisBps = last.spot > 0 ? ((last.perp - last.spot) / last.spot) * 10_000 : 0;
    const n = Math.max(slice.length, 1);
    let sTot = 0;
    let pTot = 0;
    for (const b of slice) {
      sTot += quoteVol(b, "spot");
      pTot += quoteVol(b, "perp");
    }
    const sAvg = sTot / n;
    const pAvg = pTot / n;
    const sLast = quoteVol(last, "spot");
    const pLast = quoteVol(last, "perp");
    series.push({
      t: last.t,
      spot: last.spot,
      perp: last.perp,
      basisBps: fin(basisBps),
      g: fin(scored.g),
      spotShare: fin(50 * (1 - scored.g)),
      perpShare: fin(50 * (1 + scored.g)),
      spotPull: scored.spotPull.score,
      perpPull: scored.perpPull.score,
      netPull: fin(clamp(scored.spotPull.score + scored.perpPull.score, -2, 2)),
      spotVol: fin(sLast),
      perpVol: fin(pLast),
      spotVolRel: fin(sAvg > 0 ? (sLast / sAvg) * 100 : 100),
      perpVolRel: fin(pAvg > 0 ? (pLast / pAvg) * 100 : 100),
    });
  }

  const tail = bars.slice(-w);
  const scored = scoreWindow(tail);
  const last = bars[bars.length - 1]!;
  const first = tail[0]!;
  const basisBps = last.spot > 0 ? ((last.perp - last.spot) / last.spot) * 10_000 : 0;
  const mid0 = (first.spot + first.perp) / 2;
  const mid1 = (last.spot + last.perp) / 2;
  const priceChangePct = mid0 > 0 ? ((mid1 - mid0) / mid0) * 100 : 0;

  const withOi = tail.filter((b) => b.oi && b.oi > 0);
  let oiDeltaPct: number | null = null;
  if (withOi.length >= 2) {
    const a = withOi[0]!.oi!;
    const b = withOi[withOi.length - 1]!.oi!;
    oiDeltaPct = ((b - a) / a) * 100;
  }

  const regime = pickRegime(
    scored.g,
    logret(mid0, mid1),
    oiDeltaPct === null ? null : oiDeltaPct / 100,
  );

  const latest = series[series.length - 1];
  const g = latest?.g ?? scored.g;
  const spotPull = scored.spotPull;
  const perpPull = scored.perpPull;
  const coupling = pickCoupling(spotPull, perpPull);
  const couplingScore = alignScore(spotPull, perpPull, scored.corr);
  const prev = bars.length >= 2 ? bars[bars.length - 2] : last;
  const prevPx = prev?.spot ?? last.spot;
  const barRetPct = prevPx > 0 ? ((last.spot - prevPx) / prevPx) * 100 : 0;
  const netPull = netFromPulls(spotPull, perpPull, barRetPct);
  const volumes = withShares(venueVolume(tail, "spot"), venueVolume(tail, "perp"));

  return {
    model: "GDI-1.3",
    symbol,
    interval,
    window: w,
    venue,
    source,
    asOf: last.t,
    spot: last.spot,
    perp: last.perp,
    basisBps: fin(basisBps),
    funding: input.funding,
    premium: input.premium,
    oiUsd: input.oiUsd,
    oiDeltaPct,
    g: fin(g),
    spotShare: fin(50 * (1 - g)),
    perpShare: fin(50 * (1 + g)),
    confidence: scored.confidence,
    lag: scored.lag,
    components: scored.components,
    regime,
    priceChangePct: fin(priceChangePct),
    spotPull,
    perpPull,
    coupling,
    couplingScore,
    netPull,
    prevPx: fin(prevPx),
    barRetPct: fin(barRetPct),
    spotVol: volumes.spotVol,
    perpVol: volumes.perpVol,
    series,
  };
}
