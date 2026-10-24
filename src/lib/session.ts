import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./db";

export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin/login");
  return session.user;
}

export async function requireStudent() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.isActive) redirect("/login?error=inactive");
  return user;
}
