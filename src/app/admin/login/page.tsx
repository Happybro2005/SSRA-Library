import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/app/login/LoginForm";

export const dynamic = "force-dynamic";

/** Staff-only login, kept separate from the student login at /login. */
export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user) redirect("/portal");
  const t = await getTranslations("login");
  return (
    <main className="grid min-h-screen place-items-center bg-navy-dark px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center font-display text-2xl font-bold text-white">
          <span className="text-sun">SSRA</span> LIBRARY
        </div>
        <div className="card p-6 sm:p-8">
          <div className="mb-1 inline-block rounded-full bg-navy px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            Staff
          </div>
          <h1 className="font-display text-3xl font-bold text-navy">{t("adminTitle")}</h1>
          <p className="mb-6 mt-1 text-slate-600">{t("adminSubtitle")}</p>
          <LoginForm audience="admin" />
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-white/80 underline hover:text-white">
            {t("studentLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
