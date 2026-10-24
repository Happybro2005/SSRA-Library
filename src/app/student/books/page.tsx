import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { formatDate, formatDay } from "@/lib/dates";
import { endOfDayIST } from "@/lib/library";
import { Badge, Empty, Notice } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { SubmitButton } from "@/components/SubmitButton";
import { cancelBookRequest } from "../actions";

export default async function StudentBooksPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const user = await requireStudent();
  const { ok } = await searchParams;
  const t = await getTranslations("student");
  const ts = await getTranslations("status");
  const [issues, requests] = await Promise.all([
    prisma.bookIssue.findMany({
      where: { userId: user.id },
      include: { book: true },
      orderBy: [{ returnedAt: { sort: "desc", nulls: "first" } }, { dueAt: "asc" }],
    }),
    prisma.bookRequest.findMany({
      where: { userId: user.id },
      include: { book: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const current = issues.filter((i) => !i.returnedAt);
  const returned = issues.filter((i) => i.returnedAt);
  const labels = {
    days: t("cdDays"),
    hours: t("cdHours"),
    minutes: t("cdMinutes"),
    seconds: t("cdSeconds"),
    over: t("cdOverdue", { count: "{count}" }),
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-navy">{t("books")}</h1>
        <Link href="/student/library" className="btn-brand">
          📚 {t("browseBooks")}
        </Link>
      </div>
      {ok === "cancelled" && <Notice tone="success">{t("okCancelled")}</Notice>}

      <h2 className="mb-3 text-lg font-semibold">{t("borrowed")}</h2>
      {current.length === 0 ? (
        <Empty>{t("noBorrowed")}</Empty>
      ) : (
        <ul className="space-y-3">
          {current.map((i) => (
            <li key={i.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{i.book.title}</div>
                <div className="text-sm text-slate-600">
                  {t("issuedOn")}: {formatDay(i.issuedAt)} · {t("returnBy", { date: formatDate(i.dueAt) })}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">{t("returnIn")}</div>
                <Countdown target={endOfDayIST(i.dueAt).toISOString()} labels={labels} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {requests.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">{t("myRequests")}</h2>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <div className="font-medium">{r.book.title}</div>
                  <div className="text-xs text-slate-500">
                    {t("requestedOn")}: {formatDay(r.createdAt)}
                    {r.status === "REJECTED" && r.note && ` · ${t("reason", { note: r.note })}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={r.status === "APPROVED" ? "CONFIRMED" : r.status === "CANCELLED" ? "NONE" : r.status} label={ts(r.status)} />
                  {r.status === "PENDING" && (
                    <form action={cancelBookRequest.bind(null, r.id)}>
                      <SubmitButton className="text-sm text-red-600 hover:underline">{t("cancelRequest")}</SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {returned.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-600">{t("returnedOn")}</h2>
          <ul className="space-y-1 text-sm text-slate-600">
            {returned.map((i) => (
              <li key={i.id}>
                {i.book.title} — {formatDay(i.returnedAt)}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
