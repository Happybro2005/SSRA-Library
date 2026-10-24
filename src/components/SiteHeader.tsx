import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { openState } from "@/lib/hours";

/** Header for the public pages (home, books, login). */
export async function SiteHeader() {
  const t = await getTranslations();
  const [session, settings] = await Promise.all([auth(), getSettings()]);
  const portal = session?.user?.role === "ADMIN" ? "/admin" : "/student";
  const state = openState(settings.openTime, settings.closeTime);
  const links = [
    { href: "/#about", label: t("home.navAbout") },
    { href: "/books", label: t("home.navBooks") },
    { href: "/#fees", label: t("home.navFees") },
    { href: "/#facilities", label: t("home.navFacilities") },
    { href: "/#contact", label: t("home.navContact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-dark/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="whitespace-nowrap font-poster text-2xl font-black uppercase leading-none tracking-wide">
            <span className="text-lamp">SSRA</span> Library
          </Link>
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium sm:inline-flex ${
              state.open ? "bg-leaf/15 text-emerald-300" : "bg-white/10 text-white/70"
            }`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${state.open ? "bg-emerald-400" : "bg-white/50"}`} />
            {state.label}
          </span>
        </div>

        <nav aria-label="Main" className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded-full px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded-full px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 [&::-webkit-details-marker]:hidden">
              ☰ <span className="sr-only sm:not-sr-only">{t("home.menu")}</span>
            </summary>
            <ul className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl bg-white py-1 text-ink shadow-xl ring-1 ring-black/5">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block px-4 py-2.5 text-sm font-medium hover:bg-chalk">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          {session?.user ? (
            <Link href={portal} className="btn-brand btn-sm ml-1">
              {session.user.role === "ADMIN" ? t("admin.panel") : t("student.dashboard")}
            </Link>
          ) : (
            <Link href="/login" className="btn-brand btn-sm ml-1">
              {t("common.login")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
