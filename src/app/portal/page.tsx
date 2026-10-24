import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PortalRedirect() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(session.user.role === "ADMIN" ? "/admin" : "/student");
}
