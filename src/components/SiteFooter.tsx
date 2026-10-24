import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import { hoursLabel } from "@/lib/hours";
import { todayIST } from "@/lib/dates";

export async function SiteFooter() {
  const t = await getTranslations("home");
  const s = await getSettings();
  return (
    <footer className="bg-navy-dark text-white/75">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="font-poster text-3xl font-black uppercase leading-none text-white">
            <span className="text-lamp">SSRA</span> Library
          </div>
          <p className="mt-2 text-sm italic">{s.tagline}</p>
          <p className="mt-3 text-sm">{s.address}</p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-white/50">{t("hours")}</div>
          <div className="font-mono text-base text-white">{hoursLabel(s.openTime, s.closeTime)}</div>
          <div className="mt-3">
            📞 <a href={`tel:+91${s.mobile}`} className="hover:text-white">{s.mobile}</a>
          </div>
          <div>
            {t("emergency")}: <a href={`tel:+91${s.emergencyMobile}`} className="hover:text-white">{s.emergencyMobile}</a>
          </div>
        </div>
        <ul className="space-y-1.5 text-sm">
          <li>
            <Link href="/books" className="hover:text-white">{t("footerBooks")}</Link>
          </li>
          <li>
            <Link href="/#contact" className="hover:text-white">{t("navContact")}</Link>
          </li>
          <li>
            <Link href="/login" className="hover:text-white">{t("footerStudent")}</Link>
          </li>
          <li>
            <Link href="/admin/login" className="text-white/50 hover:text-white">{t("footerStaff")}</Link>
          </li>
        </ul>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {todayIST().getUTCFullYear()} {s.libraryName}. {t("footer")}
      </div>
    </footer>
  );
}
