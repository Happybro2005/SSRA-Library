import type { Book } from "@prisma/client";
import { SubmitButton } from "@/components/SubmitButton";
import { saveBook } from "./actions";

export function BookForm({ book, defaultType = "PHYSICAL" }: { book?: Book; defaultType?: "PHYSICAL" | "EBOOK" }) {
  return (
    <form action={saveBook.bind(null, book?.id ?? null)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">Title *</span>
          <input name="title" defaultValue={book?.title} className="input" required />
        </label>
        <label className="block">
          <span className="label">Author</span>
          <input name="author" defaultValue={book?.author ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="label">Category / exam</span>
          <input name="category" defaultValue={book?.category ?? ""} placeholder="e.g. UPSC, SSC, Railway, NCERT" className="input" />
        </label>
        <label className="block">
          <span className="label">Language</span>
          <select name="language" defaultValue={book?.language ?? "Hindi"} className="input">
            <option>Hindi</option>
            <option>English</option>
            <option>Bilingual</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Type *</span>
          <select name="type" defaultValue={book?.type ?? defaultType} className="input">
            <option value="PHYSICAL">Physical book</option>
            <option value="EBOOK">E-book (PDF)</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Copies (physical books)</span>
          <input type="number" name="totalCopies" min={0} defaultValue={book?.totalCopies ?? 1} className="input" />
        </label>
        <label className="block">
          <span className="label">PDF file (e-books, max 50 MB){book?.fileName && ` — current: ${book.fileName}`}</span>
          <input type="file" name="file" accept="application/pdf" className="input" />
        </label>
        <label className="block">
          <span className="label">Cover image (optional)</span>
          <input type="file" name="cover" accept="image/*" className="input" />
        </label>
      </div>
      <SubmitButton className="btn-brand" pendingText="Uploading…">
        {book ? "Save book" : "Add book"}
      </SubmitButton>
    </form>
  );
}
