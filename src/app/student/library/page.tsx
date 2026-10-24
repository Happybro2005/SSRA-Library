import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { hasActiveMembership } from "@/lib/queries";
import { todayIST } from "@/lib/dates";
import { borrowBlock, getLibraryStats, MAX_BOOKS_PER_STUDENT, openBookCount } from "@/lib/library";
import { Empty, Notice, StatCard } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requestBook } from "../actions";

const BLOCK_KEYS = ["NOT_MEMBER", "LIMIT", "UNAVAILABLE", "ALREADY_HAVE", "ALREADY_REQUESTED"];

export default async function StudentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; ok?: string; error?: string }>;
}) {
  const user = await requireStudent();
  const { q = "", category = "", ok, error } = await searchParams;
  const t = await getTranslations("student");
  const tc = await getTranslations("common");
  const query = q.trim();

  const [stats, active, openCount, books, categories, mine, myRequests] = await Promise.all([
    getLibraryStats(),
    hasActiveMembership(user.id, todayIST()),
    openBookCount(user.id),
    prisma.book.findMany({
      where: {
        type: "PHYSICAL",
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" as const } },
                { author: { contains: query, mode: "insensitive" as const } },
                { category: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ availableCopies: "desc" }, { title: "asc" }],
    }),
    prisma.book.findMany({ where: { type: "PHYSICAL", category: { not: null } }, select: { category: true }, distinct: ["category"] }),
    prisma.bookIssue.findMany({ where: { userId: user.id, returnedAt: null }, select: { bookId: true } }),
    prisma.bookRequest.findMany({ where: { userId: user.id, status: "PENDING" }, select: { bookId: true } }),
  ]);
  const haveIds = new Set(mine.map((m) => m.bookId));
  const requestedIds = new Set(myRequests.map((r) => r.bookId));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-navy">{t("library")}</h1>
        <Link href="/student/ebooks" className="btn-outline">
          📱 {t("readEbooks")}
        </Link>
      </div>

      {ok === "requested" && <Notice tone="success">{t("okRequested")}</Notice>}
      {error && BLOCK_KEYS.includes(error) && <Notice tone="error">{t(`block${error}`)}</Notice>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("statEbooks")} value={stats.ebooks} href="/student/ebooks" />
        <StatCard label={t("statTitles")} value={stats.physicalTitles} tone="brand" />
        <StatCard label={t("statCopies")} value={stats.physicalCopies} />
        <StatCard label={t("statAvailable")} value={stats.physicalAvailable} tone="green" />
      </div>

      <p className="mb-4 text-sm text-slate-600">{t("borrowRules", { max: MAX_BOOKS_PER_STUDENT })}</p>
      {!active && <Notice>{t("blockNOT_MEMBER")}</Notice>}

      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={t("searchBooks")} className="input max-w-xs" />
        {categories.length > 0 && (
          <select name="category" defaultValue={category} className="input max-w-[12rem]">
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category!}>
                {c.category}
              </option>
            ))}
          </select>
        )}
        <button className="btn-primary">{tc("search")}</button>
      </form>

      {books.length === 0 ? (
        <Empty>{query || category ? tc("none") : t("noLibraryBooks")}</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {books.map((b) => {
            const block = borrowBlock({
              activeMember: active,
              openCount,
              availableCopies: b.availableCopies,
              hasIt: haveIds.has(b.id),
              requested: requestedIds.has(b.id),
            });
            return (
              <li key={b.id} className="card flex gap-4">
                {b.coverPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/files/${b.coverPath}`} alt="" className="h-24 w-18 shrink-0 rounded object-cover" />
                ) : (
                  <div className="grid h-24 w-18 shrink-0 place-items-center rounded bg-brand/10 text-3xl" aria-hidden>
                    📚
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{b.title}</div>
                  <div className="text-sm text-slate-500">{[b.author, b.category, b.language].filter(Boolean).join(" · ")}</div>
                  <div className={`mt-1 text-sm font-medium ${b.availableCopies > 0 ? "text-green-700" : "text-red-700"}`}>
                    {b.availableCopies > 0 ? t("available", { count: b.availableCopies, total: b.totalCopies }) : t("notAvailable")}
                  </div>
                  <div className="mt-3">
                    {block === "ALREADY_HAVE" ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">✓ {t("youHaveIt")}</span>
                    ) : block === "ALREADY_REQUESTED" ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">⏳ {t("requested")}</span>
                    ) : (
                      <form action={requestBook.bind(null, b.id)}>
                        <SubmitButton className="btn-brand btn-sm" disabled={!!block}>
                          {t("requestBorrow")}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
