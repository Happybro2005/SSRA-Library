"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { SubmitButton } from "@/components/SubmitButton";

type BookFields = {
  title: string;
  author: string | null;
  category: string | null;
  language: string | null;
  type: "PHYSICAL" | "EBOOK";
  totalCopies: number;
  fileName: string | null;
};

/**
 * The add/edit book form. With direct uploads (Vercel), a chosen PDF is first sent straight from the
 * browser to Blob storage with a progress bar, then the form is saved with just the file's key.
 * Otherwise the PDF is submitted with the form as usual.
 */
export function BookUploadForm({
  action,
  book,
  defaultType,
  direct,
  access,
  maxPdfBytes,
  maxPdfLabel,
  maxImageBytes,
  maxImageLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  book?: BookFields;
  defaultType: "PHYSICAL" | "EBOOK";
  direct: boolean;
  access: "public" | "private";
  maxPdfBytes: number;
  maxPdfLabel: string;
  maxImageBytes: number;
  maxImageLabel: string;
}) {
  const keyRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    setError(null);
    const form = e.currentTarget;
    const pdfInput = form.elements.namedItem("file") as HTMLInputElement;
    const coverInput = form.elements.namedItem("cover") as HTMLInputElement;
    const pdf = pdfInput.files?.[0];
    const cover = coverInput.files?.[0];

    if (pdf && (pdf.type !== "application/pdf" || pdf.size > maxPdfBytes)) {
      e.preventDefault();
      setError(`The e-book must be a PDF under ${maxPdfLabel}.`);
      return;
    }
    if (cover && cover.size > maxImageBytes) {
      e.preventDefault();
      setError(`The cover image must be under ${maxImageLabel}.`);
      return;
    }
    // Nothing big to send first: let the form submit normally.
    if (!direct || !pdf) return;

    e.preventDefault();
    setProgress(0);
    try {
      const key = `ebooks/${crypto.randomUUID()}.pdf`;
      await upload(key, pdf, {
        access,
        handleUploadUrl: "/api/uploads/ebook",
        contentType: "application/pdf",
        multipart: pdf.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.min(99, Math.round(percentage))),
      });
      keyRef.current!.value = key;
      nameRef.current!.value = pdf.name;
      pdfInput.value = ""; // the file is already stored; don't send it again
      setProgress(100);
      form.requestSubmit();
    } catch (err) {
      setProgress(null);
      setError(`Upload failed: ${err instanceof Error ? err.message : "please try again"}.`);
    }
  }

  const uploading = progress !== null && progress < 100;

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-3">
      <input ref={keyRef} type="hidden" name="uploadedKey" />
      <input ref={nameRef} type="hidden" name="uploadedName" />
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
          <span className="label">
            PDF file (e-books, max {maxPdfLabel}){book?.fileName && ` — current: ${book.fileName}`}
          </span>
          <input type="file" name="file" accept="application/pdf" className="input" disabled={uploading} />
        </label>
        <label className="block">
          <span className="label">Cover image (optional, max {maxImageLabel})</span>
          <input type="file" name="cover" accept="image/*" className="input" disabled={uploading} />
        </label>
      </div>

      {progress !== null && (
        <div role="status" aria-live="polite">
          <div className="mb-1 flex justify-between text-sm">
            <span>{progress < 100 ? "Uploading PDF… keep this page open" : "Uploaded. Saving…"}</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-navy transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <SubmitButton className="btn-brand" pendingText="Saving…" disabled={uploading}>
        {uploading ? "Uploading…" : book ? "Save book" : "Add book"}
      </SubmitButton>
    </form>
  );
}
