import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { GravityPoint, Interval, PitRow } from "@/lib/types";
import type { Lang } from "@/lib/copy";
import { ui } from "@/lib/copy";
import { formatBps, formatPx, formatUsdCompact } from "@/lib/utils";

type Props = {
  series: GravityPoint[];
  interval: Interval;
  lang: Lang;
};

function tickTime(t: number, interval: Interval) {
  if (interval === "1H" || interval === "4H") return format(t, "MMM d HH:mm");
  return format(t, "HH:mm");
}

function ChartTip({
  active,
  payload,
  label,
  lang,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; dataKey?: string }[];
  label?: number;
  lang: Lang;
}) {
  if (!active || !payload?.length || !label) return null;
  const t = ui[lang];
  const row = Object.fromEntries(payload.map((p) => [String(p.dataKey), p.value]));
  return (
    <div className="rounded-lg bg-surface px-3 py-2 text-xs text-fg shadow-border">
      <p className="mb-1 text-subtle">{format(label, "MMM d HH:mm")}</p>
      {row.spot !== undefined && (
        <p>
          {t.spot}: {formatPx(Number(row.spot))}
        </p>
      )}
      {row.basisBps !== undefined && (
        <p>
          {t.basis}: {formatBps(Number(row.basisBps))}
        </p>
      )}
      {row.spotShare !== undefined && (
        <p>
          {t.spot}: {Number(row.spotShare).toFixed(0)}%
        </p>
      )}
      {row.perpShare !== undefined && (
        <p>
          {t.perp}: {Number(row.perpShare).toFixed(0)}%
        </p>
      )}
      {row.spotVolRel !== undefined && (
        <p>
          {t.spot} {t.volume}: {Number(row.spotVolRel).toFixed(0)}%
        </p>
      )}
      {row.perpVolRel !== undefined && (
        <p>
          {t.perp} {t.volume}: {Number(row.perpVolRel).toFixed(0)}%
        </p>
      )}
      {row.spotVol !== undefined && row.spotVolRel === undefined && (
        <p>
          {t.spot}: {formatUsdCompact(Number(row.spotVol))}
        </p>
      )}
    </div>
  );
}

export function PriceChart({ series, interval, lang }: Props) {
  const t = ui[lang];
  return (
    <div className="h-52 w-full min-w-0 sm:h-60">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v: number) => tickTime(v, interval)}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            yAxisId="px"
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => formatPx(v)}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <YAxis
            yAxisId="bps"
            orientation="right"
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(0)}`}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={<ChartTip lang={lang} />}
            cursor={{ stroke: "var(--color-border-strong)" }}
          />
          <ReferenceLine yAxisId="bps" y={0} stroke="var(--color-border-strong)" />
          <Bar
            yAxisId="bps"
            dataKey="basisBps"
            name={t.basis}
            fill="var(--color-perp)"
            fillOpacity={0.45}
            maxBarSize={8}
          />
          <Line
            yAxisId="px"
            type="monotone"
            dataKey="spot"
            name={t.spot}
            stroke="var(--color-spot)"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GravityChart({ series, interval, lang }: Props) {
  const t = ui[lang];
  return (
    <div className="h-44 w-full min-w-0 sm:h-52">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v: number) => tickTime(v, interval)}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTip lang={lang} />}
            cursor={{ stroke: "var(--color-border-strong)" }}
          />
          <ReferenceLine y={50} stroke="var(--color-border-strong)" strokeDasharray="3 4" />
          <Area
            type="stepAfter"
            stackId="share"
            dataKey="spotShare"
            name={t.spot}
            stroke="var(--color-spot)"
            fill="var(--color-spot)"
            fillOpacity={0.55}
            isAnimationActive={false}
          />
          <Area
            type="stepAfter"
            stackId="share"
            dataKey="perpShare"
            name={t.perp}
            stroke="var(--color-perp)"
            fill="var(--color-perp)"
            fillOpacity={0.55}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function pitStroke(id: string): string {
  if (id === "okx") return "var(--color-spot)";
  if (id === "binance") return "var(--color-perp)";
  if (id === "bybit") return "var(--color-fg)";
  return "var(--color-muted)";
}

export function PitGChart({
  series,
  interval,
  pits,
  lang,
}: {
  series: GravityPoint[];
  interval: Interval;
  pits: PitRow[];
  lang: Lang;
}) {
  const t = ui[lang];
  const ids = pits.map((p) => p.venue);
  const data = series.map((p) => ({ t: p.t, g: p.g, ...(p.pits ?? {}) }));
  return (
    <div className="h-48 w-full min-w-0 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v: number) => tickTime(v, interval)}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[-1, 1]}
            ticks={[-1, 0, 1]}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<ChartTip lang={lang} />} cursor={{ stroke: "var(--color-border-strong)" }} />
          <ReferenceLine y={0} stroke="var(--color-border-strong)" />
          <Line
            type="monotone"
            dataKey="g"
            name={t.medianG}
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {ids.map((id) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              name={id}
              stroke={pitStroke(id)}
              strokeWidth={1.2}
              strokeOpacity={0.85}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeChart({ series, interval, lang }: Props) {
  const t = ui[lang];
  return (
    <div className="h-40 w-full min-w-0 sm:h-48">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-grid)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={(v: number) => tickTime(v, interval)}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[0, "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fill: "var(--color-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTip lang={lang} />}
            cursor={{ stroke: "var(--color-border-strong)" }}
          />
          <ReferenceLine y={100} stroke="var(--color-border-strong)" strokeDasharray="3 4" />
          <Bar
            dataKey="spotVolRel"
            name={t.spot}
            fill="var(--color-spot)"
            fillOpacity={0.75}
            maxBarSize={6}
            isAnimationActive={false}
          />
          <Bar
            dataKey="perpVolRel"
            name={t.perp}
            fill="var(--color-perp)"
            fillOpacity={0.75}
            maxBarSize={6}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DiscoveryRibbon({ series }: { series: GravityPoint[] }) {
  const slice = series.slice(-64);
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
      {slice.map((p) => (
        <span
          key={p.t}
          className="h-full flex-1"
          style={{
            backgroundColor:
              p.g > 0.08
                ? "var(--color-perp)"
                : p.g < -0.08
                  ? "var(--color-spot)"
                  : "var(--color-coupled)",
            opacity: 0.4 + Math.min(0.6, Math.abs(p.g) * 1.2),
          }}
        />
      ))}
    </div>
  );
}
