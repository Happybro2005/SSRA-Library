import { timeToMinutes } from "@/lib/membership";
import { formatTime12, minutesNowIST } from "@/lib/hours";

type Shift = { id: string; nameEn: string; startTime: string; endTime: string };

// Same columns for rows, ticks and the "now" line so they all line up; one column on phones.
const COLS = "grid grid-cols-1 gap-x-3 sm:grid-cols-[8rem_1fr]";

/** Opening hours as an axis with one bar per shift, so the timings read at a glance. */
export function DayTimeline({ open, close, shifts, nowLabel }: { open: string; close: string; shifts: Shift[]; nowLabel: string }) {
  const o = timeToMinutes(open);
  const c = timeToMinutes(close);
  const span = Math.max(c - o, 1);
  const pct = (mins: number) => `${Math.min(100, Math.max(0, ((mins - o) / span) * 100))}%`;
  const now = minutesNowIST();
  const isOpen = now >= o && now < c;
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  // A tick every 3 hours from opening, plus closing time. Phones show only the first, middle and last.
  const ticks: number[] = [];
  for (let m = o; m < c; m += 180) ticks.push(m);
  if (ticks[ticks.length - 1] !== c) ticks.push(c);
  const mid = Math.floor((ticks.length - 1) / 2);

  return (
    <div className="relative">
      <div className="space-y-4 sm:space-y-3">
        {shifts.map((s) => {
          const start = timeToMinutes(s.startTime);
          const end = timeToMinutes(s.endTime);
          const time = `${formatTime12(s.startTime)} – ${formatTime12(s.endTime)}`;
          return (
            <div key={s.id} className={`${COLS} items-center gap-y-1.5`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{s.nameEn}</span>
                <span className="font-mono text-xs text-slate-ink sm:hidden">{time}</span>
              </div>
              <div className="relative h-8 rounded-lg bg-white ring-1 ring-slate-200 sm:h-10">
                <div
                  className="absolute inset-y-1 flex items-center overflow-hidden rounded-md bg-navy px-2 font-mono text-xs text-white"
                  style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }}
                >
                  <span className="hidden truncate sm:inline">{time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${COLS} mt-2`}>
        <div className="hidden sm:block" />
        <div className="relative h-5 font-mono text-[10px] text-slate-ink sm:text-[11px]">
          {ticks.map((m, i) => {
            const last = i === ticks.length - 1;
            return (
              <span
                key={m}
                className={`absolute top-0 whitespace-nowrap ${i === 0 ? "" : last ? "-translate-x-full" : "-translate-x-1/2"} ${
                  i !== 0 && i !== mid && !last ? "hidden sm:inline" : ""
                }`}
                style={{ left: pct(m) }}
              >
                {formatTime12(hhmm(m)).replace(":00", "")}
              </span>
            );
          })}
        </div>
      </div>

      {isOpen && (
        <div className={`pointer-events-none absolute inset-y-0 w-full ${COLS}`} aria-hidden>
          <div className="hidden sm:block" />
          <div className="relative">
            <div className="absolute -top-6 bottom-6 w-0.5 bg-brand" style={{ left: pct(now) }}>
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full rounded bg-brand px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                {nowLabel}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
