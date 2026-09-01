import { cn } from "@/lib/utils";
import type { GravityComponents } from "@/lib/types";
import { ui } from "@/lib/copy";

const KEYS = ["lead", "basis", "flow", "oi", "vol"] as const;

export function Contributions({
  components,
  }: {
  components: GravityComponents;
  }) {
  const t = ui;
  const labels: Record<(typeof KEYS)[number], string> = {
    lead: t.lead,
    basis: t.basisComp,
    flow: t.flow,
    oi: t.oiComp,
    vol: t.volComp,
  };

  return (
    <div className="flex flex-col gap-3">
      {KEYS.map((key) => {
        const v = components[key] ?? 0;
        const pct = Math.min(100, Math.abs(v) * 100);
        const perp = v >= 0;
        return (
          <div key={key} className="grid grid-cols-[7.5rem_1fr_3.25rem] items-center gap-3">
            <p className="truncate text-xs text-muted">{labels[key]}</p>
            <div className="relative h-2 rounded-full bg-surface-2">
              <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
              <div
                className={cn(
                  "absolute top-0 h-2 rounded-full transition-[width,left] duration-500",
                  perp ? "bg-perp" : "bg-spot",
                )}
                style={{
                  width: `${pct / 2}%`,
                  left: perp ? "50%" : `${50 - pct / 2}%`,
                  transitionTimingFunction: "var(--ease-smooth-out)",
                }}
              />
            </div>
            <p
              className={cn(
                "text-right font-mono text-xs tabular-nums",
                perp ? "text-perp" : "text-spot",
              )}
            >
              {v >= 0 ? "+" : ""}
              {v.toFixed(2)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
