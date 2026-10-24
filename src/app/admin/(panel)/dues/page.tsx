import Link from "next/link";
import { getDues, getUnpaidMemberships } from "@/lib/dues";
import { daysBetween, formatDate, formatRupees, todayIST } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { feeReminderText, waLink } from "@/lib/whatsapp";
import { Empty, PageHeader } from "@/components/ui";

export default async function DuesPage() {
  const today = todayIST();
  const [{ expiring, expired }, unpaid, settings] = await Promise.all([
    getDues(today),
    getUnpaidMemberships(today),
    getSettings(),
  ]);

  const reminderFor = (
    student: { name: string; mobile: string },
    m: { endDate: Date; seat: { number: number }; plan: { price: number } | null } | null,
    isExpired: boolean,
    amount?: number,
  ) =>
    waLink(
      student.mobile,
      feeReminderText({
        name: student.name,
        seatNumber: m?.seat.number,
        endDate: m?.endDate,
        expired: isExpired,
        amount: amount ?? m?.plan?.price,
        upiId: settings.upiId,
        libraryName: settings.libraryName,
        libraryPhone: settings.mobile,
      }),
    );

  return (
    <>
      <PageHeader title="Dues & reminders" />
      <p className="mb-6 text-slate-600">
        The WhatsApp button opens a ready-made Hindi + English reminder for that student. Just press send.
      </p>

      <DueSection title={`⚠️ Expiring in the next 7 days (${expiring.length})`}>
        {expiring.length === 0 ? (
          <Empty>No memberships expiring this week.</Empty>
        ) : (
          expiring.map(({ student, membership: m }) => (
            <Row
              key={student.id}
              id={student.id}
              name={student.name}
              mobile={student.mobile}
              info={`Seat #${m.seat.number} · ${m.shift.nameEn} · ends ${formatDate(m.endDate)} (${daysBetween(today, m.endDate)} days)`}
              wa={reminderFor(student, m, false)}
            />
          ))
        )}
      </DueSection>

      <DueSection title={`⛔ Expired — not renewed (${expired.length})`}>
        {expired.length === 0 ? (
          <Empty>No expired memberships in the last 90 days.</Empty>
        ) : (
          expired.map(({ student, membership: m }) => (
            <Row
              key={student.id}
              id={student.id}
              name={student.name}
              mobile={student.mobile}
              info={`Seat #${m.seat.number} · ${m.shift.nameEn} · ended ${formatDate(m.endDate)} (${daysBetween(m.endDate, today)} days ago)`}
              wa={reminderFor(student, m, true)}
            />
          ))
        )}
      </DueSection>

      <DueSection title={`💸 Fee not fully paid (${unpaid.length})`}>
        {unpaid.length === 0 ? (
          <Empty>All current memberships are paid.</Empty>
        ) : (
          unpaid.map((m) => (
            <Row
              key={m.id}
              id={m.userId}
              name={m.user.name}
              mobile={m.user.mobile}
              info={`Seat #${m.seat.number} · ${formatDate(m.startDate)}–${formatDate(m.endDate)} · paid ${formatRupees(m.paid)} of ${formatRupees(m.amount)}`}
              wa={reminderFor(m.user, { ...m, plan: null }, false, m.amount - m.paid)}
            />
          ))
        )}
      </DueSection>
    </>
  );
}

function DueSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ id, name, mobile, info, wa }: { id: string; name: string; mobile: string; info: string; wa: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <Link href={`/admin/students/${id}`} className="font-semibold text-navy hover:underline">
          {name}
        </Link>{" "}
        <span className="text-sm text-slate-500">{mobile}</span>
        <div className="text-sm text-slate-600">{info}</div>
      </div>
      <div className="flex gap-2">
        <a href={`tel:+91${mobile}`} className="btn-outline btn-sm">
          📞 Call
        </a>
        <a href={wa} target="_blank" rel="noopener" className="btn btn-sm bg-green-600 text-white hover:bg-green-700">
          💬 WhatsApp
        </a>
      </div>
    </div>
  );
}
