"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { flashRedirect } from "@/lib/flash";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, storage } from "@/lib/storage";
import { addDays, todayIST } from "@/lib/dates";
import { formObject, mobileSchema, optionalText } from "@/lib/validation";
import { DEFAULT_LOAN_DAYS } from "@/lib/library";

const PATH = "/admin/books";

const bookSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  author: optionalText,
  category: optionalText,
  language: optionalText,
  type: z.enum(["PHYSICAL", "EBOOK"]),
  totalCopies: z.coerce.number().int().min(0).default(1),
});

function fileFrom(formData: FormData, name: string): File | null {
  const f = formData.get(name);
  return f instanceof File && f.size > 0 ? f : null;
}

export async function saveBook(id: string | null, formData: FormData) {
  await requireAdmin();
  const back = id ? `${PATH}/${id}` : PATH;
  const parsed = bookSchema.safeParse(formObject(formData));
  if (!parsed.success) flashRedirect(back, "error", parsed.error.issues[0]?.message ?? "Invalid book");
  const data = parsed.data;

  const pdf = fileFrom(formData, "file");
  const cover = fileFrom(formData, "cover");
  if (pdf && (pdf.type !== "application/pdf" || pdf.size > MAX_UPLOAD_BYTES)) {
    flashRedirect(back, "error", `E-book must be a PDF under ${MAX_UPLOAD_LABEL}.`);
  }
  if (cover && !cover.type.startsWith("image/")) flashRedirect(back, "error", "Cover must be an image.");

  const existing = id ? await prisma.book.findUnique({ where: { id } }) : null;
  if (data.type === "EBOOK" && !pdf && !existing?.filePath) flashRedirect(back, "error", "Upload the PDF for this e-book.");

  const fileFields = pdf ? { filePath: await storage.save("ebooks", pdf), fileName: pdf.name } : {};
  const coverFields = cover ? { coverPath: await storage.save("public/covers", cover) } : {};
  if (pdf && existing?.filePath) await storage.remove(existing.filePath);
  if (cover && existing?.coverPath) await storage.remove(existing.coverPath);

  const copies = data.type === "EBOOK" ? 1 : data.totalCopies;
  if (existing) {
    const issued = existing.totalCopies - existing.availableCopies;
    await prisma.book.update({
      where: { id: existing.id },
      data: { ...data, totalCopies: copies, availableCopies: Math.max(copies - issued, 0), ...fileFields, ...coverFields },
    });
  } else {
    await prisma.book.create({
      data: { ...data, totalCopies: copies, availableCopies: copies, ...fileFields, ...coverFields },
    });
  }
  revalidatePath("/");
  flashRedirect(PATH + `?type=${data.type}`, "ok", `“${data.title}” saved.`);
}

/** Deletes books and their uploaded files. Books a student still has are skipped (they must be returned first). */
async function removeBooks(ids: string[]) {
  const books = await prisma.book.findMany({
    where: { id: { in: ids } },
    include: { _count: { select: { issues: { where: { returnedAt: null } } } } },
  });
  const blocked = books.filter((b) => b._count.issues > 0);
  const deletable = books.filter((b) => b._count.issues === 0);
  await prisma.book.deleteMany({ where: { id: { in: deletable.map((b) => b.id) } } });
  for (const b of deletable) {
    for (const key of [b.filePath, b.coverPath]) {
      // The record is already gone; a missing file must not stop the rest.
      if (key) await storage.remove(key).catch((err) => console.error("[books] could not remove file", key, err));
    }
  }
  revalidatePath("/");
  revalidatePath("/books");
  return { deleted: deletable, blocked };
}

export async function deleteBook(id: string) {
  await requireAdmin();
  const { deleted, blocked } = await removeBooks([id]);
  const type = (deleted[0] ?? blocked[0])?.type ?? "PHYSICAL";
  if (blocked.length) {
    flashRedirect(PATH + `?type=${type}`, "error", `“${blocked[0].title}” is with a student. Mark it returned in Borrow & return before deleting.`);
  }
  flashRedirect(PATH + `?type=${type}`, "ok", deleted.length ? `“${deleted[0].title}” deleted.` : "Book was already deleted.");
}

