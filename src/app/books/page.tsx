import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Books in the library — SSRA Library, Kushinagar",
  description: "Browse the printed books and e-books at SSRA Library, with how many copies are on the shelf right now.",
};

/** Public, view-only catalog. Titles and availability only — no PDFs, no borrowing without logging in. */
export default async function PublicBooksPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; category?: string }> }) {
  const { q = "", type = "", category = "" } = await searchParams;
  const t = await getTranslations("books");
  const query = q.trim();
  const bookType = type === "EBOOK" || type === "PHYSICAL" ? type : undefined;

  const where: Prisma.BookWhereInput = {
    ...(bookType ? { type: bookType } : {}),
    ...(category ? { category } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { author: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [books, categories, total] = await Promise.all([
    prisma.book.findMany({
      where,
      select: { id: true, title: true, author: true, category: true, language: true, type: true, totalCopies: true, availableCopies: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
      take: 500,
    }),
    prisma.book.findMany({ where: { category: { not: null } }, select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } }),
    prisma.book.count(),
  ]);

  const tabs = [
    { key: "", label: t("all") },
    { key: "PHYSICAL", label: t("physical") },
    { key: "EBOOK", label: t("ebook") },
  ];
  const href = (next: Partial<{ type: string }>) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (category) p.set("category", category);
    const ty = next.type ?? type;
    if (ty) p.set("type", ty);
    const s = p.toString();
    return s ? `/books?${s}` : "/books";
  };

  return (
    <div className="flex min-h-screen flex-col bg-chalk">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-poster text-5xl font-black uppercase leading-none text-navy-dark sm:text-6xl">{t("title")}</h1>
            <p className="mt-2 max-w-xl text-slate-ink">{t("lead")}</p>
          </div>
          <div className="font-mono text-sm text-slate-ink">{t("count", { count: books.length })}</div>
        </div>

        <div className="mb-6 rounded-2xl border border-navy/10 bg-white p-4">
          <p className="mb-3 flex items-start gap-2 text-sm text-ink">
            <span aria-hidden>🔒</span>
            <span>
              {t("memberNote")}{" "}
              <Link href="/login" className="font-semibold text-brand underline">
                {t("login")}
              </Link>
            </span>
          </p>
          <form className="flex flex-wrap items-end gap-2">
            {type && <input type="hidden" name="type" value={type} />}
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t("search")}</span>
              <input name="q" defaultValue={q} placeholder={t("search")} className="input" />
            </label>
            {categories.length > 0 && (
              <label>
                <span className="sr-only">{t("category")}</span>
                <select name="category" defaultValue={category} className="input">
                  <option value="">{t("anyCategory")}</option>
                  {categories.map((c) => (
                    <option key={c.category} value={c.category!}>
                      {c.category}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="btn-primary">{t("apply")}</button>
          </form>
        </div>

        <div className="mb-4 flex gap-2" role="tablist" aria-label="Book type">
          {tabs.map((tab) => (
            <Link
              key={tab.key || "all"}
              href={href({ type: tab.key })}
              role="tab"
              aria-selected={type === tab.key}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${type === tab.key ? "bg-navy-dark text-white" : "bg-white text-slate-ink ring-1 ring-slate-200"}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {books.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-ink">{total === 0 ? t("empty") : t("none")}</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => (
              <li key={b.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <span
                  aria-hidden
                  className={`w-2 shrink-0 rounded-full ${b.type === "EBOOK" ? "bg-sky-500" : b.availableCopies > 0 ? "bg-leaf" : "bg-slate-300"}`}
                />
                <div className="min-w-0">
                  <div className="font-semibold leading-snug text-ink">{b.title}</div>
                  <div className="mt-0.5 text-sm text-slate-ink">{[b.author, b.category, b.language].filter(Boolean).join(" · ")}</div>
                  <div className="mt-2 font-mono text-xs">
                    {b.type === "EBOOK" ? (
                      <span className="text-sky-700">E-book · {t("readMember")}</span>
                    ) : b.availableCopies > 0 ? (
                      <span className="text-leaf">
                        {b.availableCopies} of {b.totalCopies} on shelf
                      </span>
                    ) : (
                      <span className="text-slate-500">All {b.totalCopies} copies out</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
