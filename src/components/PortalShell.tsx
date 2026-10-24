import Link from "next/link";
import { logout } from "@/app/login/actions";

export type NavItem = { href: string; label: string; icon: string; badge?: number };

export function PortalShell({
  title,
  userName,
  nav,
  logoutLabel,
  menuLabel,
  extraLink,
  children,
}: {
  title: string;
  userName: string;
  nav: NavItem[];
  logoutLabel: string;
  menuLabel: string;
  extraLink?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const links = (
    <ul className="space-y-1">
      {nav.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-white/90 hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {!!item.badge && (
              <span className="rounded-full bg-sun px-2 text-xs font-bold text-ink">{item.badge}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print bg-navy text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-xl font-bold">
            <span className="text-sun">SSRA</span> LIBRARY
          </Link>
        </div>
        <div className="px-4 pb-2 text-xs uppercase tracking-wider text-white/60">{title}</div>
        <details className="px-2 pb-3 md:hidden">
          <summary className="cursor-pointer rounded-lg px-3 py-2 font-semibold hover:bg-white/10">☰ {menuLabel}</summary>
          <div className="mt-1">{links}</div>
        </details>
        <nav className="hidden px-2 md:block">{links}</nav>
        <div className="hidden border-t border-white/10 px-4 py-4 text-sm md:block">
          <div className="font-semibold">{userName}</div>
          {extraLink && (
            <Link href={extraLink.href} className="mt-1 block text-white/70 hover:text-white">
              {extraLink.label}
            </Link>
          )}
          <form action={logout} className="mt-2">
            <button className="text-sun hover:underline">{logoutLabel}</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        {children}
        <form action={logout} className="no-print mt-10 md:hidden">
          <button className="btn-outline w-full">{logoutLabel}</button>
        </form>
      </main>
    </div>
  );
}
