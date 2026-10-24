import Link from "next/link";
import { prisma } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { BookForm } from "./BookForm";
import { deleteBook, deleteSelectedBooks } from "./actions";
import { SelectAll } from "./SelectAll";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const type = params.type === "EBOOK" ? "EBOOK" : "PHYSICAL";
  const q = params.q?.trim() ?? "";
  const [books, counts] = await Promise.all([
    prisma.book.findMany({
      where: {
        type,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { author: { contains: q, mode: "insensitive" as const } },
                { category: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: { issues: { where: { returnedAt: null }, include: { user: { select: { id: true, name: true } } } } },
      orderBy: { title: "asc" },
    }),
    prisma.book.groupBy({ by: ["type"], _count: true }),
  ]);
  const count = (t: string) => counts.find((c) => c.type === t)?._count ?? 0;

  return (
    <>
      <PageHeader title="Books">
        <Link href="/admin/books/issues" className="btn-primary">
          Issue / return
        </Link>
      </PageHeader>
      <Flash params={params} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["PHYSICAL", "EBOOK"] as const).map((t) => (
          <Link
            key={t}
            href={`/admin/books?type=${t}`}
            className={`rounded-full px-4 py-1.5 font-semibold ${type === t ? "bg-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {t === "PHYSICAL" ? "📚 Physical" : "📱 E-books"} ({count(t)})
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="type" value={type} />
          <input name="q" defaultValue={q} placeholder="Search title, author, category" className="input" />
          <button className="btn-outline">Search</button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card overflow-x-auto p-0">
          {books.length === 0 ? (
            <div className="p-5">
              <Empty>No books yet.</Empty>
            </div>
          ) : (
            <form action={deleteSelectedBooks.bind(null, type)}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-500">Tick books to delete several at once.</span>
              <SubmitButton
                className="btn-danger btn-sm"
                confirm="Delete all ticked books and their uploaded files? This cannot be undone."
                pendingText="Deleting…"
              >
                🗑 Delete selected
              </SubmitButton>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    <SelectAll label="Select all books" />
                  </th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>{type === "EBOOK" ? "File" : "Available"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <input
                        type="checkbox"
                        name="ids"
                        value={b.id}
                        disabled={b.issues.length > 0}
                        aria-label={`Select “${b.title}”`}
                        title={b.issues.length > 0 ? "A student has this book — mark it returned first" : undefined}
                        className="h-4 w-4 accent-[var(--color-brand)]"
                      />
                    </td>
                    <td>
                      <div className="font-semibold">{b.title}</div>
                      <div className="text-xs text-slate-500">
                        {[b.author, b.language].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td>{b.category ?? "—"}</td>
                    <td>
                      {type === "EBOOK" ? (
                        <a href={`/api/ebooks/${b.id}`} target="_blank" className="text-navy underline">
                          Open PDF
                        </a>
                      ) : (
                        <>
                          {b.availableCopies} / {b.totalCopies}
                          {b.issues.length > 0 && (
                            <div className="text-xs text-slate-500">
                              With:{" "}
                              {b.issues.map((i, n) => (
                                <span key={i.id}>
                                  {n > 0 && ", "}
                                  <Link href={`/admin/students/${i.user.id}`} className="text-navy hover:underline">
                                    {i.user.name}
                                  </Link>
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <Link href={`/admin/books/${b.id}`} className="btn-outline btn-sm">
                          Edit
                        </Link>
                        <SubmitButton
                          formAction={deleteBook.bind(null, b.id)}
                          formNoValidate
                          className="btn-danger btn-sm"
                          disabled={b.issues.length > 0}
                          confirm={`Delete “${b.title}”${b.filePath ? " and its PDF" : ""}? This cannot be undone.`}
                          pendingText="Deleting…"
                        >
                          🗑 Delete
                        </SubmitButton>
                      </div>
                      {b.issues.length > 0 && <div className="mt-1 text-xs text-slate-500">With a student — return it first</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </form>
          )}
        </section>
        <section className="card self-start">
          <h2 className="mb-3 text-lg font-semibold">Add a book</h2>
          <BookForm defaultType={type} />
        </section>
      </div>
    </>
  );
}