export async function deleteSelectedBooks(type: "PHYSICAL" | "EBOOK", formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) flashRedirect(PATH + `?type=${type}`, "error", "Tick the books you want to delete first.");
  const { deleted, blocked } = await removeBooks(ids);
  const parts = [`${deleted.length} book${deleted.length === 1 ? "" : "s"} deleted.`];
  if (blocked.length) parts.push(`Kept ${blocked.map((b) => `“${b.title}”`).join(", ")} because a student has a copy.`);
  flashRedirect(PATH + `?type=${type}`, blocked.length && !deleted.length ? "error" : "ok", parts.join(" "));
}

const issueSchema = z.object({
  bookId: z.string().min(1, "Choose a book"),
  mobile: mobileSchema,
  days: z.coerce.number().int().min(1).max(90).default(14),
});

export async function issueBook(formData: FormData) {
  await requireAdmin();
  const ISSUES = `${PATH}/issues`;
  const parsed = issueSchema.safeParse(formObject(formData));
  if (!parsed.success) flashRedirect(ISSUES, "error", parsed.error.issues[0]?.message ?? "Invalid input");
  const user = await prisma.user.findUnique({ where: { mobile: parsed.data.mobile } });
  if (!user) flashRedirect(ISSUES, "error", `No student with mobile ${parsed.data.mobile}.`);

  const updated = await prisma.book.updateMany({
    where: { id: parsed.data.bookId, type: "PHYSICAL", availableCopies: { gt: 0 } },
    data: { availableCopies: { decrement: 1 } },
  });
  if (updated.count === 0) flashRedirect(ISSUES, "error", "No copies of this book are available.");
  await prisma.bookIssue.create({
    data: { bookId: parsed.data.bookId, userId: user.id, dueAt: addDays(todayIST(), parsed.data.days) },
  });
  revalidatePath("/admin");
  flashRedirect(ISSUES, "ok", `Book issued to ${user.name}.`);
}

export async function returnBook(issueId: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const issue = await tx.bookIssue.update({ where: { id: issueId, returnedAt: null }, data: { returnedAt: new Date() } });
    await tx.book.update({ where: { id: issue.bookId }, data: { availableCopies: { increment: 1 } } });
  });
  revalidatePath("/admin");
  flashRedirect(`${PATH}/issues`, "ok", "Book returned.");
}

class NoCopyError extends Error {}
class AlreadyHandledError extends Error {}

/** Approving a request issues the book: one copy is taken and the return countdown starts today. */
export async function approveBookRequest(requestId: string, formData: FormData) {
  await requireAdmin();
  const ISSUES = `${PATH}/issues`;
  const days = z.coerce.number().int().min(1).max(90).catch(DEFAULT_LOAN_DAYS).parse(formData.get("days"));
  try {
    const name = await prisma.$transaction(async (tx) => {
      const req = await tx.bookRequest.findUniqueOrThrow({ where: { id: requestId }, include: { user: true } });
      const claimed = await tx.bookRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: { status: "APPROVED", decidedAt: new Date() },
      });
      if (claimed.count === 0) throw new AlreadyHandledError();
      const taken = await tx.book.updateMany({
        where: { id: req.bookId, availableCopies: { gt: 0 } },
        data: { availableCopies: { decrement: 1 } },
      });
      if (taken.count === 0) throw new NoCopyError();
      await tx.bookIssue.create({ data: { bookId: req.bookId, userId: req.userId, dueAt: addDays(todayIST(), days) } });
      return req.user.name;
    });
    revalidatePath("/admin", "layout");
    flashRedirect(ISSUES, "ok", `Approved — book issued to ${name} for ${days} days.`);
  } catch (err) {
    if (err instanceof NoCopyError) flashRedirect(ISSUES, "error", "No copy is free right now. Wait for a return or reject the request.");
    if (err instanceof AlreadyHandledError) flashRedirect(ISSUES, "error", "This request was already handled.");
    throw err;
  }
}

export async function rejectBookRequest(requestId: string, formData: FormData) {
  await requireAdmin();
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  await prisma.bookRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "REJECTED", decidedAt: new Date(), note },
  });
  revalidatePath("/admin", "layout");
  flashRedirect(`${PATH}/issues`, "ok", "Request rejected.");
}
