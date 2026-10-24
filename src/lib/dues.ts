import { prisma } from "./db";
import { addDays } from "./dates";
import { EXPIRING_DAYS } from "./membership";

/** Students whose latest membership ends within EXPIRING_DAYS or ended in the last `lookbackDays`. */
export async function getDues(today: Date, lookbackDays = 90) {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true, memberships: { some: {} } },
    include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { seat: true, shift: true, plan: true } } },
  });
  const soon = addDays(today, EXPIRING_DAYS);
  const from = addDays(today, -lookbackDays);
  const expiring = [];
  const expired = [];
  for (const s of students) {
    const m = s.memberships[0];
    if (!m) continue;
    if (m.endDate >= today && m.endDate <= soon) expiring.push({ student: s, membership: m });
    else if (m.endDate < today && m.endDate >= from) expired.push({ student: s, membership: m });
  }
  expiring.sort((a, b) => a.membership.endDate.getTime() - b.membership.endDate.getTime());
  expired.sort((a, b) => b.membership.endDate.getTime() - a.membership.endDate.getTime());
  return { expiring, expired };
}

/** Current or future memberships whose confirmed payments are less than the membership amount. */
export async function getUnpaidMemberships(today: Date) {
  const memberships = await prisma.membership.findMany({
    where: { endDate: { gte: today } },
    include: { user: true, seat: true, shift: true, payments: { where: { status: "CONFIRMED" } } },
    orderBy: { startDate: "asc" },
  });
  return memberships
    .map((m) => ({ ...m, paid: m.payments.reduce((s, p) => s + p.amount, 0) }))
    .filter((m) => m.paid < m.amount);
}
