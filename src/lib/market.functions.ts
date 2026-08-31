import { createServerFn } from "@tanstack/react-start";
import { INTERVALS, SYMBOLS, WINDOWS, type Interval, type SymbolCode } from "./types";

function parseInput(raw: unknown): {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
} {
  const data = (raw ?? {}) as Record<string, unknown>;
  const symbolRaw = String(data.symbol ?? "BTC").toUpperCase();
  const intervalRaw = String(data.interval ?? "5m");
  const windowRaw = Number(data.window ?? 48);
  const symbol = (SYMBOLS as readonly string[]).includes(symbolRaw)
    ? (symbolRaw as SymbolCode)
    : "BTC";
  const interval = (INTERVALS as readonly string[]).includes(intervalRaw)
    ? (intervalRaw as Interval)
    : "5m";
  const window = (WINDOWS as readonly number[]).includes(windowRaw)
    ? windowRaw
    : 48;
  return { symbol, interval, window };
}

export const getGravity = createServerFn({ method: "GET" })
  .validator(parseInput)
  .handler(async ({ data }) => {
    const { loadGravity } = await import("./okx.server");
    return loadGravity(data);
  });
