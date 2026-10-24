import type { Book } from "@prisma/client";
import { blobAccess, MAX_IMAGE_BYTES, MAX_PDF_BYTES, sizeLabel, storage } from "@/lib/storage";
import { saveBook } from "./actions";
import { BookUploadForm } from "./BookUploadForm";

export function BookForm({ book, defaultType = "PHYSICAL" }: { book?: Book; defaultType?: "PHYSICAL" | "EBOOK" }) {
  return (
    <BookUploadForm
      action={saveBook.bind(null, book?.id ?? null)}
      book={
        book && {
          title: book.title,
          author: book.author,
          category: book.category,
          language: book.language,
          type: book.type,
          totalCopies: book.totalCopies,
          fileName: book.fileName,
        }
      }
      defaultType={defaultType}
      direct={storage.direct}
      access={blobAccess}
      maxPdfBytes={MAX_PDF_BYTES}
      maxPdfLabel={sizeLabel(MAX_PDF_BYTES)}
      maxImageBytes={MAX_IMAGE_BYTES}
      maxImageLabel={sizeLabel(MAX_IMAGE_BYTES)}
    />
  );
}
