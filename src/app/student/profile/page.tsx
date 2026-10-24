import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireStudent } from "@/lib/session";
import { Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { changePassword } from "../actions";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireStudent();
  const params = await searchParams;
  const t = await getTranslations("student");
  const tc = await getTranslations("common");
  const errorKey = params.error === "wrongPassword" || params.error === "shortPassword" ? params.error : null;

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold text-navy">{t("profile")}</h1>
      {/* Pages that aren't in the phone bottom bar */}
      <section className="mb-6 md:hidden">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("quickLinks")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/student/payments" className="card flex items-center gap-3 p-4 font-semibold">
            <span className="text-2xl" aria-hidden>
              🧾
            </span>
            {t("payments")}
          </Link>
          <Link href="/student/ebooks" className="card flex items-center gap-3 p-4 font-semibold">
            <span className="text-2xl" aria-hidden>
              📱
            </span>
            {t("ebooks")}
          </Link>
          <Link href="/student/complaints" className="card col-span-2 flex items-center gap-3 p-4 font-semibold">
            <span className="text-2xl" aria-hidden>
              📣
            </span>
            {t("actionComplaint")}
          </Link>
        </div>
      </section>
      <section className="card mb-6">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">{tc("name")}</dt>
            <dd className="font-semibold">{user.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">{tc("mobile")}</dt>
            <dd className="font-semibold">{user.mobile}</dd>
          </div>
        </dl>
      </section>

      <section className="card max-w-md">
        <h2 className="mb-3 font-semibold">{t("changePassword")}</h2>
        {params.ok && <Notice tone="success">{t("passwordChanged")}</Notice>}
        {errorKey && <Notice tone="error">{t(errorKey)}</Notice>}
        <form action={changePassword} className="space-y-3">
          {user.passwordHash && (
            <label className="block">
              <span className="label">{t("currentPassword")}</span>
              <input type="password" name="current" autoComplete="current-password" className="input" />
            </label>
          )}
          <label className="block">
            <span className="label">{t("newPassword")}</span>
            <input type="password" name="next" minLength={6} required autoComplete="new-password" className="input" />
          </label>
          <SubmitButton>{tc("save")}</SubmitButton>
        </form>
      </section>
    </>
  );
}
