"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";
import { storage } from "@/lib/storage";
import { DEFAULT_SETTINGS, getSettings, type SettingKey } from "@/lib/settings";
import { formObject } from "@/lib/validation";

const PATH = "/admin/settings";

const EDITABLE: SettingKey[] = [
  "libraryName",
  "tagline",
  "ownerName",
  "address",
  "mobile",
  "emergencyMobile",
  "whatsapp",
  "upiId",
  "upiPayeeName",
  "mapEmbedUrl",
  "openTime",
  "closeTime",
  "announcementEn",
];

const REQUIRED: SettingKey[] = ["libraryName", "address", "mobile"];

async function setSetting(key: SettingKey, value: string) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const raw = formObject(formData);
  if (raw.upiId && !/^[\w.\-]+@[\w.\-]+$/.test(raw.upiId.trim())) flashRedirect(PATH, "error", "UPI ID looks wrong (example: name@okaxis).");
  if (raw.openTime && raw.closeTime && !(raw.openTime < raw.closeTime)) flashRedirect(PATH, "error", "Closing time must be after opening time.");
  if (raw.mapEmbedUrl && !raw.mapEmbedUrl.startsWith("https://")) flashRedirect(PATH, "error", "Map link must start with https://");
  for (const key of EDITABLE) {
    if (!(key in raw)) continue;
    // Name, address and phone fall back to the poster defaults rather than going blank.
    const value = raw[key].trim();
    await setSetting(key, value || (REQUIRED.includes(key) ? DEFAULT_SETTINGS[key] : ""));
  }
  revalidatePath("/", "layout");
  flashRedirect(PATH, "ok", "Settings saved.");
}

export async function uploadUpiQr(formData: FormData) {
  await requireAdmin();
  const file = formData.get("qr");
  if (!(file instanceof File) || file.size === 0 || !file.type.startsWith("image/")) {
    flashRedirect(PATH, "error", "Choose a QR code image.");
  }
  const { upiQrPath } = await getSettings();
  if (upiQrPath) await storage.remove(upiQrPath);
  await setSetting("upiQrPath", await storage.save("public/upi", file));
  flashRedirect(PATH, "ok", "UPI QR image uploaded.");
}

export async function removeUpiQr() {
  await requireAdmin();
  const { upiQrPath } = await getSettings();
  if (upiQrPath) await storage.remove(upiQrPath);
  await setSetting("upiQrPath", "");
  flashRedirect(PATH, "ok", "Uploaded QR removed — a QR is now generated from your UPI ID.");
}

const facilitySchema = z.object({
  icon: z.string().trim().max(8).default("✓"),
  titleEn: z.string().trim().min(1, "Facility name (English) is required"),
  sortOrder: z.coerce.number().int().default(0),
});

export async function saveFacility(id: string | null, formData: FormData) {
  await requireAdmin();
  const parsed = facilitySchema.safeParse(formObject(formData));
  if (!parsed.success) flashRedirect(PATH, "error", parsed.error.issues[0]?.message ?? "Invalid facility");
  if (id) await prisma.facility.update({ where: { id }, data: { ...parsed.data, titleHi: parsed.data.titleEn } });
  else await prisma.facility.create({ data: { ...parsed.data, titleHi: parsed.data.titleEn } });
  revalidatePath("/");
  flashRedirect(PATH, "ok", "Facility saved.");
}

export async function deleteFacility(id: string) {
  await requireAdmin();
  await prisma.facility.delete({ where: { id } });
  revalidatePath("/");
  flashRedirect(PATH, "ok", "Facility removed.");
}

export async function uploadGallery(formData: FormData) {
  await requireAdmin();
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0 || files.some((f) => !f.type.startsWith("image/"))) {
    flashRedirect(PATH, "error", "Choose one or more image files.");
  }
  const caption = String(formData.get("caption") ?? "").trim() || null;
  for (const file of files) {
    await prisma.galleryImage.create({ data: { path: await storage.save("public/gallery", file), caption } });
  }
  revalidatePath("/");
  flashRedirect(PATH, "ok", `${files.length} photo(s) added.`);
}

export async function deleteGalleryImage(id: string) {
  await requireAdmin();
  const img = await prisma.galleryImage.delete({ where: { id } });
  await storage.remove(img.path);
  revalidatePath("/");
  flashRedirect(PATH, "ok", "Photo removed.");
}
