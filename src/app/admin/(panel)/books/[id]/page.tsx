import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { BookForm } from "../BookForm";
import { deleteBook } from "../actions";

export default async function EditBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    include: { issues: { where: { returnedAt: null }, include: { user: { select: { id: true, name: true } } } } },
  });
  if (!book) notFound();
  const lentOut = book.issues.length > 0;

  return (
    <>
      <PageHeader title={`Edit: ${book.title}`}>
        <Link href={`/admin/books?type=${book.type}`} className="btn-outline">
          ← Books
        </Link>
      </PageHeader>
      <Flash params={await searchParams} />
      <div className="card max-w-3xl">
        <BookForm book={book} />
      </div>

      <section className="card mt-6 max-w-3xl border-red-200">
        <h2 className="text-lg font-semibold text-red-800">Delete this book</h2>
        {lentOut ? (
          <p className="mt-1 text-sm text-slate-600">
            You can’t delete it while it’s with{" "}
            {book.issues.map((i, n) => (
              <span key={i.id}>
                {n > 0 && ", "}
                <Link href={`/admin/students/${i.user.id}`} className="text-navy underline">
                  {i.user.name}
                </Link>
              </span>
            ))}
            . Mark it returned in{" "}
            <Link href="/admin/books/issues" className="text-navy underline">
              Borrow & return
            </Link>{" "}
            first.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">
              Removes the book from the catalog{book.filePath ? ", deletes its uploaded PDF" : ""}
              {book.coverPath ? " and cover image" : ""}, and cancels any borrow requests for it. This cannot be undone.
            </p>
            <form action={deleteBook.bind(null, book.id)} className="mt-3">
              <SubmitButton className="btn-danger" confirm={`Delete “${book.title}”? This cannot be undone.`} pendingText="Deleting…">
                🗑 Delete book
              </SubmitButton>
            </form>
          </>
        )}
      </section>
    </>
  );
}
