import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn, formatPct, formatPx, formatUsdCompact } from "@/lib/utils";
import type {
  CouplingId,
  GravityPoint,
  GravitySnapshot,
  NetAgree,
  NetPull,
  PullDir,
  VenuePull,
  VenueVolume,
} from "@/lib/types";
import {
  agreeLabel,
  couplingBlurb,
  couplingLabel,
  flowHint,
  pullDirLabel,
  tfShort,
  ui,
} from "@/lib/copy";

export function PullVectors({ data }: { data: GravitySnapshot }) {
  const t = ui;
  const dur = tfShort(data.interval, data.window);

  return (
    <section className="rounded-xl bg-surface p-5 shadow-border sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-subtle">
            {t.vectors} · {dur}
          </p>
          <p className={cn("mt-1 font-display text-xl text-fg", couplingTone(data.coupling))}>
            {couplingLabel(data.coupling)}
          </p>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted text-pretty">
          {couplingBlurb(data)}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <VenueCard
          label={t.spot}
          tone="spot"
          pull={data.spotPull}
          vol={data.spotVol}
        />
        <VenueCard
          label={t.perp}
          tone="perp"
          pull={data.perpPull}
          vol={data.perpVol}
        />
      </div>

      <ResultantPanel data={data} />

      <AlignMeter score={data.couplingScore} />

      <p className="mt-5 mb-2 text-xs tracking-wide text-subtle">{t.pullRibbon}</p>
      <PullRibbon series={data.series} />
    </section>
  );
}

function VenueCard({
  label,
  tone,
  pull,
  vol,
  }: {
  label: string;
  tone: "spot" | "perp";
  pull: VenuePull;
  vol: VenueVolume;
  }) {
  const t = ui;
  return (
    <div className="rounded-lg bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn("text-xs tracking-wide", tone === "spot" ? "text-spot" : "text-perp")}>
            {label}
          </p>
          <p
            className={cn(
              "mt-1 flex items-center gap-1.5 font-display text-2xl leading-tight",
              dirTone(pull.dir),
            )}
          >
            <DirGlyph dir={pull.dir} />
            {pullDirLabel(pull.dir)}
          </p>
        </div>
        <p className={cn("font-mono text-sm tabular-nums", dirTone(pull.dir))}>
          {formatPct(pull.retPct)}
        </p>
      </div>
      <ForceBar score={pull.score} />
      <TakerSplit pull={pull} tone={tone} />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{flowHint(pull.flow)}</p>
        <p className="font-mono text-xs tabular-nums text-subtle">
          {t.force} {pull.score >= 0 ? "+" : ""}
          {pull.score.toFixed(2)}
        </p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="font-mono text-xs tabular-nums text-muted">{formatUsdCompact(vol.total)}</p>
        <p
          className={cn(
            "font-mono text-xs tabular-nums",
            vol.deltaPct >= 0 ? "text-up" : "text-down",
          )}
        >
          {formatPct(vol.deltaPct, 0)} {t.volVsAvg}
        </p>
      </div>
    </div>
  );
}

function ResultantPanel({ data }: { data: GravitySnapshot }) {
  const t = ui;
  const net = data.netPull ?? fallbackNet(data);
  const prevPx = Number.isFinite(data.prevPx)
    ? data.prevPx
    : (data.series.at(-2)?.spot ?? data.spot);
  const barRet = Number.isFinite(data.barRetPct)
    ? data.barRetPct
    : prevPx > 0
      ? ((data.spot - prevPx) / prevPx) * 100
      : 0;
  const s = data.spotPull.score;
  const p = data.perpPull.score;

  return (
    <div className="mt-5 rounded-lg bg-surface-2 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-wide text-subtle">
            {t.netVector} · {t.netSum} · {data.interval}
          </p>
          <p
            className={cn(
              "mt-1 flex items-center gap-1.5 font-display text-2xl leading-tight",
              dirTone(net.dir),
            )}
          >
            <DirGlyph dir={net.dir} />
            {pullDirLabel(net.dir)}
            <span className="font-mono text-base tabular-nums">
              {net.score >= 0 ? "+" : ""}
              {net.score.toFixed(2)}
            </span>
          </p>
          <NetBar spot={s} perp={p} net={net.score} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="font-mono tabular-nums text-spot">
              {t.spot} {s >= 0 ? "+" : ""}
              {s.toFixed(2)}
            </span>
            <span className="font-mono tabular-nums text-perp">
              {t.perp} {p >= 0 ? "+" : ""}
              {p.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="grid min-w-[16rem] grid-cols-3 gap-3 lg:min-w-[20rem]">
          <PriceCell label={`${data.interval} ${t.priceAgo}`} value={formatPx(prevPx)} />
          <PriceCell label={t.priceNow} value={formatPx(data.spot)} />
          <PriceCell
            label={t.barMove}
            value={formatPct(barRet)}
            tone={barRet > 0.025 ? "up" : barRet < -0.025 ? "down" : undefined}
          />
        </div>
      </div>
      <p className={cn("mt-3 text-sm", agreeTone(net.agree))}>{agreeLabel(net.agree)}</p>
    </div>
  );
}

function fallbackNet(data: GravitySnapshot): NetPull {
  const score = Math.max(-2, Math.min(2, data.spotPull.score + data.perpPull.score));
  const dir: PullDir = Math.abs(score) < 0.16 ? "flat" : score > 0 ? "up" : "down";
  return { score, dir, agree: "weak" };
}

function PriceCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div>
      <p className="text-xs text-subtle">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-sm tabular-nums",
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function NetBar({ spot, perp, net }: { spot: number; perp: number; net: number }) {
  const toPct = (v: number) => 50 + (v / 2) * 50;
  const z = 50;
  const a = toPct(spot);
  const b = toPct(spot + perp);
  const netLeft = net >= 0 ? z : toPct(net);
  const netWidth = Math.abs(net) * 25;
  return (
    <div className="relative mt-4 h-3 rounded-full bg-bg">
      <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
      <div
        className="absolute top-0.5 h-2 rounded-full bg-spot/70"
        style={{
          left: `${Math.min(z, a)}%`,
          width: `${Math.abs(a - z)}%`,
        }}
      />
      <div
        className="absolute top-0.5 h-2 rounded-full bg-perp/70"
        style={{
          left: `${Math.min(a, b)}%`,
          width: `${Math.abs(b - a)}%`,
        }}
      />
      <div
        className={cn("absolute top-0 h-3 rounded-full", net >= 0 ? "bg-up" : "bg-down")}
        style={{
          left: `${netLeft}%`,
          width: `${netWidth}%`,
          opacity: 0.35 + Math.min(0.55, Math.abs(net) * 0.35),
        }}
      />
    </div>
  );
}

function ForceBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.abs(score) * 100);
  const up = score >= 0;
  return (
    <div className="relative mt-4 h-2.5 rounded-full bg-bg">
      <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
      <div
        className={cn(
          "absolute top-0 h-2.5 rounded-full transition-[width,left] duration-500",
          up ? "bg-up" : "bg-down",
        )}
        style={{
          width: `${pct / 2}%`,
          left: up ? "50%" : `${50 - pct / 2}%`,
          transitionTimingFunction: "var(--ease-smooth-out)",
        }}
      />
    </div>
  );
}

