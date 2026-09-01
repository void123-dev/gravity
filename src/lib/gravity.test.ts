import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeGravity } from "./gravity.ts";
import type { Bar } from "./types.ts";
import { parseVenue } from "./venues/shared.ts";
import { decideConsensus } from "./venues/consensus.ts";

function makeBars(opts: {
  n?: number;
  spotVol: number | ((i: number) => number);
  perpVol: number | ((i: number) => number);
  spotBuyFrac?: number;
  perpBuyFrac?: number;
  spotLead?: boolean;
}): Bar[] {
  const n = opts.n ?? 80;
  const sBuy = opts.spotBuyFrac ?? 0.5;
  const pBuy = opts.perpBuyFrac ?? 0.5;
  let spot = 100;
  let perp = 100.02;
  const bars: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const shock = i > n - 12 ? 0.0012 : (i % 7 === 0 ? 0.0004 : -0.0002);
    if (opts.spotLead) {
      spot *= 1 + shock;
      perp *= 1 + shock * 0.35;
    } else {
      perp *= 1 + shock;
      spot *= 1 + shock * 0.35;
    }
    const sv = typeof opts.spotVol === "function" ? opts.spotVol(i) : opts.spotVol;
    const pv = typeof opts.perpVol === "function" ? opts.perpVol(i) : opts.perpVol;
    bars.push({
      t: 1_700_000_000_000 + i * 60_000,
      spot,
      perp,
      spotVol: sv,
      perpVol: pv,
      oi: 1e9 * (1 + i * 0.0002),
      spotBuy: sv * sBuy,
      spotSell: sv * (1 - sBuy),
      perpBuy: pv * pBuy,
      perpSell: pv * (1 - pBuy),
    });
  }
  return bars;
}

function snap(bars: Bar[]) {
  return computeGravity({
    bars,
    window: 48,
    symbol: "BTC",
    interval: "5m",
    venue: "okx",
    source: "demo",
    funding: 0,
    premium: 0,
    oiUsd: 1e9,
  });
}

describe("GDI-1.3 equalization", () => {
  it("raw 1:20 notional does not make perps the volume leader", () => {
    const d = snap(makeBars({ spotVol: 1e6, perpVol: 2e7 }));
    assert.equal(d.model, "GDI-1.3");
    assert.ok(d.perpVol.share > 85, "raw notional is perp-heavy");
    assert.ok(Math.abs(d.spotVol.eqShare - 50) < 8, `eqShare should be ~50, got ${d.spotVol.eqShare}`);
    assert.ok(Math.abs(d.components.vol) < 0.15, `vol component should be ~0, got ${d.components.vol}`);
  });

  it("spot volume spike vs own baseline shifts eqShare and vol component to spot", () => {
    const d = snap(
      makeBars({
        spotVol: (i) => (i > 60 ? 4e6 : 1e6),
        perpVol: 2e7,
      }),
    );
    assert.ok(d.spotVol.eqShare > 55, `spot eqShare ${d.spotVol.eqShare}`);
    assert.ok(d.components.vol < -0.05, `vol should lean spot, got ${d.components.vol}`);
  });

  it("opposite taker flow marks a fight even when prices co-move", () => {
    const d = snap(
      makeBars({
        spotVol: 1e6,
        perpVol: 2e7,
        spotBuyFrac: 0.82,
        perpBuyFrac: 0.18,
        spotLead: false,
      }),
    );
    assert.equal(d.spotPull.dir, "up");
    assert.equal(d.perpPull.dir, "down");
    assert.equal(d.coupling, "fight");
    assert.ok(d.spotPull.buy > d.spotPull.sell);
    assert.ok(d.perpPull.sell > d.perpPull.buy);
  });

  it("sync vectors add into a larger net pull", () => {
    const d = snap(
      makeBars({
        spotVol: 1e6,
        perpVol: 2e7,
        spotBuyFrac: 0.78,
        perpBuyFrac: 0.78,
        spotLead: true,
      }),
    );
    assert.equal(d.netPull.dir, "up");
    assert.ok(d.netPull.score > d.spotPull.score);
    assert.ok(d.netPull.score > d.perpPull.score);
    assert.ok(d.prevPx > 0);
    assert.ok(Number.isFinite(d.barRetPct));
  });

  it("static perp premium on an up tape does not crown perps", () => {
    const bars: Bar[] = [];
    let spot = 100;
    for (let i = 0; i < 80; i++) {
      spot *= 1.0007;
      const perp = spot * 1.0008;
      bars.push({
        t: 1_700_000_000_000 + i * 60_000,
        spot,
        perp,
        spotVol: 1e6,
        perpVol: 2e7,
        oi: 1e9,
        spotBuy: 5e5,
        spotSell: 5e5,
        perpBuy: 1e7,
        perpSell: 1e7,
      });
    }
    const d = snap(bars);
    assert.ok(Math.abs(d.components.basis) < 0.22, `basis ${d.components.basis}`);
    assert.ok(Math.abs(d.components.oi) < 0.08, `oi ${d.components.oi}`);
    assert.ok(Math.abs(d.g) < 0.22, `G ${d.g}`);
    assert.ok(d.confidence < 0.55, `glued tape must not look certain, confidence ${d.confidence}`);
  });
});

describe("venue pits", () => {
  it("parses known venues and defaults unknown to okx", () => {
    assert.equal(parseVenue("binance"), "binance");
    assert.equal(parseVenue("BYBIT"), "bybit");
    assert.equal(parseVenue("all"), "all");
    assert.equal(parseVenue("market"), "all");
    assert.equal(parseVenue("nope"), "okx");
    assert.equal(parseVenue(undefined), "okx");
  });

  it("consensus uses live majority, not a blend of candles", () => {
    const row = (venue: "okx" | "binance" | "bybit", g: number, source: "okx" | "binance" | "demo") => ({
      venue,
      source,
      g,
      spotShare: 50 * (1 - g),
      perpShare: 50 * (1 + g),
      coupling: "quiet" as const,
      spotPull: 0,
      perpPull: 0,
      confidence: 0.7,
      spot: 100,
    });
    const split = decideConsensus([
      row("okx", -0.4, "okx"),
      row("binance", 0.5, "binance"),
      row("bybit", 0.1, "demo"),
    ]);
    assert.equal(split.id, "split");
    assert.equal(split.live, 2);

    const spot = decideConsensus([
      row("okx", -0.4, "okx"),
      row("binance", -0.3, "binance"),
      row("bybit", 0.8, "demo"),
    ]);
    assert.equal(spot.id, "agree_spot");
    assert.ok(spot.g < 0);

    const thin = decideConsensus([row("okx", 0.5, "okx"), row("binance", -0.4, "demo")]);
    assert.equal(thin.id, "quiet");
    assert.equal(thin.live, 1);
  });
});
