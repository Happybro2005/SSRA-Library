import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateTime, formatRupees } from "@/lib/dates";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { user: true, plan: true, membership: { include: { seat: true, shift: true } }, recordedBy: true },
  });
  if (!payment || !payment.receiptNo) notFound();
  if (session.user.role !== "ADMIN" && payment.userId !== session.user.id) notFound();
  const settings = await getSettings();
  const m = payment.membership;

  return (
    <main className="mx-auto max-w-lg p-4 print:p-0">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <article className="rounded-xl border-2 border-navy bg-white p-6 print:border">
        <header className="border-b-2 border-dashed border-slate-300 pb-4 text-center">
          <h1 className="font-display text-3xl font-bold text-brand">SSRA LIBRARY</h1>
          <p className="text-sm italic">{settings.tagline}</p>
          <p className="mt-1 text-sm">{settings.address}</p>
          <p className="text-sm">📞 {settings.mobile}</p>
        </header>
        <h2 className="my-4 text-center text-lg font-bold uppercase tracking-wider text-navy">Fee Receipt</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Receipt no.</dt>
          <dd className="font-semibold">{payment.receiptNo}</dd>
          <dt className="text-slate-500">Date</dt>
          <dd>{formatDateTime(payment.paidAt)}</dd>
          <dt className="text-slate-500">Student</dt>
          <dd className="font-semibold">{payment.user.name}</dd>
          <dt className="text-slate-500">Mobile</dt>
          <dd>{payment.user.mobile}</dd>
          {payment.plan && (
            <>
              <dt className="text-slate-500">Plan</dt>
              <dd>{payment.plan.nameEn}</dd>
            </>
          )}
          {m && (
            <>
              <dt className="text-slate-500">Seat / Shift</dt>
              <dd>
                #{m.seat.number} · {m.shift.nameEn} ({m.shift.startTime}–{m.shift.endTime})
              </dd>
              <dt className="text-slate-500">Valid</dt>
              <dd>
                {formatDate(m.startDate)} – {formatDate(m.endDate)}
              </dd>
            </>
          )}
          {payment.note && (
            <>
              <dt className="text-slate-500">Note</dt>
              <dd>{payment.note}</dd>
            </>
          )}
          <dt className="text-slate-500">Mode</dt>
          <dd>
            {payment.mode}
            {payment.upiRef && ` · UTR ${payment.upiRef}`}
          </dd>
        </dl>
        <div className="mt-5 flex items-center justify-between rounded-lg bg-sun/40 px-4 py-3">
          <span className="font-semibold">Amount paid</span>
          <span className="font-display text-3xl font-bold">{formatRupees(payment.amount)}</span>
        </div>
        <footer className="mt-8 flex items-end justify-between text-xs text-slate-500">
          <span>Thank you!</span>
          <span className="border-t border-slate-400 pt-1">
            {payment.recordedBy?.name ?? settings.ownerName}
          </span>
        </footer>
      </article>
    </main>
  );
}
