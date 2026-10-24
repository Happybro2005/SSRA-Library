import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";

export async function SiteHeader() {
  const t = await getTranslations();
  const session = await auth();
  const portal = session?.user?.role === "ADMIN" ? "/admin" : "/student";
  return (
    <header className="sticky top-0 z-40 bg-navy text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-display text-xl font-bold tracking-wide sm:text-2xl">
          <span className="text-sun">SSRA</span> LIBRARY
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          {session?.user ? (
            <Link href={portal} className="btn-brand btn-sm">
              {session.user.role === "ADMIN" ? t("admin.panel") : t("student.dashboard")}
            </Link>
          ) : (
            <Link href="/login" className="btn-brand btn-sm">
              {t("common.login")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
