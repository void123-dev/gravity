import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildVenueCatalog, pickDefaultVenue, sortVenuePits, type VenuePitInfo } from "./catalog.ts";

const pit = (
  id: string,
  source: "live" | "demo",
  volumeUsd: number,
): VenuePitInfo => ({
  id,
  label: id.toUpperCase(),
  source,
  volumeUsd,
});

describe("venue catalog", () => {
  it("sorts live first, then volumeUsd desc, then id", () => {
    const sorted = sortVenuePits([
      pit("binance", "demo", 5_100_000_000),
      pit("bybit", "demo", 530_000_000),
      pit("okx", "live", 1_800_000_000),
    ]);
    assert.deepEqual(
      sorted.map((p) => p.id),
      ["okx", "binance", "bybit"],
    );
  });

  it("picks the first live pit even when a demo book is larger", () => {
    const pits = sortVenuePits([
      pit("binance", "demo", 9e9),
      pit("okx", "live", 1e8),
      pit("bybit", "demo", 2e9),
    ]);
    assert.equal(pickDefaultVenue(pits), "okx");
    const catalog = buildVenueCatalog(pits);
    assert.equal(catalog.default.venue, "okx");
    assert.equal(catalog.default.interval, "5m");
    assert.equal(catalog.default.window, 48);
    assert.equal(catalog.consensus, "all");
    assert.equal(catalog.pits[0]?.id, "okx");
  });

  it("falls back to largest-volume demo when nothing is live", () => {
    const pits = [
      pit("bybit", "demo", 100),
      pit("binance", "demo", 500),
    ];
    assert.equal(pickDefaultVenue(pits), "binance");
    assert.equal(buildVenueCatalog(pits).pits[0]?.source, "demo");
  });

  it("ranks two live pits by volume, not id", () => {
    const sorted = sortVenuePits([
      pit("okx", "live", 100),
      pit("binance", "live", 400),
      pit("bybit", "demo", 9e9),
    ]);
    assert.deepEqual(
      sorted.map((p) => p.id),
      ["binance", "okx", "bybit"],
    );
    assert.equal(pickDefaultVenue(sorted), "binance");
  });
});
