import Link from "next/link";
import { prisma } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { BookForm } from "./BookForm";
import { deleteBook } from "./actions";

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
            <table className="table">
              <thead>
                <tr>
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
                      <Link href={`/admin/books/${b.id}`} className="mr-3 text-sm text-navy underline">
                        Edit
                      </Link>
                      <form action={deleteBook.bind(null, b.id)} className="inline">
                        <SubmitButton className="text-sm text-red-600 hover:underline" confirm={`Delete “${b.title}”?`}>
                          Delete
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
