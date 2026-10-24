"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";
import { storage } from "@/lib/storage";
import { parseDateOnly } from "@/lib/dates";
import { dateSchema, formObject, optionalText } from "@/lib/validation";

const PATH = "/admin/offers";

const promoSchema = z
  .object({
    titleEn: z.string().trim().min(1, "English title is required"),
    messageEn: z.string().trim().min(1, "English message is required"),
    badge: optionalText,
    ctaTextEn: optionalText,
    ctaLink: optionalText,
    startDate: dateSchema,
    endDate: dateSchema,
    priority: z.coerce.number().int().default(0),
    planId: optionalText,
    isActive: z
      .string()
      .optional()
      .transform((v) => v === "on"),
    removeImage: z
      .string()
      .optional()
      .transform((v) => v === "on"),
  })
  .refine((p) => p.endDate >= p.startDate, "End date must be on or after the start date")
  .refine((p) => !p.ctaLink || /^(https?:|tel:|mailto:|\/)/.test(p.ctaLink), "Button link must start with https://, tel:, or /");

export async function savePromotion(id: string | null, formData: FormData) {
  await requireAdmin();
  const back = id ? `${PATH}?edit=${id}` : `${PATH}?edit=new`;
  const parsed = promoSchema.safeParse(formObject(formData));
  if (!parsed.success) flashRedirect(back, "error", parsed.error.issues[0]?.message ?? "Invalid offer");
  const { removeImage, startDate, endDate, ...data } = parsed.data;

  const image = formData.get("image");
  const hasImage = image instanceof File && image.size > 0;
  if (hasImage && !image.type.startsWith("image/")) flashRedirect(back, "error", "Popup image must be an image file.");

  const existing = id ? await prisma.promotion.findUnique({ where: { id } }) : null;
  let imagePath = existing?.imagePath ?? null;
  if ((hasImage || removeImage) && imagePath) {
    await storage.remove(imagePath);
    imagePath = null;
  }
  if (hasImage) imagePath = await storage.save("public/offers", image);

  const fields = { ...data, titleHi: data.titleEn, messageHi: data.messageEn, ctaTextHi: data.ctaTextEn, imagePath, startDate: parseDateOnly(startDate), endDate: parseDateOnly(endDate) };
  const saved = existing
    ? await prisma.promotion.update({ where: { id: existing.id }, data: fields })
    : await prisma.promotion.create({ data: fields });
  revalidatePath("/");
  flashRedirect(`${PATH}?edit=${saved.id}`, "ok", "Offer saved. Visitors who closed the old version will see it again.");
}

export async function togglePromotion(id: string, active: boolean) {
  await requireAdmin();
  await prisma.promotion.update({ where: { id }, data: { isActive: active } });
  revalidatePath("/");
  flashRedirect(PATH, "ok", active ? "Offer switched on." : "Offer switched off.");
}

export async function deletePromotion(id: string) {
  await requireAdmin();
  const promo = await prisma.promotion.delete({ where: { id } });
  if (promo.imagePath) await storage.remove(promo.imagePath);
  revalidatePath("/");
  flashRedirect(PATH, "ok", "Offer deleted.");
}
