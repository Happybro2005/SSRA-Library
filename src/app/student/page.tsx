import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { getCurrentMembership } from "@/lib/queries";
import { daysLeft, membershipStatus } from "@/lib/membership";
import { daysBetween, formatDate, formatDay, formatRupees, todayIST } from "@/lib/dates";
import { endOfDayIST, getLibraryStats } from "@/lib/library";
import { COMPLAINT_BADGE } from "@/lib/complaints";
import { Badge } from "@/components/ui";
import { Countdown } from "@/components/Countdown";

export default async function StudentDashboard() {
  const user = await requireStudent();
  const t = await getTranslations("student");
  const ts = await getTranslations("status");
  const tc = await getTranslations("complaint");
  const today = todayIST();

  const [m, pending, borrowed, pendingRequests, stats, complaints, openComplaints, receipts] = await Promise.all([
    getCurrentMembership(user.id, today),
    prisma.payment.findMany({ where: { userId: user.id, status: "PENDING" }, include: { plan: true } }),
    prisma.bookIssue.findMany({ where: { userId: user.id, returnedAt: null }, include: { book: true }, orderBy: { dueAt: "asc" } }),
    prisma.bookRequest.findMany({ where: { userId: user.id, status: "PENDING" }, include: { book: true } }),
    getLibraryStats(),
    prisma.complaint.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 3 }),
    prisma.complaint.count({ where: { userId: user.id, status: { not: "RESOLVED" } } }),
    prisma.payment.findMany({
      where: { userId: user.id, status: "CONFIRMED", receiptNo: { not: null } },
      include: { plan: true },
      orderBy: { paidAt: "desc" },
      take: 3,
    }),
  ]);

  const status = m ? membershipStatus(m, today) : "NONE";
  const left = m ? daysLeft(m.endDate, today) : 0;
  const totalDays = m ? daysBetween(m.startDate, m.endDate) + 1 : 1;
  const usedPct = m ? Math.min(100, Math.max(0, Math.round(((daysBetween(m.startDate, today) + 1) / totalDays) * 100))) : 0;
  const cd = { days: t("cdDays"), hours: t("cdHours"), minutes: t("cdMinutes"), seconds: t("cdSeconds") };
  const tone =
    status === "EXPIRED" ? "from-red-50 border-red-200" : status === "EXPIRING" ? "from-amber-50 border-amber-200" : "from-green-50 border-green-200";
  const bar = status === "EXPIRED" ? "bg-red-500" : status === "EXPIRING" ? "bg-amber-500" : "bg-green-500";

  const actions = [
    { href: "/student/pay", label: t("actionPay"), icon: "💳", color: "bg-brand/10 text-brand" },
    { href: "/student/library", label: t("actionBorrow"), icon: "📚", color: "bg-navy/10 text-navy" },
    { href: "/student/ebooks", label: t("actionEbooks"), icon: "📱", color: "bg-sky-100 text-sky-700" },
    { href: "/student/complaints", label: t("actionComplaint"), icon: "📣", color: "bg-amber-100 text-amber-700", badge: openComplaints },
  ];

  return (
    <div className="space-y-6">
      <h1 className="sr-only">{t("welcome", { name: user.name })}</h1>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⏳ {t("pendingNote")}:{" "}
          {pending.map((p) => `${formatRupees(p.amount)}${p.plan ? ` (${p.plan.nameEn})` : ""}`).join(", ")}
        </div>
      )}

      {/* Plan validity */}
      <section aria-labelledby="validity" className={`rounded-2xl border bg-gradient-to-br to-white p-5 shadow-sm sm:p-6 ${tone}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="validity" className="text-sm font-bold uppercase tracking-wider text-slate-600">
            {t("planValidity")}
          </h2>
          <Badge status={status} label={ts(status)} />
        </div>
        {!m ? (
          <p className="text-lg text-slate-700">{t("noMembership")}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="text-xl font-bold text-ink">{m.plan ? m.plan.nameEn : "—"}</div>
              <div className="mt-1 text-slate-600">
                {formatDate(m.startDate)} → <b className="text-ink">{formatDate(m.endDate)}</b>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${usedPct}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-slate-500">
                <span>{t("planUsed", { pct: usedPct })}</span>
                <span className={left < 0 ? "font-semibold text-red-700" : left <= 7 ? "font-semibold text-amber-700" : ""}>
                  {left < 0 ? t("expiredAgo", { count: -left }) : t("daysLeft", { count: left })}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-600">{t("membershipEnds")}</div>
              <Countdown
                target={endOfDayIST(m.endDate).toISOString()}
                labels={{ ...cd, over: t("cdExpired", { count: "{count}" }) }}
                warnDays={7}
                size="lg"
              />
              {(status === "EXPIRING" || status === "EXPIRED") && (
                <Link href="/student/pay" className="btn-brand mt-3 w-full">
                  {t("renewPlan")}
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section aria-labelledby="actions">
        <h2 id="actions" className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-600">
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="relative flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span aria-hidden className={`grid h-12 w-12 place-items-center rounded-full text-2xl ${a.color}`}>
                {a.icon}
              </span>
              <span className="text-sm leading-tight">{a.label}</span>
              {!!a.badge && (
                <span className="absolute right-3 top-3 rounded-full bg-brand px-2 text-xs font-bold text-white">{a.badge}</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Borrowed books */}
        <section aria-labelledby="borrowed" className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="borrowed" className="text-lg font-semibold">
              📖 {t("borrowed")}
            </h2>
            <Link href="/student/books" className="text-sm text-navy underline">
              {t("seeAll")}
            </Link>
          </div>
          {borrowed.length === 0 ? (
            <p className="text-slate-600">{t("noBorrowed")}</p>
          ) : (
            <ul className="space-y-4">
              {borrowed.map((i) => (
                <li key={i.id}>
                  <div className="font-semibold">{i.book.title}</div>
                  <div className="mb-2 text-sm text-slate-500">{t("returnBy", { date: formatDate(i.dueAt) })}</div>
                  <Countdown target={endOfDayIST(i.dueAt).toISOString()} labels={{ ...cd, over: t("cdOverdue", { count: "{count}" }) }} />
                </li>
              ))}
            </ul>
          )}
          {pendingRequests.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              ⏳ {t("pendingRequests")}: {pendingRequests.map((r) => r.book.title).join(", ")}
            </div>
          )}
        </section>

        {/* Complaints */}
        <section aria-labelledby="complaints" className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="complaints" className="text-lg font-semibold">
              📣 {tc("mine")}
            </h2>
            <Link href="/student/complaints" className="text-sm text-navy underline">
              {t("seeAll")}
            </Link>
          </div>
          {complaints.length === 0 ? (
            <p className="text-slate-600">{tc("none")}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <li key={c.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{tc(`cat.${c.category}`)}</span>
                    <Badge status={COMPLAINT_BADGE[c.status]} label={ts(c.status)} />
                  </div>
                  <p className="truncate text-sm text-slate-500">{c.reply ? `↩ ${c.reply}` : c.message}</p>
                  <div className="text-xs text-slate-400">{formatDay(c.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/student/complaints" className="btn-outline mt-4 w-full">
            + {t("actionComplaint")}
          </Link>
        </section>
      </div>

      {/* Fee receipts */}
      <section aria-labelledby="receipts" className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="receipts" className="text-lg font-semibold">
            🧾 {t("latestReceipts")}
          </h2>
          <Link href="/student/payments" className="text-sm text-navy underline">
            {t("seeAll")}
          </Link>
        </div>
        {receipts.length === 0 ? (
          <p className="text-slate-600">{t("noReceipts")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {receipts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-mono text-sm font-bold text-navy">{p.receiptNo}</div>
                  <div className="text-sm text-slate-500">
                    {p.plan?.nameEn ?? p.note ?? "Fee"} · {formatDay(p.paidAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatRupees(p.amount)}</span>
                  <Link href={`/receipt/${p.id}`} className="btn-outline btn-sm">
                    {t("viewReceipt")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Library at a glance */}
      <section aria-labelledby="glance" className="card">
        <h2 id="glance" className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-600">
          {t("libraryGlance")}
        </h2>
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
          <Glance label={t("statEbooks")} value={stats.ebooks} href="/student/ebooks" />
          <Glance label={t("statTitles")} value={stats.physicalTitles} href="/student/library" />
          <Glance label={t("statAvailable")} value={stats.physicalAvailable} href="/student/library" />
        </div>
      </section>
    </div>
  );
}

function Glance({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="px-2 hover:opacity-80">
      <div className="font-display text-3xl font-bold text-navy">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </Link>
  );
}
