"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type StudentNavItem = { href: string; label: string; short: string; icon: string; inBottomBar?: boolean };

function isActive(pathname: string, href: string) {
  return href === "/student" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Horizontal tabs under the student header (tablet and up). */
export function StudentTabs({ items }: { items: StudentNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Student portal" className="hidden border-b border-slate-200 bg-white md:block">
      <ul className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap border-b-[3px] px-3 py-3 text-sm font-semibold transition ${
                  active ? "border-brand text-brand" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-ink"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Fixed bottom tab bar on phones. Items not in the bar stay reachable from the dashboard and profile. */
export function StudentBottomBar({ items }: { items: StudentNavItem[] }) {
  const pathname = usePathname();
  const bar = items.filter((i) => i.inBottomBar);
  return (
    <nav
      aria-label="Student portal"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${bar.length}, minmax(0, 1fr))` }}>
        {bar.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-1 pb-2 pt-2 text-[11px] font-semibold ${active ? "text-brand" : "text-slate-500"}`}
              >
                <span
                  aria-hidden
                  className={`grid h-8 w-12 place-items-center rounded-full text-lg transition ${active ? "bg-brand/10" : ""}`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
