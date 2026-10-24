"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";

const PATH = "/admin/complaints";

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
  reply: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null),
});

/** Saves the admin's reply (shown to the student) and the complaint's status. */
export async function updateComplaint(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = updateSchema.safeParse({ status: formData.get("status"), reply: formData.get("reply") ?? "" });
  if (!parsed.success) flashRedirect(PATH, "error", "Choose a valid status.");
  const { status, reply } = parsed.data;
  await prisma.complaint.update({
    where: { id },
    data: { status, reply, resolvedAt: status === "RESOLVED" ? new Date() : null },
  });
  revalidatePath("/admin", "layout");
  flashRedirect(PATH, "ok", status === "RESOLVED" ? "Complaint marked resolved." : "Complaint updated.");
}
