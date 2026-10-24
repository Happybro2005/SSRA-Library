import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatRupees, todayIST } from "@/lib/dates";
import { getDues } from "@/lib/dues";
import { coveringWhere, getSeatAvailability } from "@/lib/queries";
import { PageHeader, StatCard } from "@/components/ui";

export default async function AdminDashboard() {
  const today = todayIST();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1) - 330 * 60 * 1000);

  const [activeStudents, seats, collection, dues, pending, overdueBooks, ebooks, physical, bookRequests, booksOut, openComplaints, newEnquiries] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", isActive: true, memberships: { some: coveringWhere(today) } } }),
    getSeatAvailability(today),
    prisma.payment.aggregate({ where: { status: "CONFIRMED", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    getDues(today),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.bookIssue.count({ where: { returnedAt: null, dueAt: { lt: today } } }),
    prisma.book.count({ where: { type: "EBOOK" } }),
    prisma.book.aggregate({ where: { type: "PHYSICAL" }, _sum: { totalCopies: true } }),
    prisma.bookRequest.count({ where: { status: "PENDING" } }),
    prisma.bookIssue.count({ where: { returnedAt: null } }),
    prisma.complaint.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.enquiry.count({ where: { handled: false } }),
  ]);

  return (
    <>
      <PageHeader title="Dashboard">
        <Link href="/admin/students/new" className="btn-brand">
          + New admission
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active students" value={activeStudents} href="/admin/students?status=ACTIVE" />
        <StatCard label="Collected this month" value={formatRupees(collection._sum.amount ?? 0)} tone="green" href="/admin/payments" />
        <StatCard label="Expiring in 7 days" value={dues.expiring.length} tone="amber" href="/admin/dues" />
        <StatCard label="Expired, not renewed" value={dues.expired.length} tone="brand" href="/admin/dues" />
        <StatCard label="UPI payments to confirm" value={pending} tone={pending ? "amber" : "navy"} href="/admin/payments" />
        <StatCard label="New website enquiries" value={newEnquiries} tone={newEnquiries ? "amber" : "navy"} href="/admin/enquiries" />
        <StatCard label="Open complaints" value={openComplaints} tone={openComplaints ? "brand" : "navy"} href="/admin/complaints" />
        <StatCard label="Book borrow requests" value={bookRequests} tone={bookRequests ? "amber" : "navy"} href="/admin/books/issues" />
        <StatCard label="Books borrowed now" value={booksOut} href="/admin/books/issues" />
        <StatCard label="Overdue books" value={overdueBooks} tone={overdueBooks ? "brand" : "navy"} href="/admin/books/issues" />
        <StatCard label="E-books" value={ebooks} href="/admin/books?type=EBOOK" />
        <StatCard label="Physical books" value={physical._sum.totalCopies ?? 0} href="/admin/books?type=PHYSICAL" />
      </div>

      <section className="mt-8 card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Seats today ({seats.seatCount} total)</h2>
          <Link href="/admin/seats" className="text-sm text-navy underline">
            Open seat map
          </Link>
        </div>
        <div className="space-y-3">
          {seats.byShift.map(({ shift, occupied, free }) => {
            const pct = seats.seatCount ? Math.round((occupied / seats.seatCount) * 100) : 0;
            return (
              <div key={shift.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">
                    {shift.nameEn} ({shift.startTime}–{shift.endTime})
                  </span>
                  <span>
                    {occupied} occupied · <b className="text-green-700">{free} free</b>
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
