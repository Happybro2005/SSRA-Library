import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { hasActiveMembership } from "@/lib/queries";
import { todayIST } from "@/lib/dates";
import { Empty, Notice } from "@/components/ui";

export default async function StudentEbooksPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const user = await requireStudent();
  const { q = "", category = "" } = await searchParams;
  const t = await getTranslations("student");
  const tc = await getTranslations("common");
  const [active, books, categories] = await Promise.all([
    hasActiveMembership(user.id, todayIST()),
    prisma.book.findMany({
      where: {
        type: "EBOOK",
        ...(category ? { category } : {}),
        ...(q.trim()
          ? {
              OR: [
                { title: { contains: q.trim(), mode: "insensitive" as const } },
                { author: { contains: q.trim(), mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { title: "asc" },
    }),
    prisma.book.findMany({ where: { type: "EBOOK", category: { not: null } }, select: { category: true }, distinct: ["category"] }),
  ]);

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold text-navy">{t("ebooks")}</h1>
      {!active && <Notice>{t("ebooksLocked")}</Notice>}
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={tc("search")} className="input max-w-xs" />
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
        <Empty>{tc("none")}</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {books.map((b) => (
            <li key={b.id} className="card flex gap-4">
              {b.coverPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/files/${b.coverPath}`} alt="" className="h-24 w-18 shrink-0 rounded object-cover" />
              ) : (
                <div className="grid h-24 w-18 shrink-0 place-items-center rounded bg-navy/10 text-3xl" aria-hidden>
                  📕
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{b.title}</div>
                <div className="text-sm text-slate-500">{[b.author, b.category, b.language].filter(Boolean).join(" · ")}</div>
                {active && (
                  <div className="mt-3 flex gap-2">
                    <a href={`/api/ebooks/${b.id}`} target="_blank" className="btn-primary btn-sm">
                      {t("read")}
                    </a>
                    <a href={`/api/ebooks/${b.id}?download=1`} className="btn-outline btn-sm">
                      {t("download")}
                    </a>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
