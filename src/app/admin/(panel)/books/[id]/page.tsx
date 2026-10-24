import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { BookForm } from "../BookForm";

export default async function EditBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) notFound();
  return (
    <>
      <PageHeader title={`Edit: ${book.title}`} />
      <Flash params={await searchParams} />
      <div className="card max-w-3xl">
        <BookForm book={book} />
      </div>
    </>
  );
}
