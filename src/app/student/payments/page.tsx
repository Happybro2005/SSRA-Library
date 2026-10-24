import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { formatDateTime, formatRupees } from "@/lib/dates";
import { Badge, Empty } from "@/components/ui";

export default async function StudentPaymentsPage() {
  const user = await requireStudent();
  const t = await getTranslations("student");
  const ts = await getTranslations("status");
  const tc = await getTranslations("common");
  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold text-navy">{t("payments")}</h1>
      {payments.length === 0 ? (
        <Empty>{t("noPayments")}</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>{tc("date")}</th>
                <th>{tc("amount")}</th>
                <th>{t("plan")}</th>
                <th>{tc("status")}</th>
                <th>{t("receipt")}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.paidAt)}</td>
                  <td className="font-semibold">{formatRupees(p.amount)}</td>
                  <td>{p.plan ? (p.plan.nameEn) : (p.note ?? "—")}</td>
                  <td>
                    <Badge status={p.status} label={ts(p.status)} />
                  </td>
                  <td>
                    {p.receiptNo ? (
                      <Link href={`/receipt/${p.id}`} target="_blank" className="text-navy underline">
                        {p.receiptNo}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
