"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";
import { formObject } from "@/lib/validation";

const PATH = "/admin/seats";

export async function setSeatCount(formData: FormData) {
  await requireAdmin();
  const count = z.coerce.number().int().min(1).max(500).safeParse(formData.get("count"));
  if (!count.success) flashRedirect(PATH, "error", "Seat count must be between 1 and 500.");
  for (let n = 1; n <= count.data; n++) {
    await prisma.seat.upsert({ where: { number: n }, create: { number: n }, update: { isActive: true } });
  }
  // Seats above the new count are disabled, not deleted, so their history stays.
  await prisma.seat.updateMany({ where: { number: { gt: count.data } }, data: { isActive: false } });
  revalidatePath("/");
  flashRedirect(PATH, "ok", `Library now has ${count.data} seats.`);
}

export async function toggleSeat(seatId: string, active: boolean) {
  await requireAdmin();
  await prisma.seat.update({ where: { id: seatId }, data: { isActive: active } });
  revalidatePath("/");
  flashRedirect(PATH, "ok", active ? "Seat enabled." : "Seat disabled.");
}

const time = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM time");
const shiftSchema = z
  .object({
    nameEn: z.string().trim().min(1, "Name is required"),
    startTime: time,
    endTime: time,
    sortOrder: z.coerce.number().int().default(0),
  })
  .refine((s) => s.startTime < s.endTime, "End time must be after start time");

export async function saveShift(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = shiftSchema.safeParse(formObject(formData));
  if (!parsed.success) flashRedirect(PATH, "error", parsed.error.issues[0]?.message ?? "Invalid shift");
  if (id) await prisma.shift.update({ where: { id }, data: { ...parsed.data, nameHi: parsed.data.nameEn } });
  else await prisma.shift.create({ data: { ...parsed.data, nameHi: parsed.data.nameEn } });
  revalidatePath("/");
  flashRedirect(PATH, "ok", "Shift saved.");
}

export async function toggleShift(id: string, active: boolean) {
  await requireAdmin();
  await prisma.shift.update({ where: { id }, data: { isActive: active } });
  revalidatePath("/");
  flashRedirect(PATH, "ok", active ? "Shift enabled." : "Shift hidden.");
}
