import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  const { error } = await searchParams;
  if (session?.user && error !== "inactive") redirect("/portal");
  const t = await getTranslations("login");
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-3xl font-bold text-navy">{t("studentTitle")}</h1>
          <p className="mb-6 mt-1 text-slate-600">{t("studentSubtitle")}</p>
          <LoginForm initialError={error === "inactive" ? "inactive" : undefined} />
        </div>
      </main>
    </>
  );
}
