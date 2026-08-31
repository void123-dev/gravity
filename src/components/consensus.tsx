import type { GravitySnapshot, PitRow } from "@/lib/types";
import {
  type Lang,
  consensusLabel,
  couplingShort,
  ui,
  venueLabel,
} from "@/lib/copy";
import { cn } from "@/lib/utils";
import { PitGChart } from "@/components/charts";

export function ConsensusBoard({ data, lang }: { data: GravitySnapshot; lang: Lang }) {
  const t = ui[lang];
  const rows = data.pits ?? [];
  const live = data.consensusLive ?? 0;
  const n = rows.length;
  return (
    <section className="rounded-xl bg-surface p-4 shadow-border sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs tracking-wide text-subtle">
          {t.consensus} · {t.medianG}
        </p>
        <p className="font-mono text-xs tabular-nums text-muted">
          {live}/{n} {t.consensusLive}
        </p>
      </div>
      <p className="mt-1 font-display text-xl text-fg">{consensusLabel(lang, data.consensus)}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <PitScore key={row.venue} row={row} lang={lang} />
        ))}
      </div>
      <p className="mt-4 mb-2 text-xs tracking-wide text-subtle">{t.pitsChart}</p>
      <PitGChart series={data.series} interval={data.interval} pits={rows} lang={lang} />
    </section>
  );
}

function PitScore({ row, lang }: { row: PitRow; lang: Lang }) {
  const t = ui[lang];
  const pct = ((row.g + 1) / 2) * 100;
  const demo = row.source === "demo";
  return (
    <div className={cn("rounded-lg bg-surface-2 p-3", demo && "opacity-60")}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-fg">{venueLabel(lang, row.venue)}</p>
        <p className="font-mono text-xs tabular-nums text-muted">
          {demo ? t.demo : t.live}
        </p>
      </div>
      <p
        className={cn(
          "mt-1 font-mono text-lg tabular-nums",
          row.g > 0.12 ? "text-perp" : row.g < -0.12 ? "text-spot" : "text-muted",
        )}
      >
        {row.g >= 0 ? "+" : ""}
        {row.g.toFixed(2)}
      </p>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
        <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
        <span
          className="absolute top-0 h-1.5 rounded-full bg-fg"
          style={{
            left: `${Math.min(pct, 50)}%`,
            width: `${Math.max(2, Math.abs(pct - 50))}%`,
          }}
        />
      </div>
      <p className="mt-2 text-xs text-subtle">
        {couplingShort(lang, row.coupling)} · {row.spotShare.toFixed(0)}/{row.perpShare.toFixed(0)}
      </p>
    </div>
  );
}
