"use client";

import { useEffect, useState } from "react";

export type CountdownLabels = { days: string; hours: string; minutes: string; seconds: string; over: string };

/** Live countdown to `target` (ISO string). Turns amber within `warnDays` and red once it has passed. */
export function Countdown({
  target,
  labels,
  warnDays = 3,
  size = "md",
}: {
  target: string;
  labels: CountdownLabels;
  warnDays?: number;
  size?: "md" | "lg";
}) {
  const end = new Date(target).getTime();
  // Render nothing time-dependent until mounted so server and client HTML match.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) return <div className={size === "lg" ? "h-[4.5rem]" : "h-12"} aria-hidden />;

  const left = end - now;
  if (left <= 0) {
    const overDays = Math.floor(-left / 86_400_000);
    return (
      <div className="font-semibold text-red-700" role="timer">
        {labels.over.replace("{count}", String(overDays))}
      </div>
    );
  }

  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const tone = days < warnDays ? "bg-amber-100 text-amber-900" : "bg-green-50 text-green-900";
  // A 4-column grid lets the boxes shrink on very narrow phones instead of overflowing.
  const grid = size === "lg" ? "w-full max-w-xs" : "w-full max-w-56";
  const box = size === "lg" ? "px-1 py-2" : "px-1 py-1";
  const num = size === "lg" ? "text-2xl sm:text-3xl" : "text-xl";

  return (
    <div className={`grid grid-cols-4 gap-1.5 sm:gap-2 ${grid}`} role="timer" aria-label={`${days} ${labels.days} ${hours} ${labels.hours} ${minutes} ${labels.minutes}`}>
      {[
        [days, labels.days],
        [hours, labels.hours],
        [minutes, labels.minutes],
        [seconds, labels.seconds],
      ].map(([value, label]) => (
        <div key={label} className={`rounded-lg text-center ${tone} ${box}`}>
          <div className={`font-display font-bold tabular-nums ${num}`}>{String(value).padStart(2, "0")}</div>
          <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
        </div>
      ))}
    </div>
  );
}
