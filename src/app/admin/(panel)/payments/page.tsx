import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatDateTime, formatRupees } from "@/lib/dates";
import { Badge, Empty, Field, PageHeader, StatCard } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { approvePayment, recordPayment, rejectPayment } from "./actions";

function monthRange(month: string | undefined) {
  const now = new Date();
  const [y, m] = month && /^\d{4}-\d{2}$/.test(month) ? month.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  // Month boundaries in IST (UTC+5:30)
  const start = new Date(Date.UTC(y, m - 1, 1) - 330 * 60 * 1000);
  const end = new Date(Date.UTC(y, m, 1) - 330 * 60 * 1000);
  return { start, end, value: `${y}-${String(m).padStart(2, "0")}` };
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; student?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("status");
  const { start, end, value } = monthRange(params.month);

  const [pending, payments] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING" },
      include: { user: { include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { seat: true } } } }, plan: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: start, lt: end }, status: { not: "PENDING" } },
      include: { user: true, plan: true },
      orderBy: { paidAt: "desc" },
    }),
  ]);
  const confirmed = payments.filter((p) => p.status === "CONFIRMED");
  const total = confirmed.reduce((s, p) => s + p.amount, 0);
  const cash = confirmed.filter((p) => p.mode === "CASH").reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader title="Payments" />
      <Flash params={params} />

      {pending.length > 0 && (
        <section className="mb-6 card border-2 border-amber-300">
          <h2 className="mb-3 text-lg font-semibold">⏳ UPI payments waiting for confirmation ({pending.length})</h2>
          <p className="mb-3 text-sm text-slate-600">
            Check that the money has reached your UPI account (match the UTR) before confirming.
          </p>
          <div className="space-y-3">
            {pending.map((p) => {
              const last = p.user.memberships[0];
              return (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-4">
                  <div>
                    <Link href={`/admin/students/${p.userId}`} className="font-semibold text-navy hover:underline">
                      {p.user.name}
                    </Link>{" "}
                    <span className="text-slate-500">({p.user.mobile})</span>
                    <div className="text-sm">
                      <b>{formatRupees(p.amount)}</b> · {p.plan?.nameEn ?? "No plan"} · UTR <code>{p.upiRef}</code> ·{" "}
                      {formatDateTime(p.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.planId && last && (
                      <form action={approvePayment.bind(null, p.id, true)}>
                        <SubmitButton className="btn-primary btn-sm">Confirm & renew seat #{last.seat.number}</SubmitButton>
                      </form>
                    )}
                    <form action={approvePayment.bind(null, p.id, false)}>
                      <SubmitButton className="btn-outline btn-sm">Confirm only</SubmitButton>
                    </form>
                    <form action={rejectPayment.bind(null, p.id)}>
                      <SubmitButton className="btn-danger btn-sm" confirm="Reject this payment?">
                        Reject
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <section className="card">
          <h2 className="mb-1 text-lg font-semibold">Record a payment</h2>
          <p className="mb-4 text-sm text-slate-500">
            For new admissions and renewals use the student page — it records the payment with the seat.
          </p>
          <form action={recordPayment} className="space-y-3">
            <Field label="Student mobile" name="mobile" type="tel" defaultValue={params.student} required />
            <Field label="Amount (₹)" name="amount" type="number" min={1} required />
            <label className="block">
              <span className="label">Mode</span>
              <select name="mode" className="input">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </label>
            <Field label="UPI ref / UTR (if UPI)" name="upiRef" />
            <Field label="Note" name="note" placeholder="e.g. late fee, balance" />
            <SubmitButton className="btn-brand">Save & create receipt</SubmitButton>
          </form>
        </section>

        <section>
          <form className="mb-4 flex items-end gap-2">
            <label>
              <span className="label">Month</span>
              <input type="month" name="month" defaultValue={value} className="input" />
            </label>
            <button className="btn-primary">Show</button>
          </form>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Collected this month" value={formatRupees(total)} tone="green" />
            <StatCard label="Cash / UPI" value={`${formatRupees(cash)} / ${formatRupees(total - cash)}`} />
          </div>
        </section>
      </div>

      <section className="card overflow-x-auto p-0">
        {payments.length === 0 ? (
          <div className="p-5">
            <Empty>No payments in this month.</Empty>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Student</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>For</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.receiptNo ? (
                      <Link href={`/receipt/${p.id}`} target="_blank" className="text-navy underline">
                        {p.receiptNo}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatDateTime(p.paidAt)}</td>
                  <td>
                    <Link href={`/admin/students/${p.userId}`} className="hover:underline">
                      {p.user.name}
                    </Link>
                  </td>
                  <td className="font-semibold">{formatRupees(p.amount)}</td>
                  <td>{p.mode}</td>
                  <td>{p.plan?.nameEn ?? p.note ?? "—"}</td>
                  <td>
                    <Badge status={p.status} label={t(p.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
