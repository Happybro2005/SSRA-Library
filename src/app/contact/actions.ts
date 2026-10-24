"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mobileSchema } from "@/lib/validation";
import { addDays, todayIST } from "@/lib/dates";

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(60),
  mobile: mobileSchema,
  shift: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => v || null),
  message: z.string().trim().min(5).max(1000),
});

/** Public "Contact us" form. Saves the message for the admin's Enquiries page. */
export async function sendEnquiry(formData: FormData) {
  // Bots fill every field; people never see this one.
  if (String(formData.get("website") ?? "")) redirect("/?sent=1#contact");

  const parsed = enquirySchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    shift: formData.get("shift") ?? "",
    message: formData.get("message"),
  });
  if (!parsed.success) redirect("/?enquiry=invalid#contact");

  const since = addDays(todayIST(), 0);
  const todayCount = await prisma.enquiry.count({
    where: { mobile: parsed.data.mobile, createdAt: { gte: new Date(since.getTime() - 330 * 60 * 1000) } },
  });
  if (todayCount >= 3) redirect("/?enquiry=limit#contact");

  await prisma.enquiry.create({ data: parsed.data });
  revalidatePath("/admin", "layout");
  redirect("/?sent=1#contact");
}
