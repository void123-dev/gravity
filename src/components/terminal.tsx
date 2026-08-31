import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, RefreshCw } from "lucide-react";
import { fetchGravity, GRAVITY_POLL_MS, readBootSnapshot } from "@/lib/query-gravity";
import {
  INTERVALS,
  SYMBOLS,
  WINDOWS,
  type GravitySnapshot,
  type Interval,
  type SymbolCode,
  type VenueId,
  type WindowSize,
} from "@/lib/types";
import {
  METHOD,
  type Lang,
  regimeLabel,
  tfShort,
  ui,
  verdict,
  windowChipLabel,
  windowLabel,
} from "@/lib/copy";
import { formatBps, formatFunding, formatPct, formatPx, formatUsdCompact } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GravityGauge } from "@/components/gauge";
import { Contributions } from "@/components/contributions";
import { DiscoveryRibbon, GravityChart, PriceChart } from "@/components/charts";
import { PullVectors } from "@/components/vectors";
import { VolumePanel } from "@/components/volume";
import { LiveSync } from "@/components/live-sync";
import { TimeframeStrip } from "@/components/timeframe-strip";
import { PitDock } from "@/components/pits";

export function Terminal({ initial }: { initial?: GravitySnapshot }) {
  const [lang, setLang] = useState<Lang>("ru");
  const [symbol, setSymbol] = useState<SymbolCode>("BTC");
  const [interval, setInterval] = useState<Interval>("5m");
  const [windowSize, setWindowSize] = useState<WindowSize>(48);
  const [venue, setVenue] = useState<VenueId>(initial?.venue ?? "okx");
  const [methodOpen, setMethodOpen] = useState(false);
  const [data, setData] = useState<GravitySnapshot | undefined>(
    () => initial ?? readBootSnapshot(),
  );
  const t = ui[lang];
  const method = METHOD[lang];

  const [syncedAt, setSyncedAt] = useState(() => Date.now());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    setData((cur) => (cur?.venue === venue ? cur : undefined));
  }, [venue]);

  const q = useQuery({
    queryKey: ["gravity", venue, symbol, interval, windowSize],
    queryFn: () => fetchGravity({ symbol, interval, window: windowSize, venue }),
    refetchInterval: GRAVITY_POLL_MS,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (q.data) setData(q.data);
  }, [q.data]);

  useEffect(() => {
    if (q.dataUpdatedAt > 0) setSyncedAt(q.dataUpdatedAt);
  }, [q.dataUpdatedAt]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs tracking-widest text-subtle">{t.tag}</p>
          <h1 className="font-display text-3xl font-medium tracking-display text-fg text-balance sm:text-4xl">
            {t.product}
          </h1>
          <p className="mt-1 max-w-md text-sm text-muted text-pretty">{t.sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveSync
            updatedAt={syncedAt}
            fetching={q.isFetching}
            source={data?.source}
            venue={data?.venue ?? venue}
            lang={lang}
            onRefresh={() => void q.refetch()}
          />
          <div className="flex rounded-full bg-surface-2 p-1">
            <Button
              variant={lang === "ru" ? "chipOn" : "ghost"}
              size="sm"
              className="h-8 rounded-full px-3"
              onClick={() => setLang("ru")}
            >
              RU
            </Button>
            <Button
              variant={lang === "en" ? "chipOn" : "ghost"}
              size="sm"
              className="h-8 rounded-full px-3"
              onClick={() => setLang("en")}
            >
              EN
            </Button>
          </div>
        </div>
      </header>

      <PitDock venue={venue} onChange={setVenue} lang={lang} />

      <div className="flex flex-col gap-3">
        <ChipRow>
          {SYMBOLS.map((s) => (
            <Button
              key={s}
              variant={symbol === s ? "chipOn" : "chip"}
              className="rounded-full"
              onClick={() => setSymbol(s)}
            >
              {s}
            </Button>
          ))}
        </ChipRow>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ChipRow>
            {INTERVALS.map((iv) => (
              <Button
                key={iv}
                variant={interval === iv ? "chipOn" : "chip"}
                className="rounded-full"
                onClick={() => setInterval(iv)}
              >
                {iv}
              </Button>
            ))}
          </ChipRow>
          <div className="flex items-center gap-2">
            <span className="text-xs text-subtle">
              {t.window} · {windowLabel(interval, windowSize, lang)}
            </span>
            <ChipRow>
              {WINDOWS.map((w) => (
                <Button
                  key={w}
                  variant={windowSize === w ? "chipOn" : "chip"}
                  className="rounded-full"
                  onClick={() => setWindowSize(w)}
                >
                  {windowChipLabel(w, lang)}
                </Button>
              ))}
            </ChipRow>
          </div>
        </div>
      </div>

      {q.isError && !data ? (
        <div className="rounded-xl bg-surface p-6 shadow-border">
          <p className="text-sm text-muted">{t.error}</p>
          <Button variant="primary" className="mt-4" onClick={() => q.refetch()}>
            <RefreshCw className="size-4" />
            {t.retry}
          </Button>
        </div>
      ) : !data ? (
        <LoadingShell label={t.loading} />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div className="rounded-xl bg-surface p-5 shadow-border sm:p-6">
              <p className="text-xs tracking-wide text-subtle">
                {t.leadingNow} · {data.interval}
              </p>
              <p className="mt-1 font-display text-xl text-fg">
                {regimeLabel(lang, data.regime)}
              </p>
              <GravityGauge
                g={data.g}
                spotShare={data.spotShare}
                perpShare={data.perpShare}
                spotDir={data.spotPull.dir}
                perpDir={data.perpPull.dir}
                lang={lang}
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {data.lag.leader === "tied"
                    ? t.lagTied
                    : data.lag.leader === "perp"
                      ? `${t.lagSpot} ~${data.lag.bars} ${t.bars}`
                      : `${t.lagPerp} ~${data.lag.bars} ${t.bars}`}
                </p>
                <p className="font-mono text-xs tabular-nums text-subtle">
                  {t.confidence} {(data.confidence * 100).toFixed(0)}%
                </p>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-accent transition-[width] duration-500"
                  style={{
                    width: `${data.confidence * 100}%`,
                    transitionTimingFunction: "var(--ease-smooth-out)",
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <Stat label={t.price} value={formatPx(data.spot)} hint={`${data.symbol}-USDT`} />
                <Stat
                  label={t.basis}
                  value={formatBps(data.basisBps)}
                  tone={data.basisBps >= 0 ? "perp" : "spot"}
                />
                <Stat label={t.funding} value={formatFunding(data.funding ?? NaN)} />
                <Stat
                  label={t.oiDelta}
                  value={formatPct(data.oiDeltaPct ?? NaN)}
                  hint={data.oiUsd ? formatUsdCompact(data.oiUsd) : undefined}
                  tone={(data.oiDeltaPct ?? 0) >= 0 ? "up" : "down"}
                />
              </div>
              <div className="rounded-xl bg-surface p-5 shadow-border">
                <p className="mb-4 text-xs tracking-wide text-subtle">{t.components}</p>
                <Contributions components={data.components} lang={lang} />
              </div>
            </div>
          </section>

          <PullVectors data={data} lang={lang} />

          <VolumePanel data={data} lang={lang} />

          <section className="rounded-xl bg-surface p-4 shadow-border sm:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-xs tracking-wide text-subtle">
                {t.price} · {t.spot} + {t.basis}
              </p>
              <p className="font-mono text-xs tabular-nums text-muted">
                {formatPct(data.priceChangePct)} / {tfShort(data.interval, data.window, lang)}
              </p>
            </div>
            <PriceChart series={data.series} interval={data.interval} lang={lang} />
            <p className="mt-5 mb-2 text-xs tracking-wide text-subtle">
              {t.share}: {t.spot} / {t.perp}
            </p>
            <GravityChart series={data.series} interval={data.interval} lang={lang} />
            <p className="mt-4 mb-2 text-xs tracking-wide text-subtle">{t.ribbon}</p>
            <DiscoveryRibbon series={data.series} />
          </section>

          <section className="rounded-xl bg-surface p-5 shadow-border">
            <TimeframeStrip
              symbol={symbol}
              interval={interval}
              windowSize={windowSize}
              venue={venue}
              lang={lang}
              onPick={setInterval}
            />
            <p className="text-sm leading-relaxed text-fg text-pretty">{verdict(data, lang)}</p>
          </section>

          <section className="rounded-xl bg-surface shadow-border">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-between px-5 text-sm text-fg"
              onClick={() => setMethodOpen((v) => !v)}
              aria-expanded={methodOpen}
            >
              {methodOpen ? t.hideMethod : t.method}
              <ChevronDown
                className={`size-4 text-muted transition-transform duration-200 ${methodOpen ? "rotate-180" : ""}`}
              />
            </button>
            {methodOpen ? (
              <div className="space-y-4 border-t border-border px-5 py-5 text-sm text-muted">
                <h2 className="font-display text-lg text-fg">{method.title}</h2>
                <p className="text-pretty">{method.lead}</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <MethodItem title={method.w1} body={method.w1d} />
                  <MethodItem title={method.w2} body={method.w2d} />
                  <MethodItem title={method.w3} body={method.w3d} />
                  <MethodItem title={method.w4} body={method.w4d} />
                  <MethodItem title={method.w5} body={method.w5d} />
                  <MethodItem title={method.dir} body={method.dird} className="sm:col-span-2" />
                  <MethodItem title={method.net} body={method.netd} className="sm:col-span-2" />
                  <MethodItem title={method.pits} body={method.pitsd} className="sm:col-span-2" />
                  <MethodItem title={method.vol} body={method.vold} className="sm:col-span-2" />
                </dl>
                <p className="text-pretty text-fg">{method.read}</p>
                <p className="rounded-lg bg-surface-2 p-4 font-mono text-xs leading-relaxed text-muted">
                  {method.kata}
                </p>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div className="chip-row flex gap-2 overflow-x-auto pb-1">{children}</div>;
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "spot" | "perp" | "up" | "down";
}) {
  const color =
    tone === "spot"
      ? "text-spot"
      : tone === "perp"
        ? "text-perp"
        : tone === "up"
          ? "text-up"
          : tone === "down"
            ? "text-down"
            : "text-fg";
  return (
    <div className="rounded-lg bg-surface p-4 shadow-border">
      <p className="text-xs text-subtle">{label}</p>
      <p className={`mt-1 font-mono text-base tabular-nums sm:text-lg ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function MethodItem({
  title,
  body,
  className,
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-fg">{title}</dt>
      <dd className="mt-1 text-pretty">{body}</dd>
    </div>
  );
}

function LoadingShell({ label }: { label: string }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-xl bg-surface p-8 shadow-border">
        <p className="text-sm text-muted">{label}</p>
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-surface-2" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-surface shadow-border" />
        ))}
      </div>
    </div>
  );
}
