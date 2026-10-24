import { prisma } from "./db";
import { shiftsOverlap } from "./membership";

/** Memberships that cover the given date. */
export function coveringWhere(date: Date) {
  return { startDate: { lte: date }, endDate: { gte: date } };
}

export async function getSeatAvailability(today: Date) {
  const [shifts, seatCount, current] = await Promise.all([
    prisma.shift.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.seat.count({ where: { isActive: true } }),
    prisma.membership.findMany({
      where: { ...coveringWhere(today), seat: { isActive: true } },
      select: { seatId: true, shift: true },
    }),
  ]);
  const byShift = shifts.map((shift) => {
    const occupied = new Set(current.filter((m) => shiftsOverlap(m.shift, shift)).map((m) => m.seatId));
    return { shift, occupied: occupied.size, free: Math.max(seatCount - occupied.size, 0) };
  });
  const occupiedAny = new Set(current.map((m) => m.seatId)).size;
  return { seatCount, byShift, freeAnyShift: seatCount - occupiedAny };
}

export async function getPublicPlans(today: Date) {
  return prisma.feePlan.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: today } }] },
        { OR: [{ validTill: null }, { validTill: { gte: today } }] },
      ],
    },
    include: { shift: true },
    orderBy: [{ isOffer: "desc" }, { sortOrder: "asc" }, { price: "asc" }],
  });
}

export async function getActivePromotion(today: Date) {
  return prisma.promotion.findFirst({
    where: { isActive: true, startDate: { lte: today }, endDate: { gte: today } },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });
}

/** The membership covering today, else the most recent one. */
export async function getCurrentMembership(userId: string, today: Date) {
  const covering = await prisma.membership.findFirst({
    where: { userId, ...coveringWhere(today) },
    include: { seat: true, shift: true, plan: true },
    orderBy: { endDate: "desc" },
  });
  if (covering) return covering;
  return prisma.membership.findFirst({
    where: { userId },
    include: { seat: true, shift: true, plan: true },
    orderBy: { endDate: "desc" },
  });
}

export async function hasActiveMembership(userId: string, today: Date) {
  return (await prisma.membership.count({ where: { userId, ...coveringWhere(today) } })) > 0;
}
