import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/copy";
import { ui } from "@/lib/copy";
import type { PullDir } from "@/lib/types";

type Props = {
  g: number;
  spotShare: number;
  perpShare: number;
  spotDir: PullDir;
  perpDir: PullDir;
  lang: Lang;
};

export function GravityGauge({ g, spotShare, perpShare, spotDir, perpDir, lang }: Props) {
  const t = ui[lang];
  const clamped = Math.max(-1, Math.min(1, g));
  const angle = 180 - (clamped + 1) * 90;
  const rad = (angle * Math.PI) / 180;
  const cx = 160;
  const cy = 148;
  const r = 118;
  const nx = Math.round((cx + r * Math.cos(rad)) * 1000) / 1000;
  const ny = Math.round((cy - r * Math.sin(rad)) * 1000) / 1000;
  const perpWins = clamped > 0.08;
  const spotWins = clamped < -0.08;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 320 176"
        className="h-auto w-full max-w-md"
        role="img"
        aria-label={`${t.gIndex} ${clamped.toFixed(2)}`}
      >
        <path
          d="M30 148 A130 130 0 0 1 160 18"
          fill="none"
          stroke="var(--color-spot)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity={spotWins ? 1 : 0.45}
        />
        <path
          d="M160 18 A130 130 0 0 1 290 148"
          fill="none"
          stroke="var(--color-perp)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity={perpWins ? 1 : 0.45}
        />
        {[0, 45, 90, 135, 180].map((deg) => {
          const a = (deg * Math.PI) / 180;
          const x1 = Math.round((cx + 128 * Math.cos(a)) * 1000) / 1000;
          const y1 = Math.round((cy - 128 * Math.sin(a)) * 1000) / 1000;
          const x2 = Math.round((cx + 138 * Math.cos(a)) * 1000) / 1000;
          const y2 = Math.round((cy - 138 * Math.sin(a)) * 1000) / 1000;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-border-strong)"
              strokeWidth="1.5"
            />
          );
        })}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="var(--color-fg)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="origin-center transition-[x2,y2] duration-500"
          style={{ transitionTimingFunction: "var(--ease-smooth-out)" }}
        />
        <circle cx={cx} cy={cy} r="5.5" fill="var(--color-fg)" />
        <text
          x="36"
          y="168"
          fill="var(--color-spot)"
          fontSize="11"
          letterSpacing="0.14em"
          fontFamily="var(--font-sans)"
        >
          {t.spot.toUpperCase()}
        </text>
        <text
          x="232"
          y="168"
          fill="var(--color-perp)"
          fontSize="11"
          letterSpacing="0.14em"
          fontFamily="var(--font-sans)"
        >
          {t.perp.toUpperCase()}
        </text>
      </svg>
      <div className="mt-1 grid w-full max-w-md grid-cols-2 gap-3 px-2">
        <ShareBlock
          label={t.spot}
          value={spotShare}
          tone="spot"
          active={spotWins}
          dir={spotDir}
        />
        <ShareBlock
          label={t.perp}
          value={perpShare}
          tone="perp"
          active={perpWins}
          dir={perpDir}
          align="right"
        />
      </div>
    </div>
  );
}

function ShareBlock({
  label,
  value,
  tone,
  active,
  dir,
  align = "left",
}: {
  label: string;
  value: number;
  tone: "spot" | "perp";
  active: boolean;
  dir: PullDir;
  align?: "left" | "right";
}) {
  return (
    <div className={cn(align === "right" && "text-right")}>
      <p className="text-xs tracking-wide text-subtle">{label}</p>
      <p
        className={cn(
          "flex items-baseline gap-1.5 font-mono text-3xl tabular-nums leading-tight tracking-tight sm:text-4xl",
          align === "right" && "justify-end",
          tone === "spot" ? "text-spot" : "text-perp",
          !active && "opacity-55",
        )}
      >
        {align === "left" ? <DirMark dir={dir} /> : null}
        <span>
          {value.toFixed(0)}
          <span className="text-lg text-muted">%</span>
        </span>
        {align === "right" ? <DirMark dir={dir} /> : null}
      </p>
    </div>
  );
}

function DirMark({ dir }: { dir: PullDir }) {
  const cls =
    dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-subtle";
  if (dir === "up") return <ArrowUp className={`size-4 ${cls}`} strokeWidth={2.4} />;
  if (dir === "down") return <ArrowDown className={`size-4 ${cls}`} strokeWidth={2.4} />;
  return <Minus className={`size-4 ${cls}`} strokeWidth={2.4} />;
}
