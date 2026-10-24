import Link from "next/link";
import { Badge } from "./ui";
import { StudentBottomBar, StudentTabs, type StudentNavItem } from "./StudentNav";
import { logout } from "@/app/login/actions";

export type StudentShellProfile = {
  name: string;
  mobile: string;
  seat: string | null;
  shift: string | null;
  status: { key: string; label: string };
};

/** Student-facing layout: light top header, profile banner, top tabs on desktop, bottom tab bar on phones. */
export function StudentShell({
  profile,
  items,
  labels,
  children,
}: {
  profile: StudentShellProfile;
  items: StudentNavItem[];
  labels: { portal: string; logout: string; seat: string; noSeat: string; changePassword: string };
  children: React.ReactNode;
}) {
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-paper">
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-navy">
              <span className="text-brand">SSRA</span> LIBRARY
            </span>
            <span className="hidden rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white sm:inline">
              {labels.portal}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/student/profile#password"
              className="rounded-full px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink"
            >
              🔑 <span className="hidden sm:inline">{labels.changePassword}</span>
              <span className="sr-only sm:hidden">{labels.changePassword}</span>
            </Link>
            <form action={logout}>
              <button className="rounded-full px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink">
                {labels.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="no-print bg-gradient-to-r from-brand via-orange-500 to-amber-400 text-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-5">
          <div
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white font-display text-2xl font-bold text-brand shadow-md ring-4 ring-white/40"
          >
            {initials || "S"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/85 sm:hidden">{labels.portal}</div>
            <div className="truncate text-xl font-bold leading-tight sm:text-2xl">{profile.name}</div>
            <div className="text-sm text-white/90">{profile.mobile}</div>
          </div>
          <div className="shrink-0 text-right">
            {profile.seat ? (
              <>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/85">{labels.seat}</div>
                <div className="font-display text-3xl font-bold leading-none">#{profile.seat}</div>
                <div className="mt-0.5 hidden text-xs text-white/90 sm:block">{profile.shift}</div>
              </>
            ) : (
              <div className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold">{labels.noSeat}</div>
            )}
            <div className="mt-1.5">
              <Badge status={profile.status.key} label={profile.status.label} />
            </div>
          </div>
        </div>
      </section>

      <StudentTabs items={items} />

      <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 md:pb-12">{children}</main>

      <StudentBottomBar items={items} />
    </div>
  );
}
