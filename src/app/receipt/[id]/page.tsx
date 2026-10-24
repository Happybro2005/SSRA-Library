import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateTime, formatRupees } from "@/lib/dates";
import { amountInWords } from "@/lib/receipts";
import { waLink } from "@/lib/whatsapp";
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
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && payment.userId !== session.user.id) notFound();
  const settings = await getSettings();
  const m = payment.membership;

  const rows: [string, React.ReactNode][] = [
    ["Student name", <b key="n">{payment.user.name}</b>],
    ["Mobile", payment.user.mobile],
    ...(payment.user.fatherName ? ([["Father's name", payment.user.fatherName]] as [string, React.ReactNode][]) : []),
    ...(payment.plan ? ([["Plan", payment.plan.nameEn]] as [string, React.ReactNode][]) : []),
    ...(m
      ? ([
          ["Seat / shift", `Seat #${m.seat.number} · ${m.shift.nameEn} (${m.shift.startTime}–${m.shift.endTime})`],
          ["Valid", `${formatDate(m.startDate)} to ${formatDate(m.endDate)}`],
        ] as [string, React.ReactNode][])
      : []),
    ...(payment.note ? ([["Note", payment.note]] as [string, React.ReactNode][]) : []),
    ["Payment mode", `${payment.mode === "UPI" ? "UPI" : "Cash"}${payment.upiRef ? ` · UTR ${payment.upiRef}` : ""}`],
  ];

  const shareText = [
    `${settings.libraryName} — Fee Receipt`,
    `Receipt no: ${payment.receiptNo}`,
    `Student: ${payment.user.name}`,
    `Amount paid: ${formatRupees(payment.amount)} (${payment.mode})`,
    m ? `Seat #${m.seat.number}, valid ${formatDate(m.startDate)} to ${formatDate(m.endDate)}` : "",
    `Date: ${formatDateTime(payment.paidAt)}`,
    `Thank you! — ${settings.libraryName}, ${settings.mobile}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="min-h-screen bg-paper px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-2xl flex-wrap items-center justify-between gap-2">
        <Link href={isAdmin ? "/admin/receipts" : "/student/payments"} className="btn-outline btn-sm">
          ← Back
        </Link>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <a href={waLink(payment.user.mobile, shareText)} target="_blank" rel="noopener" className="btn btn-sm bg-green-600 text-white hover:bg-green-700">
              💬 Send on WhatsApp
            </a>
          )}
          <PrintButton />
        </div>
      </div>

      <article className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-center justify-between gap-4 bg-navy px-6 py-5 text-white print:bg-navy">
          <div>
            <div className="font-display text-3xl font-bold leading-none">
              <span className="text-sun">SSRA</span> LIBRARY
            </div>
            <p className="mt-1 text-sm italic text-white/85">{settings.tagline}</p>
          </div>
          <div className="text-right text-sm text-white/90">
            <div>{settings.address}</div>
            <div>📞 {settings.mobile}</div>
          </div>
        </header>

        <div className="px-6 py-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-dashed border-slate-200 pb-4">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold uppercase tracking-widest text-navy">
                Fee Receipt
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold tracking-wide text-green-800">✓ Paid</span>
              </h1>
              <div className="mt-1 text-sm text-slate-500">Receipt no.</div>
              <div className="font-mono text-lg font-bold">{payment.receiptNo}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Date</div>
              <div className="font-semibold">{formatDateTime(payment.paidAt)}</div>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 top-1/2 hidden sm:block -translate-y-1/2 rotate-[-14deg] rounded-xl border-4 border-green-600/70 px-4 py-1 font-display text-4xl font-bold tracking-widest text-green-600/70"
            >
              PAID
            </div>
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="w-28 py-2 pr-3 text-left align-top font-medium text-slate-500 sm:w-40 sm:pr-4">
                    {label}
                  </th>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="mt-6 rounded-xl bg-sun/30 px-5 py-4 print:border print:border-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">Amount paid</span>
              <span className="font-display text-4xl font-bold text-ink">{formatRupees(payment.amount)}</span>
            </div>
            <div className="mt-1 text-sm italic text-slate-700">{amountInWords(payment.amount)}</div>
          </div>

          <footer className="mt-10 flex flex-wrap items-end justify-between gap-6 text-sm">
            <div className="text-slate-500">
              <div>Thank you for studying with us!</div>
              <div className="text-xs">This is a computer-generated receipt.</div>
            </div>
            <div className="text-center">
              <div className="mb-1 h-10" />
              <div className="border-t border-slate-400 px-6 pt-1 font-semibold">{payment.recordedBy?.name ?? settings.ownerName}</div>
              <div className="text-xs text-slate-500">Authorised signatory</div>
            </div>
          </footer>
        </div>
      </article>
    </main>
  );
}
