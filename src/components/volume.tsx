import { cn, formatPct, formatUsdCompact } from "@/lib/utils";
import type { GravitySnapshot, VenueVolume } from "@/lib/types";
import { type Lang, tfShort, ui, volumeBlurb } from "@/lib/copy";
import { VolumeChart } from "@/components/charts";

export function VolumePanel({ data, lang }: { data: GravitySnapshot; lang: Lang }) {
  const t = ui[lang];
  const dur = tfShort(data.interval, data.window, lang);

  return (
    <section className="rounded-xl bg-surface p-5 shadow-border sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-subtle">
            {t.volWindow} · {dur}
          </p>
          <p className="mt-1 font-display text-xl text-fg">
            {t.volEq}: {t.spot} {data.spotVol.eqShare.toFixed(0)}% · {t.perp}{" "}
            {data.perpVol.eqShare.toFixed(0)}%
          </p>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted text-pretty">
          {volumeBlurb(data, lang)}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <VolCard label={t.spot} tone="spot" vol={data.spotVol} lang={lang} />
        <VolCard label={t.perp} tone="perp" vol={data.perpVol} lang={lang} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs tracking-wide text-subtle">
          <span className="text-spot">
            {t.spot} {data.spotVol.eqShare.toFixed(0)}%
          </span>
          <span>{t.volShare}</span>
          <span className="text-perp">
            {t.perp} {data.perpVol.eqShare.toFixed(0)}%
          </span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full bg-spot transition-[width] duration-500"
            style={{
              width: `${data.spotVol.eqShare}%`,
              transitionTimingFunction: "var(--ease-smooth-out)",
            }}
          />
          <div
            className="h-full bg-perp transition-[width] duration-500"
            style={{
              width: `${data.perpVol.eqShare}%`,
              transitionTimingFunction: "var(--ease-smooth-out)",
            }}
          />
        </div>
        <p className="mt-2 text-center font-mono text-xs tabular-nums text-subtle">
          {t.volNotional} {data.spotVol.share.toFixed(0)}/{data.perpVol.share.toFixed(0)}
        </p>
      </div>

      <p className="mt-5 mb-2 text-xs tracking-wide text-subtle">{t.volChart}</p>
      <VolumeChart series={data.series} interval={data.interval} lang={lang} />
    </section>
  );
}

function VolCard({
  label,
  tone,
  vol,
  lang,
}: {
  label: string;
  tone: "spot" | "perp";
  vol: VenueVolume;
  lang: Lang;
}) {
  const t = ui[lang];
  const hot = vol.deltaPct >= 0;
  return (
    <div className="rounded-lg bg-surface-2 p-4">
      <p className={cn("text-xs tracking-wide", tone === "spot" ? "text-spot" : "text-perp")}>
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl tabular-nums leading-tight text-fg">
        {formatUsdCompact(vol.total)}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {t.volLast} {formatUsdCompact(vol.last)}
        </p>
        <p className={cn("font-mono text-xs tabular-nums", hot ? "text-up" : "text-down")}>
          {formatPct(vol.deltaPct, 0)} {t.volVsAvg}
        </p>
      </div>
    </div>
  );
}
