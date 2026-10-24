import Link from "next/link";
import { prisma } from "@/lib/db";
import { daysBetween, formatDate, formatDay, formatDateTime, todayIST } from "@/lib/dates";
import { DEFAULT_LOAN_DAYS } from "@/lib/library";
import { Empty, Field, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { approveBookRequest, issueBook, rejectBookRequest, returnBook } from "../actions";

export default async function IssuesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const params = await searchParams;
  const today = todayIST();
  const [available, open, recent, requests] = await Promise.all([
    prisma.book.findMany({ where: { type: "PHYSICAL", availableCopies: { gt: 0 } }, orderBy: { title: "asc" } }),
    prisma.bookIssue.findMany({ where: { returnedAt: null }, include: { book: true, user: true }, orderBy: { dueAt: "asc" } }),
    prisma.bookIssue.findMany({
      where: { returnedAt: { not: null } },
      include: { book: true, user: true },
      orderBy: { returnedAt: "desc" },
      take: 20,
    }),
    prisma.bookRequest.findMany({
      where: { status: "PENDING" },
      include: { book: true, user: { include: { bookIssues: { where: { returnedAt: null }, select: { id: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const overdueCount = open.filter((i) => i.dueAt < today).length;

  return (
    <>
      <PageHeader title="Issue & return books">
        <Link href="/admin/books" className="btn-outline">
          ← Catalog
        </Link>
      </PageHeader>
      <Flash params={params} />

      <section className={`mb-6 card ${requests.length ? "border-2 border-amber-300" : ""}`}>
        <h2 className="mb-1 text-lg font-semibold">📥 Borrow requests from students ({requests.length})</h2>
        <p className="mb-3 text-sm text-slate-500">
          Approving issues the book straight away and starts the student&apos;s return countdown. Hand the book over at the desk.
        </p>
        {requests.length === 0 ? (
          <Empty>No requests waiting.</Empty>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-amber-50 p-4">
                <div>
                  <div className="font-semibold">{r.book.title}</div>
                  <div className="text-sm">
                    <Link href={`/admin/students/${r.userId}`} className="text-navy hover:underline">
                      {r.user.name}
                    </Link>{" "}
                    <span className="text-slate-500">({r.user.mobile})</span> · holds {r.user.bookIssues.length} book(s) ·
                    requested {formatDateTime(r.createdAt)}
                  </div>
                  <div className={`text-sm ${r.book.availableCopies > 0 ? "text-green-700" : "text-red-700"}`}>
                    {r.book.availableCopies} of {r.book.totalCopies} copies free
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <form action={approveBookRequest.bind(null, r.id)} className="flex items-end gap-2">
                    <label>
                      <span className="label text-xs">Return in (days)</span>
                      <input type="number" name="days" min={1} max={90} defaultValue={DEFAULT_LOAN_DAYS} className="input w-24" />
                    </label>
                    <SubmitButton className="btn-primary btn-sm" disabled={r.book.availableCopies <= 0}>
                      Approve & issue
                    </SubmitButton>
                  </form>
                  <form action={rejectBookRequest.bind(null, r.id)} className="flex items-end gap-2">
                    <input name="note" placeholder="Reason (optional)" className="input w-40" />
                    <SubmitButton className="btn-danger btn-sm">Reject</SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.8fr]">
        <section className="card self-start">
          <h2 className="mb-3 text-lg font-semibold">Issue a book at the desk</h2>
          {available.length === 0 ? (
            <Empty>No physical books with free copies. Add books in the catalog.</Empty>
          ) : (
            <form action={issueBook} className="space-y-3">
              <label className="block">
                <span className="label">Book *</span>
                <select name="bookId" className="input" required>
                  {available.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.availableCopies} free)
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Student mobile" name="mobile" type="tel" required />
              <Field label="Return within (days)" name="days" type="number" min={1} max={90} defaultValue={DEFAULT_LOAN_DAYS} />
              <SubmitButton className="btn-brand">Issue book</SubmitButton>
            </form>
          )}
        </section>

        <section className="card overflow-x-auto">
          <h2 className="mb-3 text-lg font-semibold">
            Who has which book ({open.length})
            {overdueCount > 0 && <span className="ml-2 text-sm font-normal text-red-700">{overdueCount} overdue</span>}
          </h2>
          {open.length === 0 ? (
            <Empty>No books are out right now.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Borrowed by</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Days left</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {open.map((i) => {
                  const left = daysBetween(today, i.dueAt);
                  return (
                    <tr key={i.id} className={left < 0 ? "bg-red-50" : ""}>
                      <td className="font-medium">{i.book.title}</td>
                      <td>
                        <Link href={`/admin/students/${i.userId}`} className="text-navy hover:underline">
                          {i.user.name}
                        </Link>
                        <div className="text-xs text-slate-500">{i.user.mobile}</div>
                      </td>
                      <td>{formatDay(i.issuedAt)}</td>
                      <td>{formatDate(i.dueAt)}</td>
                      <td className={left < 0 ? "font-semibold text-red-700" : left <= 2 ? "font-semibold text-amber-700" : ""}>
                        {left < 0 ? `${-left} overdue` : left === 0 ? "Due today" : left}
                      </td>
                      <td>
                        <form action={returnBook.bind(null, i.id)}>
                          <SubmitButton className="btn-primary btn-sm">Mark returned</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {recent.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 font-semibold text-slate-600">Recently returned</h3>
              <ul className="space-y-1 text-sm text-slate-600">
                {recent.map((i) => (
                  <li key={i.id}>
                    {i.book.title} — {i.user.name} · {formatDay(i.returnedAt)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
