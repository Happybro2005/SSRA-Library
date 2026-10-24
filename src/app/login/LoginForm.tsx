"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { otpLogin, passwordLogin, requestOtp, type LoginState } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ initialError, audience = "student" }: { initialError?: string; audience?: "student" | "admin" }) {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const [tab, setTab] = useState<"password" | "otp">("password");
  const [pwState, pwAction] = useActionState<LoginState, FormData>(passwordLogin, { error: initialError });
  const [sendState, sendAction] = useActionState<LoginState, FormData>(requestOtp, {});
  const [otpState, otpAction] = useActionState<LoginState, FormData>(otpLogin, {});

  const otpMobile = otpState.otpSentTo ?? sendState.otpSentTo;
  const otpError = otpState.error ?? sendState.error;

  return (
    <div>
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        {(["password", "otp"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-lg py-2 font-semibold transition ${tab === key ? "bg-white text-navy shadow" : "text-slate-500"}`}
          >
            {key === "password" ? t("passwordTab") : t("otpTab")}
          </button>
        ))}
      </div>

      {tab === "password" ? (
        <form action={pwAction} className="space-y-4">
          <input type="hidden" name="audience" value={audience} />
          {pwState.error && <ErrorBox>{t(pwState.error)}</ErrorBox>}
          <MobileInput label={tc("mobile")} defaultValue={pwState.mobile} />
          <label className="block">
            <span className="label">{t("password")}</span>
            <input name="password" type="password" required autoComplete="current-password" className="input" />
          </label>
          <SubmitButton className="btn-primary w-full py-3">{t("submit")}</SubmitButton>
          {audience === "student" && <p className="text-center text-sm text-slate-500">{t("noPassword")}</p>}
        </form>
      ) : (
        <div className="space-y-4">
          {otpError && <ErrorBox>{t(otpError)}</ErrorBox>}
          {!otpMobile ? (
            <form action={sendAction} className="space-y-4">
              <input type="hidden" name="audience" value={audience} />
              <MobileInput label={tc("mobile")} defaultValue={sendState.mobile} />
              <SubmitButton className="btn-primary w-full py-3">{t("sendOtp")}</SubmitButton>
            </form>
          ) : (
            <>
              <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{t("otpSent", { mobile: otpMobile })}</p>
              <form action={otpAction} className="space-y-4">
                <input type="hidden" name="audience" value={audience} />
                <input type="hidden" name="mobile" value={otpMobile} />
                <label className="block">
                  <span className="label">{t("otp")}</span>
                  <input
                    name="code"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    className="input text-center text-2xl tracking-[0.5em]"
                  />
                </label>
                <SubmitButton className="btn-primary w-full py-3">{t("verify")}</SubmitButton>
              </form>
              <form action={sendAction}>
                <input type="hidden" name="audience" value={audience} />
                <input type="hidden" name="mobile" value={otpMobile} />
                <SubmitButton className="btn-outline w-full">{t("resendOtp")}</SubmitButton>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MobileInput({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        name="mobile"
        defaultValue={defaultValue}
        type="tel"
        inputMode="numeric"
        required
        autoComplete="tel-national"
        placeholder="98XXXXXXXX"
        className="input"
      />
    </label>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {children}
    </div>
  );
}
