"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";
import { confirmPayment, SeatConflictError } from "@/lib/membership-service";
import { nextReceiptNo } from "@/lib/receipts";
import { formObject, mobileSchema, optionalText } from "@/lib/validation";

const recordSchema = z.object({
  mobile: mobileSchema,
  amount: z.coerce.number().int().positive("Amount must be more than 0"),
  mode: z.enum(["CASH", "UPI"]),
  upiRef: optionalText,
  note: optionalText,
  membershipId: optionalText,
});

/** Records a payment received at the desk (e.g. a balance or late fee) that isn't part of a new admission/renewal. */
export async function recordPayment(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = recordSchema.safeParse(formObject(formData));
  if (!parsed.success) flashRedirect("/admin/payments", "error", parsed.error.issues[0]?.message ?? "Invalid input");
  const { mobile, ...data } = parsed.data;
  const user = await prisma.user.findUnique({ where: { mobile } });
  if (!user) flashRedirect("/admin/payments", "error", `No student with mobile ${mobile}.`);

  const payment = await prisma.$transaction(async (tx) =>
    tx.payment.create({
      data: { ...data, userId: user.id, status: "CONFIRMED", receiptNo: await nextReceiptNo(tx), recordedById: admin.id },
    }),
  );
  revalidatePath("/admin");
  flashRedirect("/admin/payments", "ok", `Payment saved. Receipt ${payment.receiptNo}.`);
}

export async function approvePayment(paymentId: string, renew: boolean) {
  const admin = await requireAdmin();
  try {
    const { renewed } = await confirmPayment(paymentId, admin.id, renew);
    revalidatePath("/admin");
    flashRedirect(
      "/admin/payments",
      "ok",
      renewed ? "Payment confirmed and membership renewed on the same seat." : "Payment confirmed.",
    );
  } catch (err) {
    if (err instanceof SeatConflictError) {
      flashRedirect("/admin/payments", "error", `Could not renew automatically: ${err.message} Confirm without renewal and assign a seat from the student page.`);
    }
    throw err;
  }
}

export async function rejectPayment(paymentId: string) {
  await requireAdmin();
  await prisma.payment.update({ where: { id: paymentId, status: "PENDING" }, data: { status: "REJECTED" } });
  revalidatePath("/admin");
  flashRedirect("/admin/payments", "ok", "Payment marked as rejected.");
}
