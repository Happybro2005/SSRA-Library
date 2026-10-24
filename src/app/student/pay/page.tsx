import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireStudent } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getPublicPlans } from "@/lib/queries";
import { formatRupees, todayIST } from "@/lib/dates";
import { upiPayLink } from "@/lib/upi";
import { Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { UpiQr } from "@/components/UpiQr";
import { submitUpiPayment } from "../actions";

const ERRORS: Record<string, string> = { upiRef: "errUpiRef", plan: "errPlan", duplicate: "errDuplicate" };

export default async function PayPage({ searchParams }: { searchParams: Promise<{ plan?: string; ok?: string; error?: string }> }) {
  const user = await requireStudent();
  const params = await searchParams;
  const t = await getTranslations("student");
  const tc = await getTranslations("common");
  const [settings, plans] = await Promise.all([getSettings(), getPublicPlans(todayIST())]);
  const plan = plans.find((p) => p.id === params.plan) ?? plans[0];
  const upiReady = !!settings.upiId || !!settings.upiQrPath;
  const note = plan ? `SSRA ${user.mobile} ${plan.nameEn}`.slice(0, 50) : "";

  return (
    <>
      <h1 className="mb-6 font-display text-3xl font-bold text-navy">{t("payTitle")}</h1>
      {params.ok && <Notice tone="success">{t("paymentSubmitted")}</Notice>}
      {params.error && ERRORS[params.error] && <Notice tone="error">{t(ERRORS[params.error])}</Notice>}

      {!upiReady || !plan ? (
        <Notice>{t("upiNotSet")}</Notice>
      ) : (
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 font-semibold">{t("payStep1")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((p) => (
                <Link
                  key={p.id}
                  href={`/student/pay?plan=${p.id}`}
                  className={`rounded-xl border-2 p-4 transition ${p.id === plan.id ? "border-navy bg-navy/5" : "border-slate-200 hover:border-slate-300"}`}
                  aria-current={p.id === plan.id}
                >
                  <div className="font-semibold">{p.nameEn}</div>
                  <div className="font-display text-2xl font-bold text-brand">{formatRupees(p.price)}</div>
                  <div className="text-sm text-slate-500">{tc("months", { count: p.durationMonths })}</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="card text-center">
            <h2 className="mb-3 font-semibold">{t("payStep2")}</h2>
            <div className="flex justify-center">
              <UpiQr
                upiId={settings.upiId}
                payeeName={settings.upiPayeeName}
                uploadedPath={settings.upiQrPath}
                amount={plan.price}
                note={note}
              />
            </div>
            <p className="mt-2 text-2xl font-bold">{formatRupees(plan.price)}</p>
            {settings.upiId && (
              <>
                <p className="text-sm text-slate-500">UPI: {settings.upiId}</p>
                <a
                  href={upiPayLink({ upiId: settings.upiId, payeeName: settings.upiPayeeName, amount: plan.price, note })}
                  className="btn-brand mt-3"
                >
                  {t("payWithApp")}
                </a>
              </>
            )}
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">{t("payStep3")}</h2>
            <form action={submitUpiPayment} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="planId" value={plan.id} />
              <label className="block flex-1">
                <span className="label">{t("upiRef")}</span>
                <input name="upiRef" required minLength={6} maxLength={35} pattern="[A-Za-z0-9]+" className="input" placeholder="e.g. 425612345678" />
              </label>
              <SubmitButton className="btn-primary">{t("submitPayment")}</SubmitButton>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
