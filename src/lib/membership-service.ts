import type { PaymentMode, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { addDays, formatDate, todayIST } from "./dates";
import { computeEndDate, findSeatConflict } from "./membership";
import { nextReceiptNo } from "./receipts";

export class SeatConflictError extends Error {}

type Tx = Prisma.TransactionClient;

async function assertSeatFree(
  tx: Tx,
  input: { seatId: string; shiftId: string; startDate: Date; endDate: Date },
  ignoreMembershipId?: string,
) {
  const [shift, seat, existing] = await Promise.all([
    tx.shift.findUniqueOrThrow({ where: { id: input.shiftId } }),
    tx.seat.findUniqueOrThrow({ where: { id: input.seatId } }),
    tx.membership.findMany({
      where: { seatId: input.seatId, startDate: { lte: input.endDate }, endDate: { gte: input.startDate } },
      include: { shift: true, user: { select: { name: true } } },
    }),
  ]);
  if (!seat.isActive) throw new SeatConflictError(`Seat ${seat.number} is disabled.`);
  const conflict = findSeatConflict(
    { startDate: input.startDate, endDate: input.endDate, shift },
    existing.map((m) => ({ ...m, membershipId: m.id })),
    ignoreMembershipId,
  );
  if (conflict) {
    const m = existing.find((e) => e.id === conflict.membershipId)!;
    throw new SeatConflictError(
      `Seat ${seat.number} is already booked by ${m.user.name} (${m.shift.nameEn}, ${formatDate(m.startDate)} – ${formatDate(m.endDate)}).`,
    );
  }
}

export type NewMembershipInput = {
  userId: string;
  seatId: string;
  shiftId: string;
  planId: string;
  startDate: Date;
  amount: number;
  payment: { mode: PaymentMode; upiRef?: string | null; note?: string | null } | null;
  recordedById: string;
};

/** Creates a membership (and optionally a confirmed payment with receipt) after checking the seat is free. */
export async function createMembership(input: NewMembershipInput) {
  return prisma.$transaction(
    async (tx) => {
      const plan = await tx.feePlan.findUniqueOrThrow({ where: { id: input.planId } });
      const endDate = computeEndDate(input.startDate, plan.durationMonths);
      await assertSeatFree(tx, { ...input, endDate });
      const membership = await tx.membership.create({
        data: {
          userId: input.userId,
          seatId: input.seatId,
          shiftId: input.shiftId,
          planId: plan.id,
          startDate: input.startDate,
          endDate,
          amount: input.amount,
        },
      });
      let payment = null;
      if (input.payment) {
        payment = await tx.payment.create({
          data: {
            userId: input.userId,
            membershipId: membership.id,
            planId: plan.id,
            amount: input.amount,
            mode: input.payment.mode,
            upiRef: input.payment.upiRef,
            note: input.payment.note,
            status: "CONFIRMED",
            receiptNo: await nextReceiptNo(tx),
            recordedById: input.recordedById,
          },
        });
      }
      return { membership, payment };
    },
    { isolationLevel: "Serializable" },
  );
}

/** Start date for a renewal: the day after the current membership ends, or today if it has lapsed. */
export function renewalStart(lastEnd: Date | null | undefined, today: Date = todayIST()): Date {
  if (!lastEnd) return today;
  const next = addDays(lastEnd, 1);
  return next.getTime() > today.getTime() ? next : today;
}

/**
 * Confirms a pending (student-submitted) UPI payment. If the payment names a plan and the student has a
 * previous membership, the membership is renewed on the same seat and shift.
 */
export async function confirmPayment(paymentId: string, adminId: string, renew: boolean) {
  return prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (payment.status !== "PENDING") throw new Error("Payment is not pending.");
      let membershipId: string | null = payment.membershipId;
      let renewed = false;

      if (renew && payment.planId && !membershipId) {
        const plan = await tx.feePlan.findUniqueOrThrow({ where: { id: payment.planId } });
        const last = await tx.membership.findFirst({ where: { userId: payment.userId }, orderBy: { endDate: "desc" } });
        if (last) {
          const startDate = renewalStart(last.endDate);
          const endDate = computeEndDate(startDate, plan.durationMonths);
          await assertSeatFree(tx, { seatId: last.seatId, shiftId: last.shiftId, startDate, endDate });
          const m = await tx.membership.create({
            data: {
              userId: payment.userId,
              seatId: last.seatId,
              shiftId: last.shiftId,
              planId: plan.id,
              startDate,
              endDate,
              amount: payment.amount,
            },
          });
          membershipId = m.id;
          renewed = true;
        }
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: "CONFIRMED", receiptNo: await nextReceiptNo(tx), recordedById: adminId, membershipId },
      });
      return { renewed };
    },
    { isolationLevel: "Serializable" },
  );
}

/** Seat bookings from today onwards, for the client-side seat picker. */
export async function getUpcomingBookings(today: Date = todayIST()) {
  const rows = await prisma.membership.findMany({
    where: { endDate: { gte: today } },
    select: { id: true, seatId: true, startDate: true, endDate: true, shift: { select: { startTime: true, endTime: true } } },
  });
  return rows.map((r) => ({
    membershipId: r.id,
    seatId: r.seatId,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    shift: r.shift,
  }));
}
