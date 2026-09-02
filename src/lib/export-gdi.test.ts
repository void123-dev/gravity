import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeGravity } from "./gravity.ts";
import { EXPORT_API, packExport, snapshotToCsv } from "./export-gdi.ts";
import type { Bar } from "./types.ts";

function bars(): Bar[] {
  const out: Bar[] = [];
  let spot = 100;
  let perp = 100.02;
  for (let i = 0; i < 80; i++) {
    const shock = i % 5 === 0 ? 0.0008 : -0.0003;
    perp *= 1 + shock;
    spot *= 1 + shock * 0.4;
    out.push({
      t: 1_700_000_000_000 + i * 60_000,
      spot,
      perp,
      spotVol: 1e6,
      perpVol: 2e6,
      oi: 1e9,
      spotBuy: 5e5,
      spotSell: 5e5,
      perpBuy: 1.1e6,
      perpSell: 9e5,
    });
  }
  return out;
}

describe("GDI export", () => {
  it("JSON envelope keeps the snapshot G and does not invent a second model", () => {
    const snapshot = computeGravity({
      bars: bars(),
      window: 48,
      symbol: "BTC",
      interval: "5m",
      venue: "okx",
      source: "okx",
      funding: 0,
      premium: 0,
      oiUsd: 1e9,
    });
    const pack = packExport(snapshot, 1_700_000_000_000);
    assert.equal(pack.api, EXPORT_API);
    assert.equal(pack.model, "GDI-1.3");
    assert.equal(pack.snapshot.g, snapshot.g);
    assert.equal(pack.snapshot.series.length, snapshot.series.length);
    assert.equal(pack.query.venue, "okx");
  });

  it("CSV includes series header and G comment", () => {
    const snapshot = computeGravity({
      bars: bars(),
      window: 48,
      symbol: "BTC",
      interval: "5m",
      venue: "okx",
      source: "okx",
      funding: 0,
      premium: 0,
      oiUsd: 1e9,
    });
    const csv = snapshotToCsv(snapshot);
    assert.match(csv, /^# GDI-1.3 export/m);
    assert.match(csv, /g,spotShare,perpShare/);
    assert.ok(csv.split("\n").length > snapshot.series.length);
  });
});
