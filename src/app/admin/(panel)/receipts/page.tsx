import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatRupees } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";
import { Empty, PageHeader, StatCard } from "@/components/ui";

/** IST month boundaries for a "YYYY-MM" value; empty means all time. */
function monthRange(month: string | undefined) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  return { gte: new Date(Date.UTC(y, m - 1, 1) - 330 * 60 * 1000), lt: new Date(Date.UTC(y, m, 1) - 330 * 60 * 1000) };
}

export default async function AdminReceiptsPage({ searchParams }: { searchParams: Promise<{ q?: string; month?: string }> }) {
  const { q = "", month = "" } = await searchParams;
  const query = q.trim();
  const range = monthRange(month);

  const where: Prisma.PaymentWhereInput = {
    status: "CONFIRMED",
    receiptNo: { not: null },
    ...(range ? { paidAt: range } : {}),
    ...(query
      ? {
          OR: [
            { receiptNo: { contains: query, mode: "insensitive" } },
            { user: { name: { contains: query, mode: "insensitive" } } },
            { user: { mobile: { contains: query } } },
            { upiRef: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [receipts, totals, settings] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { user: true, plan: true, membership: { include: { seat: true } } },
      orderBy: { paidAt: "desc" },
      take: 200,
    }),
    prisma.payment.aggregate({ where, _sum: { amount: true }, _count: true }),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader title="Fee receipts">
        <Link href="/admin/payments" className="btn-outline">
          + Record a payment
        </Link>
      </PageHeader>

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label>
          <span className="label">Search</span>
          <input name="q" defaultValue={q} placeholder="Receipt no, name, mobile or UTR" className="input w-72 max-w-full" />
        </label>
        <label>
          <span className="label">Month</span>
          <input type="month" name="month" defaultValue={month} className="input" />
        </label>
        <button className="btn-primary">Show</button>
        {(q || month) && (
          <Link href="/admin/receipts" className="btn-outline">
            Clear
          </Link>
        )}
      </form>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:max-w-md">
        <StatCard label="Receipts" value={totals._count} />
        <StatCard label="Total amount" value={formatRupees(totals._sum.amount ?? 0)} tone="green" />
      </div>

      {receipts.length === 0 ? (
        <Empty>No receipts found.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt no.</th>
                <th>Date</th>
                <th>Student</th>
                <th>For</th>
                <th>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {receipts.map((p) => {
                const text = [
                  `${settings.libraryName} — Fee Receipt ${p.receiptNo}`,
                  `${p.user.name}: ${formatRupees(p.amount)} paid (${p.mode}) on ${formatDateTime(p.paidAt)}`,
                  p.membership ? `Seat #${p.membership.seat.number}, valid till ${formatDate(p.membership.endDate)}` : "",
                  "Log in to the student portal to download your receipt.",
                ]
                  .filter(Boolean)
                  .join("\n");
                return (
                  <tr key={p.id}>
                    <td className="font-mono font-semibold text-navy">{p.receiptNo}</td>
                    <td className="whitespace-nowrap">{formatDateTime(p.paidAt)}</td>
                    <td>
                      <Link href={`/admin/students/${p.userId}`} className="hover:underline">
                        {p.user.name}
                      </Link>
                      <div className="text-xs text-slate-500">{p.user.mobile}</div>
                    </td>
                    <td>
                      {p.plan?.nameEn ?? p.note ?? "—"}
                      <div className="text-xs text-slate-500">
                        {p.mode}
                        {p.upiRef && ` · ${p.upiRef}`}
                      </div>
                    </td>
                    <td className="font-semibold">{formatRupees(p.amount)}</td>
                    <td className="whitespace-nowrap">
                      <Link href={`/receipt/${p.id}`} className="btn-primary btn-sm">
                        View / print
                      </Link>{" "}
                      <a href={waLink(p.user.mobile, text)} target="_blank" rel="noopener" className="btn btn-sm bg-green-600 text-white hover:bg-green-700" aria-label={`Send receipt ${p.receiptNo} on WhatsApp`}>
                        💬
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
