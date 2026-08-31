import { PIT_ALL, VENUES, type PitId } from "@/lib/types";
import { type Lang, ui, venueBooks, venueLabel } from "@/lib/copy";
import { cn } from "@/lib/utils";

const DOCK: PitId[] = [...VENUES, PIT_ALL];

export function PitDock({
  venue,
  onChange,
  lang,
}: {
  venue: PitId;
  onChange: (id: PitId) => void;
  lang: Lang;
}) {
  const t = ui[lang];
  return (
    <section className="rounded-xl bg-surface p-3 shadow-border sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs tracking-wide text-subtle">{t.pits}</p>
        <p className="max-w-xl text-xs text-muted text-pretty">{t.pitsHint}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {DOCK.map((id) => {
          const on = id === venue;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={on}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-[box-shadow,background] duration-150",
                on ? "bg-surface-2 shadow-border-hover" : "bg-bg shadow-border hover:shadow-border-hover",
              )}
            >
              <Well on={on} />
              <span className="min-w-0">
                <span className="block font-display text-sm text-fg">{venueLabel(lang, id)}</span>
                <span className="block truncate font-mono text-xs text-subtle">
                  {venueBooks(lang, id)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Well({ on }: { on: boolean }) {
  return (
    <span className="relative size-8 shrink-0" aria-hidden>
      <span
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: on
            ? "inset 0 0 0 1px color-mix(in srgb, var(--color-fg) 35%, transparent)"
            : "inset 0 0 0 1px color-mix(in srgb, var(--color-fg) 14%, transparent)",
        }}
      />
      <span
        className="absolute inset-[6px] rounded-full"
        style={{
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-fg) 18%, transparent)",
        }}
      />
      <span
        className="absolute inset-[11px] rounded-full"
        style={{
          background: on ? "var(--color-fg)" : "transparent",
          boxShadow: on
            ? "0 0 10px color-mix(in srgb, var(--color-fg) 35%, transparent)"
            : "inset 0 0 0 1px color-mix(in srgb, var(--color-fg) 22%, transparent)",
        }}
      />
    </span>
  );
}
