import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/session";
import { formatDay } from "@/lib/dates";
import { COMPLAINT_BADGE, COMPLAINT_CATEGORIES } from "@/lib/complaints";
import { Badge, Empty, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { raiseComplaint } from "../actions";

const ERRORS = ["tooShort", "limit"];

export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireStudent();
  const { ok, error } = await searchParams;
  const t = await getTranslations("complaint");
  const ts = await getTranslations("status");
  const complaints = await prisma.complaint.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold text-navy">{t("title")}</h1>
      <p className="mb-6 text-slate-600">{t("subtitle")}</p>
      {ok && <Notice tone="success">{t("submitted")}</Notice>}
      {error && ERRORS.includes(error) && <Notice tone="error">{t(error)}</Notice>}

      <form action={raiseComplaint} className="card mb-8 space-y-4">
        <fieldset>
          <legend className="label">{t("category")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMPLAINT_CATEGORIES.map((c, i) => (
              <label
                key={c}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium has-[:checked]:border-brand has-[:checked]:bg-brand/5 has-[:checked]:text-brand"
              >
                <input type="radio" name="category" value={c} defaultChecked={i === 0} className="accent-[var(--color-brand)]" />
                {t(`cat.${c}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="label">{t("message")}</span>
          <textarea name="message" rows={4} minLength={10} maxLength={1000} required placeholder={t("placeholder")} className="input" />
        </label>
        <SubmitButton className="btn-brand">{t("submit")}</SubmitButton>
      </form>

      <h2 className="mb-3 text-lg font-semibold">{t("mine")}</h2>
      {complaints.length === 0 ? (
        <Empty>{t("none")}</Empty>
      ) : (
        <ul className="space-y-3">
          {complaints.map((c) => (
            <li key={c.id} className="card">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{t(`cat.${c.category}`)}</span>
                <Badge status={COMPLAINT_BADGE[c.status]} label={ts(c.status)} />
              </div>
              <p className="whitespace-pre-line text-slate-700">{c.message}</p>
              <div className="mt-2 text-xs text-slate-500">
                {t("raisedOn")}: {formatDay(c.createdAt)}
              </div>
              {c.reply && (
                <div className="mt-3 rounded-lg border-l-4 border-navy bg-navy/5 px-3 py-2 text-sm">
                  <div className="font-semibold text-navy">{t("reply")}</div>
                  <p className="whitespace-pre-line">{c.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
