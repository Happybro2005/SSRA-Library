"use client";

import { useState } from "react";

export type BoardShift = { id: string; name: string; hours: string; taken: number[] };

/**
 * The reading hall drawn as a seat plan. Free desks glow like a lit lamp; booked ones stay dark.
 * Only seat numbers are shown — never who is sitting where.
 */
export function SeatBoard({
  seats,
  shifts,
  labels,
  ctaHref,
}: {
  seats: number[];
  shifts: BoardShift[];
  labels: { hall: string; plan: string; freeOf: string; free: string; taken: string; note: string; cta: string };
  ctaHref: string;
}) {
  const [active, setActive] = useState(shifts[0]?.id ?? "");
  const shift = shifts.find((s) => s.id === active) ?? shifts[0];
  const taken = new Set(shift?.taken ?? []);
  const free = seats.filter((n) => !taken.has(n)).length;

  return (
    <div className="relative rounded-[1.75rem] bg-[#0b1036] p-4 shadow-2xl ring-1 ring-white/10 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">{labels.plan}</div>
          <div className="font-poster text-3xl font-extrabold uppercase leading-none text-white">{labels.hall}</div>
        </div>
        <div className="text-right font-mono text-sm text-lamp" aria-live="polite">
          {labels.freeOf.replace("{free}", String(free)).replace("{total}", String(seats.length))}
        </div>
      </div>

      {shifts.length > 1 && (
        <div role="tablist" aria-label="Shift" className="mb-4 grid gap-1 rounded-xl bg-white/5 p-1" style={{ gridTemplateColumns: `repeat(${shifts.length}, minmax(0, 1fr))` }}>
          {shifts.map((s) => (
            <button
              key={s.id}
              role="tab"
              type="button"
              aria-selected={s.id === shift?.id}
              onClick={() => setActive(s.id)}
              className={`rounded-lg px-2 py-1.5 text-left transition ${s.id === shift?.id ? "bg-white text-navy-dark" : "text-white/70 hover:bg-white/10"}`}
            >
              <span className="block text-sm font-semibold leading-tight">{s.name}</span>
              <span className={`block font-mono text-[10px] leading-tight ${s.id === shift?.id ? "text-slate-500" : "text-white/45"}`}>{s.hours}</span>
            </button>
          ))}
        </div>
      )}

      <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label={labels.hall}>
        {seats.map((n, i) => {
          const isTaken = taken.has(n);
          return (
            <li
              key={`${shift?.id}-${n}`}
              className={`desk-on grid aspect-square place-items-center rounded-md font-mono text-[11px] font-semibold sm:text-xs ${
                isTaken
                  ? "bg-white/[0.06] text-white/30"
                  : "bg-lamp text-navy-dark shadow-[0_0_14px_-2px_rgba(255,200,61,0.65)]"
              }`}
              style={{ animationDelay: `${Math.min(i * 12, 500)}ms` }}
              aria-label={`Desk ${n}, ${isTaken ? labels.taken : labels.free}`}
            >
              {n}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 font-mono text-[11px] text-white/60">
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-sm bg-lamp" aria-hidden /> {labels.free}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-sm bg-white/15" aria-hidden /> {labels.taken}
          </span>
        </div>
        <a href={ctaHref} className="btn btn-sm bg-lamp text-navy-dark hover:bg-amber-300">
          {labels.cta}
        </a>
      </div>
      <p className="mt-3 text-xs text-white/45">{labels.note}</p>
    </div>
  );
}
