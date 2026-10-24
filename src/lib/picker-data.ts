import { prisma } from "./db";
import { getUpcomingBookings } from "./membership-service";

export async function getPickerData() {
  const [plans, shifts, seats, bookings] = await Promise.all([
    prisma.feePlan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    prisma.shift.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.seat.findMany({ where: { isActive: true }, orderBy: { number: "asc" } }),
    getUpcomingBookings(),
  ]);
  return {
    plans: plans.map((p) => ({ id: p.id, name: p.nameEn, durationMonths: p.durationMonths, price: p.price, shiftId: p.shiftId })),
    shifts: shifts.map((s) => ({ id: s.id, name: s.nameEn, startTime: s.startTime, endTime: s.endTime })),
    seats: seats.map((s) => ({ id: s.id, number: s.number })),
    bookings,
  };
}
