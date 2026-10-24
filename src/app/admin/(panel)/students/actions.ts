"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";
import { parseDateOnly } from "@/lib/dates";
import { createMembership, SeatConflictError } from "@/lib/membership-service";
import { dateSchema, formObject, mobileSchema, optionalText } from "@/lib/validation";

const studentSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  mobile: mobileSchema,
  fatherName: optionalText,
  address: optionalText,
  gender: optionalText,
  password: z.string().optional(),
});

const membershipSchema = z.object({
  planId: z.string().min(1, "Choose a plan"),
  shiftId: z.string().min(1, "Choose a shift"),
  seatId: z.string().min(1, "Choose a seat"),
  startDate: dateSchema,
  amount: z.coerce.number().int().min(0),
  paymentMode: z.enum(["CASH", "UPI", "NONE"]),
  upiRef: optionalText,
});

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input";
}

async function addMembership(userId: string, adminId: string, data: z.infer<typeof membershipSchema>) {
  return createMembership({
    userId,
    seatId: data.seatId,
    shiftId: data.shiftId,
    planId: data.planId,
    startDate: parseDateOnly(data.startDate),
    amount: data.amount,
    payment: data.paymentMode === "NONE" ? null : { mode: data.paymentMode, upiRef: data.upiRef },
    recordedById: adminId,
  });
}

export async function createStudent(formData: FormData) {
  const admin = await requireAdmin();
  const raw = formObject(formData);
  const student = studentSchema.safeParse(raw);
  if (!student.success) flashRedirect("/admin/students/new", "error", firstError(student.error));
  const withSeat = raw.withMembership === "on";
  const membership = withSeat ? membershipSchema.safeParse(raw) : null;
  if (membership && !membership.success) flashRedirect("/admin/students/new", "error", firstError(membership.error));

  const { password, ...data } = student.data;
  let userId: string;
  try {
    const user = await prisma.user.create({
      data: { ...data, passwordHash: password ? await bcrypt.hash(password, 10) : null },
    });
    userId = user.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      flashRedirect("/admin/students/new", "error", "A student with this mobile number already exists.");
    }
    throw err;
  }

  if (membership?.success) {
    try {
      await addMembership(userId, admin.id, membership.data);
    } catch (err) {
      if (err instanceof SeatConflictError) {
        flashRedirect(`/admin/students/${userId}`, "error", `Student saved, but seat not assigned: ${err.message}`);
      }
      throw err;
    }
  }
  revalidatePath("/admin");
  flashRedirect(`/admin/students/${userId}`, "ok", "Student saved.");
}

export async function updateStudent(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = studentSchema.safeParse(formObject(formData));
  if (!parsed.success) flashRedirect(`/admin/students/${id}`, "error", firstError(parsed.error));
  const { password, ...data } = parsed.data;
  try {
    await prisma.user.update({
      where: { id },
      data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      flashRedirect(`/admin/students/${id}`, "error", "Another student already uses this mobile number.");
    }
    throw err;
  }
  flashRedirect(`/admin/students/${id}`, "ok", password ? "Details and password updated." : "Details updated.");
}

export async function addStudentMembership(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = membershipSchema.safeParse(formObject(formData));
  if (!parsed.success) flashRedirect(`/admin/students/${id}`, "error", firstError(parsed.error));
  try {
    await addMembership(id, admin.id, parsed.data);
  } catch (err) {
    if (err instanceof SeatConflictError) flashRedirect(`/admin/students/${id}`, "error", err.message);
    throw err;
  }
  revalidatePath("/admin");
  flashRedirect(`/admin/students/${id}`, "ok", "Membership added.");
}

export async function deleteMembership(studentId: string, membershipId: string) {
  await requireAdmin();
  await prisma.membership.delete({ where: { id: membershipId, userId: studentId } });
  flashRedirect(`/admin/students/${studentId}`, "ok", "Membership removed. Its payments are kept.");
}

export async function setStudentActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id, role: "STUDENT" }, data: { isActive: active } });
  flashRedirect(`/admin/students/${id}`, "ok", active ? "Student re-activated." : "Student deactivated — they can no longer log in.");
}

export async function deleteStudent(id: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id, role: "STUDENT" } });
  revalidatePath("/admin/students");
  redirect("/admin/students?ok=Student%20deleted.");
}
