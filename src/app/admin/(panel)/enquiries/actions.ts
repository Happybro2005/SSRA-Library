"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";

export async function setEnquiryHandled(id: string, handled: boolean) {
  await requireAdmin();
  await prisma.enquiry.update({ where: { id }, data: { handled } });
  revalidatePath("/admin", "layout");
  flashRedirect("/admin/enquiries", "ok", handled ? "Marked as done." : "Moved back to new.");
}
