import { timeToMinutes } from "./membership";

/** "06:00" → "6:00 AM", "21:00" → "9:00 PM". */
export function formatTime12(value: string): string {
  const mins = timeToMinutes(value);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function hoursLabel(open: string, close: string): string {
  return `${formatTime12(open)} – ${formatTime12(close)}`;
}

/** Minutes since midnight in India for the given instant. */
export function minutesNowIST(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return timeToMinutes(parts === "24:00" ? "00:00" : parts);
}

export type OpenState = { open: boolean; label: string };

/** Whether the library is open right now, with a short status line ("Open now · closes 9:00 PM"). */
export function openState(open: string, close: string, now: Date = new Date()): OpenState {
  const mins = minutesNowIST(now);
  const o = timeToMinutes(open);
  const c = timeToMinutes(close);
  if (mins >= o && mins < c) return { open: true, label: `Open now · closes ${formatTime12(close)}` };
  return { open: false, label: `Closed · opens ${formatTime12(open)}${mins >= c ? " tomorrow" : ""}` };
}
