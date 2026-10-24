"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";
import { parseDateOnly } from "@/lib/dates";
import { formObject } from "@/lib/validation";

const PATH = "/admin/plans";

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? parseDateOnly(v) : null));

const planSchema = z.object({
  nameEn: z.string().trim().min(1, "English name is required"),
  durationMonths: z.coerce.number().int().min(1).max(24),
  price: z.coerce.number().int().min(0),
  shiftId: z
    .string()
    .optional()
    .transform((v) => v || null),
  isOffer: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  isActive: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  validFrom: optionalDate,
  validTill: optionalDate,
  sortOrder: z.coerce.number().int().default(0),
});

export async function savePlan(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = planSchema.safeParse(formObject(formData));
  if (!parsed.success) flashRedirect(PATH, "error", parsed.error.issues[0]?.message ?? "Invalid plan");
  if (parsed.data.validFrom && parsed.data.validTill && parsed.data.validTill < parsed.data.validFrom) {
    flashRedirect(PATH, "error", "Valid-till date must be after valid-from date.");
  }
  if (id) await prisma.feePlan.update({ where: { id }, data: { ...parsed.data, nameHi: parsed.data.nameEn } });
  else await prisma.feePlan.create({ data: { ...parsed.data, nameHi: parsed.data.nameEn } });
  revalidatePath("/");
  flashRedirect(PATH, "ok", "Plan saved.");
}

export async function deletePlan(id: string) {
  await requireAdmin();
  await prisma.feePlan.delete({ where: { id } });
  revalidatePath("/");
  flashRedirect(PATH, "ok", "Plan deleted. Existing memberships keep their dates and amounts.");
}
