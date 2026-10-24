"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";
import { MIN_ADMIN_PASSWORD } from "@/lib/passwords";

const PATH = "/admin/account";


export async function changeAdminPassword(formData: FormData) {
  const session = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const admin = await prisma.user.findUnique({ where: { id: session.id } });
  if (!admin) flashRedirect(PATH, "error", "Admin account not found. Log in again.");
  if (admin.passwordHash && !(await bcrypt.compare(current, admin.passwordHash))) {
    flashRedirect(PATH, "error", "Current password is wrong.");
  }
  if (next.length < MIN_ADMIN_PASSWORD) flashRedirect(PATH, "error", `New password must be at least ${MIN_ADMIN_PASSWORD} characters.`);
  if (next !== confirm) flashRedirect(PATH, "error", "The two new passwords don’t match.");
  if (admin.passwordHash && (await bcrypt.compare(next, admin.passwordHash))) {
    flashRedirect(PATH, "error", "The new password is the same as the current one.");
  }

  await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  flashRedirect(PATH, "ok", "Password changed. Use the new password next time you log in.");
}