function TakerSplit({
  pull,
  tone,
  }: {
  pull: VenuePull;
  tone: "spot" | "perp";
  }) {
  const t = ui;
  const buy = pull.buy ?? 0;
  const sell = pull.sell ?? 0;
  const tot = buy + sell;
  if (tot < 1e-8) {
    return <p className="mt-3 text-xs text-subtle">{t.takerNone}</p>;
  }
  const buyPct = (buy / tot) * 100;
  const sellPct = 100 - buyPct;
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="tracking-wide text-subtle">{t.takerFlow}</span>
        <span className="font-mono tabular-nums text-muted">{formatUsdCompact(tot)}</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full bg-up transition-[width] duration-500"
          style={{
            width: `${buyPct}%`,
            transitionTimingFunction: "var(--ease-smooth-out)",
          }}
        />
        <div
          className="h-full bg-down transition-[width] duration-500"
          style={{
            width: `${sellPct}%`,
            transitionTimingFunction: "var(--ease-smooth-out)",
          }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-mono text-xs tabular-nums">
        <span className="text-up">
          {t.takerBuy} {buyPct.toFixed(0)}% · {formatUsdCompact(buy)}
        </span>
        <span className="text-down">
          {t.takerSell} {sellPct.toFixed(0)}% · {formatUsdCompact(sell)}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-subtle">
        {tone === "perp" ? t.takerNotePerp : t.takerNoteSpot}
      </p>
    </div>
  );
}

function AlignMeter({ score }: { score: number }) {
  const t = ui;
  const pct = Math.min(100, Math.abs(score) * 100);
  const sync = score >= 0;
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-xs tracking-wide text-subtle">
        <span>{t.fight}</span>
        <span>{t.sync}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-bg">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
        <div
          className="absolute top-0 h-2.5 rounded-full bg-fg transition-[width,left] duration-500"
          style={{
            width: `${pct / 2}%`,
            left: sync ? "50%" : `${50 - pct / 2}%`,
            transitionTimingFunction: "var(--ease-smooth-out)",
          }}
        />
      </div>
    </div>
  );
}

function PullRibbon({ series }: { series: GravityPoint[] }) {
  const t = ui;
  const slice = series.slice(-64);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-xs text-spot">{t.spot}</span>
        <RibbonRow points={slice} field="spotPull" />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-xs text-perp">{t.perp}</span>
        <RibbonRow points={slice} field="perpPull" />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-xs text-fg">{t.netSum}</span>
        <RibbonRow points={slice} field="netPull" />
      </div>
    </div>
  );
}

function RibbonRow({
  points,
  field,
}: {
  points: GravityPoint[];
  field: "spotPull" | "perpPull" | "netPull";
}) {
  return (
    <div className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-bg">
      {points.map((p) => {
        const v = field === "netPull" ? (p.netPull ?? p.spotPull + p.perpPull) : p[field];
        return (
          <span
            key={`${field}-${p.t}`}
            className="h-full flex-1"
            style={{
              backgroundColor:
                v > 0.1
                  ? "var(--color-up)"
                  : v < -0.1
                    ? "var(--color-down)"
                    : "var(--color-coupled)",
              opacity: 0.38 + Math.min(0.62, Math.abs(v) * 1.15),
            }}
          />
        );
      })}
    </div>
  );
}

function DirGlyph({ dir }: { dir: PullDir }) {
  const cls = "size-5 shrink-0";
  if (dir === "up") return <ArrowUp className={cls} strokeWidth={2.2} />;
  if (dir === "down") return <ArrowDown className={cls} strokeWidth={2.2} />;
  return <Minus className={cls} strokeWidth={2.2} />;
}

function dirTone(dir: PullDir): string {
  if (dir === "up") return "text-up";
  if (dir === "down") return "text-down";
  return "text-muted";
}

function couplingTone(id: CouplingId): string {
  if (id === "sync_up") return "text-up";
  if (id === "sync_down") return "text-down";
  return "text-fg";
}

function agreeTone(id: NetAgree): string {
  if (id === "hit") return "text-up";
  if (id === "miss") return "text-down";
  return "text-muted";
}
