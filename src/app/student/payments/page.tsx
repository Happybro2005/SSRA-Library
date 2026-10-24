import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { formatDate, formatDateTime, formatRupees } from "@/lib/dates";
import { Badge, Empty } from "@/components/ui";

export default async function StudentReceiptsPage() {
  const user = await requireStudent();
  const t = await getTranslations("student");
  const ts = await getTranslations("status");
  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    include: { plan: true, membership: { include: { seat: true } } },
    orderBy: { paidAt: "desc" },
  });
  const receipts = payments.filter((p) => p.status === "CONFIRMED" && p.receiptNo);
  const others = payments.filter((p) => !(p.status === "CONFIRMED" && p.receiptNo));
  const total = receipts.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">{t("payments")}</h1>
          <p className="text-slate-600">{t("receiptsIntro")}</p>
        </div>
        {receipts.length > 0 && (
          <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm ring-1 ring-slate-200">
            <div className="text-xs text-slate-500">{t("totalPaid")}</div>
            <div className="font-display text-2xl font-bold text-green-700">{formatRupees(total)}</div>
            <div className="text-xs text-slate-500">{t("receiptsCount", { count: receipts.length })}</div>
          </div>
        )}
      </div>

      {receipts.length === 0 ? (
        <Empty>{t("noReceipts")}</Empty>
      ) : (
        <ul className="space-y-3">
          {receipts.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-green-100 text-2xl">
                  🧾
                </span>
                <div>
                  <div className="font-mono text-sm font-bold text-navy">{p.receiptNo}</div>
                  <div className="font-semibold">{p.plan ? p.plan.nameEn : (p.note ?? "Fee")}</div>
                  <div className="text-sm text-slate-500">
                    {formatDateTime(p.paidAt)} · {p.mode === "UPI" ? "UPI" : "Cash"}
                    {p.membership && ` · ${t("validTill", { date: formatDate(p.membership.endDate) })}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-display text-2xl font-bold">{formatRupees(p.amount)}</span>
                <Link href={`/receipt/${p.id}`} className="btn-primary btn-sm">
                  {t("viewReceipt")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">{t("otherPayments")}</h2>
          <ul className="space-y-2">
            {others.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <span>
                  {formatRupees(p.amount)} · {p.plan?.nameEn ?? p.note ?? "—"} · {formatDateTime(p.createdAt)}
                  {p.upiRef && ` · UTR ${p.upiRef}`}
                </span>
                <Badge status={p.status} label={ts(p.status)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
