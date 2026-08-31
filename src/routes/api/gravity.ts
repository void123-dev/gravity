import { createFileRoute } from "@tanstack/react-router";
import { INTERVALS, SYMBOLS, WINDOWS, type Interval, type SymbolCode } from "@/lib/types";

function parse(url: URL): {
  symbol: SymbolCode;
  interval: Interval;
  window: number;
} {
  const symbolRaw = (url.searchParams.get("symbol") ?? "BTC").toUpperCase();
  const intervalRaw = url.searchParams.get("interval") ?? "5m";
  const windowRaw = Number(url.searchParams.get("window") ?? 48);
  const symbol = (SYMBOLS as readonly string[]).includes(symbolRaw)
    ? (symbolRaw as SymbolCode)
    : "BTC";
  const interval = (INTERVALS as readonly string[]).includes(intervalRaw)
    ? (intervalRaw as Interval)
    : "5m";
  const window = (WINDOWS as readonly number[]).includes(windowRaw) ? windowRaw : 48;
  return { symbol, interval, window };
}

export const Route = createFileRoute("/api/gravity")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { loadGravity } = await import("@/lib/okx.server");
        const data = await loadGravity(parse(new URL(request.url)));
        return Response.json(data);
      },
    },
  },
});
