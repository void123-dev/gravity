import { computeGravity, intervalMs } from "../gravity";
import type { Bar, GravitySnapshot, Interval, SymbolCode, VenueId } from "../types";

const DEMO_PX: Record<SymbolCode, number> = {
  BTC: 79600,
  ETH: 2480,
  SOL: 152,
  XRP: 2.38,
  DOGE: 0.142,
  BNB: 618,
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function buildDemo(
  venue: VenueId,
  symbol: SymbolCode,
  interval: Interval,
  window: number,
): GravitySnapshot {
  const n = Math.max(window + 40, 140);
  const ms = intervalMs(interval);
  const now = Math.floor(Date.now() / ms) * ms;
  const rng = mulberry32(hashStr(`${venue}:${symbol}`) + Math.floor(Date.now() / 180_000));
  const shocks: number[] = [];
  const vol = symbol === "BTC" ? 0.0011 : symbol === "ETH" ? 0.0014 : 0.002;
  for (let i = 0; i < n + 4; i++) {
    shocks.push((rng() - 0.49) * vol * (rng() > 0.94 ? 3.2 : 1));
  }
  let spot = DEMO_PX[symbol] * (0.992 + rng() * 0.016);
  let perp = spot;
  let oi = 2.1e9 * (0.8 + rng() * 0.5);
  const bars: Bar[] = [];
  const lag = 2;
  for (let i = 0; i < n; i++) {
    const perpShock = shocks[i + lag] ?? 0;
    const spotShock = (shocks[i] ?? 0) * 0.72 + (rng() - 0.5) * vol * 0.25;
    perp *= Math.exp(perpShock);
    spot *= Math.exp(spotShock);
    const basisDrift = (rng() - 0.5) * 0.00012;
    perp = perp * (1 + basisDrift);
    oi *= 1 + (perpShock * 4 + (rng() - 0.5) * 0.004);
    const t = now - (n - 1 - i) * ms;
    const pBuy = 0.42 + rng() * 0.22 + Math.sign(perpShock) * 0.08;
    const sBuy = 0.42 + rng() * 0.22 + Math.sign(spotShock) * 0.05;
    const pVol = 8e6 * (0.6 + rng());
    const sVol = 2e6 * (0.6 + rng());
    bars.push({
      t,
      spot,
      perp,
      spotVol: sVol,
      perpVol: pVol,
      oi,
      spotBuy: sVol * sBuy,
      spotSell: sVol * (1 - sBuy),
      perpBuy: pVol * pBuy,
      perpSell: pVol * (1 - pBuy),
    });
  }
  return computeGravity({
    bars,
    window,
    symbol,
    interval,
    venue,
    source: "demo",
    funding: (rng() - 0.45) * 0.00008,
    premium: (perp - spot) / spot,
    oiUsd: oi,
  }) as GravitySnapshot;
}
