import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatDay, formatRupees, todayIST, toDateInput } from "@/lib/dates";
import { membershipStatus } from "@/lib/membership";
import { renewalStart } from "@/lib/membership-service";
import { getPickerData } from "@/lib/picker-data";
import { getSettings } from "@/lib/settings";
import { feeReminderText, waLink } from "@/lib/whatsapp";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { MembershipForm } from "@/components/MembershipForm";
import { SubmitButton } from "@/components/SubmitButton";
import { StudentFields } from "../StudentFields";
import { addStudentMembership, deleteMembership, deleteStudent, setStudentActive, updateStudent } from "../actions";

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const t = await getTranslations("status");
  const today = todayIST();

  const student = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: { include: { seat: true, shift: true, plan: true }, orderBy: { startDate: "desc" } },
      payments: { include: { plan: true }, orderBy: { paidAt: "desc" } },
      bookIssues: { include: { book: true }, orderBy: { issuedAt: "desc" } },
    },
  });
  if (!student || student.role !== "STUDENT") notFound();

  const [picker, settings] = await Promise.all([getPickerData(), getSettings()]);
  const latest = student.memberships.reduce<(typeof student.memberships)[number] | undefined>(
    (acc, m) => (!acc || m.endDate > acc.endDate ? m : acc),
    undefined,
  );
  const latestStatus = latest ? membershipStatus(latest, today) : "NONE";
  const reminder = latest
    ? waLink(
        student.mobile,
        feeReminderText({
          name: student.name,
          seatNumber: latest.seat.number,
          endDate: latest.endDate,
          expired: latestStatus === "EXPIRED",
          amount: latest.plan?.price,
          upiId: settings.upiId,
          libraryName: settings.libraryName,
          libraryPhone: settings.mobile,
        }),
      )
    : null;

  return (
    <>
      <PageHeader title={student.name}>
        <Badge status={latestStatus} label={t(latestStatus)} />
        {reminder && (
          <a href={reminder} target="_blank" rel="noopener" className="btn btn-sm bg-green-600 text-white hover:bg-green-700">
            💬 WhatsApp reminder
          </a>
        )}
        <a href={`tel:+91${student.mobile}`} className="btn-outline btn-sm">
          📞 {student.mobile}
        </a>
      </PageHeader>
      <Flash params={flash} />
      {!student.isActive && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">This student is deactivated and cannot log in.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">Details</h2>
          <form action={updateStudent.bind(null, student.id)} className="space-y-4">
            <StudentFields student={student} passwordLabel="Set new password (leave blank to keep)" />
            <SubmitButton>Save details</SubmitButton>
          </form>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <form action={setStudentActive.bind(null, student.id, !student.isActive)}>
              <SubmitButton className="btn-outline btn-sm">{student.isActive ? "Deactivate" : "Re-activate"}</SubmitButton>
            </form>
            <form action={deleteStudent.bind(null, student.id)}>
              <SubmitButton
                className="btn-danger btn-sm"
                confirm="Delete this student with all memberships, payments and book records? This cannot be undone."
              >
                Delete student
              </SubmitButton>
            </form>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">{latest ? "Renew / add membership" : "Assign seat & plan"}</h2>
          <MembershipForm
            action={addStudentMembership.bind(null, student.id)}
            {...picker}
            defaults={{
              startDate: toDateInput(renewalStart(latest?.endDate, today)),
              seatId: latest?.seatId,
              shiftId: latest?.shiftId,
              planId: latest?.planId ?? undefined,
            }}
            submitLabel={latest ? "Renew membership" : "Assign seat"}
          />
        </section>
      </div>

      <section className="mt-6 card overflow-x-auto">
        <h2 className="mb-3 text-lg font-semibold">Memberships</h2>
        {student.memberships.length === 0 ? (
          <Empty>No memberships yet.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Seat</th>
                <th>Shift</th>
                <th>Plan</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {student.memberships.map((m) => {
                const s = membershipStatus(m, today);
                return (
                  <tr key={m.id}>
                    <td>#{m.seat.number}</td>
                    <td>{m.shift.nameEn}</td>
                    <td>{m.plan?.nameEn ?? "—"}</td>
                    <td>{formatDate(m.startDate)}</td>
                    <td>{formatDate(m.endDate)}</td>
                    <td>{formatRupees(m.amount)}</td>
                    <td>
                      <Badge status={s} label={t(s)} />
                    </td>
                    <td>
                      <form action={deleteMembership.bind(null, student.id, m.id)}>
                        <SubmitButton className="text-sm text-red-600 hover:underline" confirm="Remove this membership?">
                          Remove
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-6 card overflow-x-auto">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Payments</h2>
          <Link href={`/admin/payments?student=${student.mobile}`} className="btn-outline btn-sm">
            + Record payment
          </Link>
        </div>
        {student.payments.length === 0 ? (
          <Empty>No payments yet.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {student.payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.paidAt)}</td>
                  <td>{formatRupees(p.amount)}</td>
                  <td>
                    {p.mode}
                    {p.upiRef && <div className="text-xs text-slate-500">{p.upiRef}</div>}
                  </td>
                  <td>{p.plan?.nameEn ?? "—"}</td>
                  <td>
                    <Badge status={p.status} label={t(p.status)} />
                  </td>
                  <td>
                    {p.receiptNo ? (
                      <Link href={`/receipt/${p.id}`} className="text-navy underline">
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
        )}
      </section>

      <section className="mt-6 card overflow-x-auto">
        <h2 className="mb-3 text-lg font-semibold">Books issued</h2>
        {student.bookIssues.length === 0 ? (
          <Empty>No books issued.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Book</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Returned</th>
              </tr>
            </thead>
            <tbody>
              {student.bookIssues.map((i) => (
                <tr key={i.id}>
                  <td>{i.book.title}</td>
                  <td>{formatDay(i.issuedAt)}</td>
                  <td className={!i.returnedAt && i.dueAt < today ? "font-semibold text-red-700" : ""}>{formatDate(i.dueAt)}</td>
                  <td>{i.returnedAt ? formatDay(i.returnedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
