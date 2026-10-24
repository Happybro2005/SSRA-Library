import { addDays, addMonths, daysBetween } from "./dates";

export type TimeRange = { startTime: string; endTime: string };
export type DateRange = { startDate: Date; endDate: Date };
export type MembershipStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "UPCOMING";

export const EXPIRING_DAYS = 7;

export function timeToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid time: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Shift time windows overlap if they share any minute. Back-to-back shifts (06:00–14:00, 14:00–22:00) do not. */
export function shiftsOverlap(a: TimeRange, b: TimeRange): boolean {
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

/** Date ranges are inclusive of both start and end dates. */
export function datesOverlap(a: DateRange, b: DateRange): boolean {
  return a.startDate.getTime() <= b.endDate.getTime() && b.startDate.getTime() <= a.endDate.getTime();
}

/** A plan of N months starting on D ends the day before D + N months (1 Nov + 2 months → 31 Dec). */
export function computeEndDate(startDate: Date, durationMonths: number): Date {
  return addDays(addMonths(startDate, durationMonths), -1);
}

export function membershipStatus(range: DateRange, today: Date): MembershipStatus {
  if (today.getTime() < range.startDate.getTime()) return "UPCOMING";
  const left = daysBetween(today, range.endDate);
  if (left < 0) return "EXPIRED";
  if (left <= EXPIRING_DAYS) return "EXPIRING";
  return "ACTIVE";
}

export function daysLeft(endDate: Date, today: Date): number {
  return daysBetween(today, endDate);
}

export type ExistingBooking = DateRange & { shift: TimeRange; membershipId?: string };

/** Returns the first booking that clashes with the requested seat booking, if any. */
export function findSeatConflict(
  requested: DateRange & { shift: TimeRange },
  existing: ExistingBooking[],
  ignoreMembershipId?: string,
): ExistingBooking | undefined {
  return existing.find(
    (e) =>
      e.membershipId !== ignoreMembershipId &&
      datesOverlap(requested, e) &&
      shiftsOverlap(requested.shift, e.shift),
  );
}
