import { prisma } from "./db";
import { addDays } from "./dates";

/** Most physical books a student can hold or have requested at once. */
export const MAX_BOOKS_PER_STUDENT = 3;
export const DEFAULT_LOAN_DAYS = 14;

const IST_OFFSET_MS = 330 * 60 * 1000;

/** A date-only value (UTC midnight) means "until the end of that day in India"; returns that instant. */
export function endOfDayIST(date: Date): Date {
  return new Date(addDays(date, 1).getTime() - IST_OFFSET_MS);
}

export async function getLibraryStats() {
  const [ebooks, physical] = await Promise.all([
    prisma.book.count({ where: { type: "EBOOK" } }),
    prisma.book.aggregate({
      where: { type: "PHYSICAL" },
      _count: true,
      _sum: { totalCopies: true, availableCopies: true },
    }),
  ]);
  return {
    ebooks,
    physicalTitles: physical._count,
    physicalCopies: physical._sum.totalCopies ?? 0,
    physicalAvailable: physical._sum.availableCopies ?? 0,
  };
}

/** Books the student currently holds plus requests still waiting — counted against MAX_BOOKS_PER_STUDENT. */
export async function openBookCount(userId: string) {
  const [borrowed, pending] = await Promise.all([
    prisma.bookIssue.count({ where: { userId, returnedAt: null } }),
    prisma.bookRequest.count({ where: { userId, status: "PENDING" } }),
  ]);
  return borrowed + pending;
}

export type BorrowBlock = "NOT_MEMBER" | "LIMIT" | "UNAVAILABLE" | "ALREADY_HAVE" | "ALREADY_REQUESTED" | null;

export function borrowBlock(opts: {
  activeMember: boolean;
  openCount: number;
  availableCopies: number;
  hasIt: boolean;
  requested: boolean;
}): BorrowBlock {
  if (opts.hasIt) return "ALREADY_HAVE";
  if (opts.requested) return "ALREADY_REQUESTED";
  if (!opts.activeMember) return "NOT_MEMBER";
  if (opts.availableCopies <= 0) return "UNAVAILABLE";
  if (opts.openCount >= MAX_BOOKS_PER_STUDENT) return "LIMIT";
  return null;
}
