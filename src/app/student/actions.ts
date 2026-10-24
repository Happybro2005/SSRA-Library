"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireStudent } from "@/lib/session";
import { getPublicPlans, hasActiveMembership } from "@/lib/queries";
import { todayIST } from "@/lib/dates";
import { borrowBlock, openBookCount } from "@/lib/library";
import { COMPLAINT_CATEGORIES, MAX_OPEN_COMPLAINTS } from "@/lib/complaints";

const upiSchema = z.object({
  planId: z.string().min(1),
  upiRef: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,35}$/),
});

export async function submitUpiPayment(formData: FormData) {
  const user = await requireStudent();
  const parsed = upiSchema.safeParse({ planId: formData.get("planId"), upiRef: formData.get("upiRef") });
  if (!parsed.success) redirect("/student/pay?error=upiRef");

  const plan = (await getPublicPlans(todayIST())).find((p) => p.id === parsed.data.planId);
  if (!plan) redirect("/student/pay?error=plan");

  const duplicate = await prisma.payment.findFirst({ where: { upiRef: parsed.data.upiRef, status: { not: "REJECTED" } } });
  if (duplicate) redirect("/student/pay?error=duplicate");

  await prisma.payment.create({
    data: {
      userId: user.id,
      planId: plan.id,
      amount: plan.price,
      mode: "UPI",
      upiRef: parsed.data.upiRef,
      status: "PENDING",
    },
  });
  revalidatePath("/admin");
  redirect("/student/pay?ok=1");
}

export async function changePassword(formData: FormData) {
  const user = await requireStudent();
  const session = await auth();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const back = (query: string): never => redirect(`/student/profile?${query}#password`);
  if (next.length < 6) back("error=shortPassword");
  if (next !== confirm) back("error=passwordMismatch");
  // After an OTP login the student has just proved the phone is theirs, so a forgotten password can be replaced.
  const viaOtp = session?.user?.loginMethod === "otp";
  if (user.passwordHash && !viaOtp && !(await bcrypt.compare(current, user.passwordHash))) back("error=wrongPassword");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  back("ok=1");
}

export async function requestBook(bookId: string) {
  const user = await requireStudent();
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.type !== "PHYSICAL") redirect("/student/library?error=UNAVAILABLE");

  const [activeMember, openCount, hasIt, requested] = await Promise.all([
    hasActiveMembership(user.id, todayIST()),
    openBookCount(user.id),
    prisma.bookIssue.count({ where: { userId: user.id, bookId, returnedAt: null } }),
    prisma.bookRequest.count({ where: { userId: user.id, bookId, status: "PENDING" } }),
  ]);
  const block = borrowBlock({
    activeMember,
    openCount,
    availableCopies: book.availableCopies,
    hasIt: hasIt > 0,
    requested: requested > 0,
  });
  if (block) redirect(`/student/library?error=${block}`);

  await prisma.bookRequest.create({ data: { bookId, userId: user.id } });
  revalidatePath("/admin", "layout");
  redirect("/student/library?ok=requested");
}

export async function cancelBookRequest(requestId: string) {
  const user = await requireStudent();
  await prisma.bookRequest.updateMany({
    where: { id: requestId, userId: user.id, status: "PENDING" },
    data: { status: "CANCELLED", decidedAt: new Date() },
  });
  revalidatePath("/admin", "layout");
  redirect("/student/books?ok=cancelled");
}

export async function raiseComplaint(formData: FormData) {
  const user = await requireStudent();
  const category = String(formData.get("category") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);
  if (!(COMPLAINT_CATEGORIES as readonly string[]).includes(category)) redirect("/student/complaints?error=category");
  if (message.length < 10) redirect("/student/complaints?error=tooShort");
  const open = await prisma.complaint.count({ where: { userId: user.id, status: { not: "RESOLVED" } } });
  if (open >= MAX_OPEN_COMPLAINTS) redirect("/student/complaints?error=limit");

  await prisma.complaint.create({ data: { userId: user.id, category, message } });
  revalidatePath("/admin", "layout");
  redirect("/student/complaints?ok=1");
}
