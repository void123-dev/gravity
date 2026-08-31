import { useQueries } from "@tanstack/react-query";
import { fetchGravity, GRAVITY_POLL_MS } from "@/lib/query-gravity";
import { INTERVALS, type Interval, type PitId, type SymbolCode, type WindowSize } from "@/lib/types";
import { type Lang, couplingShort, ui } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { CouplingId } from "@/lib/types";

export function TimeframeStrip({
  symbol,
  interval,
  windowSize,
  venue,
  lang,
  onPick,
}: {
  symbol: SymbolCode;
  interval: Interval;
  windowSize: WindowSize;
  venue: PitId;
  lang: Lang;
  onPick: (iv: Interval) => void;
}) {
  const t = ui[lang];
  const queries = useQueries({
    queries: INTERVALS.map((iv) => ({
      queryKey: ["gravity", venue, symbol, iv, windowSize],
      queryFn: () => fetchGravity({ symbol, interval: iv, window: windowSize, venue }),
      staleTime: 10_000,
      refetchInterval: GRAVITY_POLL_MS,
    })),
  });

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs tracking-wide text-subtle">{t.tfScan}</p>
      <div className="chip-row flex gap-2 overflow-x-auto pb-1">
        {INTERVALS.map((iv, i) => {
          const snap = queries[i]?.data;
          const on = iv === interval;
          return (
            <button
              key={iv}
              type="button"
              onClick={() => onPick(iv)}
              className={cn(
                "flex min-w-[4.75rem] flex-col items-start rounded-lg px-3 py-2 text-left transition-[background-color,color] duration-150",
                on ? "bg-fg text-bg" : "bg-surface-2 text-fg hover:text-fg",
              )}
            >
              <span className="font-mono text-xs tabular-nums">{iv}</span>
              <span
                className={cn(
                  "mt-0.5 text-xs",
                  on ? "text-bg/70" : snap ? couplingTone(snap.coupling) : "text-subtle",
                )}
              >
                {snap ? couplingShort(lang, snap.coupling) : "…"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function couplingTone(id: CouplingId): string {
  switch (id) {
    case "sync_up":
      return "text-up";
    case "sync_down":
      return "text-down";
    case "fight":
      return "text-perp";
    case "spot_alone":
      return "text-spot";
    case "perp_alone":
      return "text-perp";
    default:
      return "text-muted";
  }
}
