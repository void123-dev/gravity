import { useEffect, useState } from "react";
import { GRAVITY_POLL_MS } from "@/lib/query-gravity";
import { cn, clamp } from "@/lib/utils";
import { type Lang, sourceLabel, ui } from "@/lib/copy";
import type { DataSource, PitId } from "@/lib/types";

function useNow(resetKey: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(id);
  }, [resetKey]);
  return now;
}

export function LiveSync({
  updatedAt,
  fetching,
  source,
  venue,
  lang,
  onRefresh,
}: {
  updatedAt: number;
  fetching: boolean;
  source?: DataSource;
  venue?: PitId;
  lang: Lang;
  onRefresh: () => void;
}) {
  const t = ui[lang];
  const now = useNow(updatedAt);
  const linear =
    now === null || !updatedAt
      ? 1
      : clamp(1 - (now - updatedAt) / GRAVITY_POLL_MS, 0, 1);
  const freshness = linear ** 1.85;
  const remain =
    now === null
      ? Math.ceil(GRAVITY_POLL_MS / 1000)
      : Math.max(0, Math.ceil((GRAVITY_POLL_MS - Math.max(0, now - updatedAt)) / 1000));
  const glow = Number((4 + freshness * 18).toFixed(2));
  const mix = Math.round(16 + freshness * 84);
  const coreOpacity = Number((0.14 + freshness * 0.86).toFixed(3));
  const haloOpacity = Number((fetching ? 0.45 : 0.1 + freshness * 0.35).toFixed(3));
  const title = fetching
    ? t.syncing
    : freshness > 0.88
      ? t.syncFresh
      : `${t.syncIn} ${remain}s`;

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={fetching}
      title={title}
      aria-label={title}
      className="inline-flex h-9 items-center gap-2 rounded-full bg-surface-2 px-3 text-xs text-muted transition-[color] duration-150 hover:text-fg disabled:opacity-90"
    >
      <span className="relative size-3 shrink-0">
        <span
          className={cn("absolute inset-0 rounded-full", fetching && "animate-ping")}
          style={{ background: "var(--color-up)", opacity: haloOpacity }}
        />
        <span
          className="absolute inset-[3px] rounded-full"
          style={{
            background: "var(--color-up)",
            opacity: coreOpacity,
            boxShadow: `0 0 ${glow}px color-mix(in srgb, var(--color-up) ${mix}%, transparent)`,
          }}
        />
      </span>
      <span className="font-mono tabular-nums">
        {sourceLabel(lang, source, venue)}
      </span>
      <span
        className="min-w-[2ch] font-mono tabular-nums"
        style={{
          color: `color-mix(in srgb, var(--color-up) ${mix}%, var(--color-subtle))`,
        }}
      >
        {remain}s
      </span>
    </button>
  );
}
