import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getActivePromotion, getPublicPlans, getSeatAvailability } from "@/lib/queries";
import { formatDate, formatRupees, todayIST } from "@/lib/dates";
import { waLink } from "@/lib/whatsapp";
import { SiteHeader } from "@/components/SiteHeader";
import { OfferPopup } from "@/components/OfferPopup";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const today = todayIST();

  const [settings, ebookCount, physical, seats, plans, facilities, gallery, promo] = await Promise.all([
    getSettings(),
    prisma.book.count({ where: { type: "EBOOK" } }),
    prisma.book.aggregate({ where: { type: "PHYSICAL" }, _sum: { totalCopies: true } }),
    getSeatAvailability(today),
    getPublicPlans(today),
    prisma.facility.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.galleryImage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 12 }),
    getActivePromotion(today),
  ]);

  const announcement = settings.announcementEn;
  const offerPlan = plans.find((p) => p.isOffer);
  const tel = `tel:+91${settings.mobile}`;

  return (
    <>
      <SiteHeader />

      {announcement && (
        <div className="bg-sun px-4 py-2 text-center font-semibold text-ink">{announcement}</div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-fuchsia-500 to-orange-400 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr] md:py-20">
          <div>
            <p className="font-display text-lg tracking-wide text-white/90">{settings.ownerName}</p>
            <h1 className="font-display text-6xl font-bold leading-none text-brand [text-shadow:3px_3px_0_#fff,6px_6px_0_rgba(0,0,0,.25)] sm:text-8xl">
              SSRA
              <br />
              LIBRARY
            </h1>
            <p className="mt-4 text-xl font-semibold italic text-ink sm:text-2xl">{settings.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-xl bg-navy px-4 py-2 font-display text-xl tracking-wide">
                {t("admissionOpen")}
              </span>
              <span className="rounded-xl bg-white/90 px-4 py-2 font-semibold text-navy">{t("forBoysGirls")}</span>
              <span className="rounded-xl bg-brand px-4 py-2 font-semibold">{t("fullyAc")}</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={tel} className="btn bg-white text-navy hover:bg-slate-100">
                📞 {t("callNow")}
              </a>
              <a
                href={waLink(settings.whatsapp, "Hello, I want admission details for SSRA Library.")}
                target="_blank"
                rel="noopener"
                className="btn bg-green-600 text-white hover:bg-green-700"
              >
                💬 {t("whatsapp")}
              </a>
              <Link href="/login" className="btn-primary">
                {t("studentLogin")}
              </Link>
            </div>
          </div>

          {offerPlan && (
            <div className="self-center rounded-3xl border-4 border-brand bg-sun p-6 text-ink shadow-2xl">
              <div className="-mx-6 -mt-6 mb-4 rounded-t-[1.25rem] bg-brand px-6 py-3 text-center font-semibold text-white">
                {offerPlan.nameEn}
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="font-display text-3xl font-bold uppercase leading-tight text-navy">
                  {tc("months", { count: offerPlan.durationMonths })}
                </div>
                <div className="font-display text-6xl font-bold text-brand">{formatRupees(offerPlan.price)}</div>
              </div>
              {offerPlan.validTill && (
                <p className="mt-3 text-sm font-medium">{t("validTill", { date: formatDate(offerPlan.validTill) })}</p>
              )}
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {/* Stats */}
        <section aria-labelledby="stats">
          <h2 id="stats" className="mb-6 font-display text-3xl font-bold text-navy">
            {t("stats")}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat icon="📱" label={t("ebooks")} value={ebookCount} />
            <Stat icon="📚" label={t("physicalBooks")} value={physical._sum.totalCopies ?? 0} />
            <Stat icon="🪑" label={t("totalSeats")} value={seats.seatCount} />
            <Stat icon="✅" label={t("availableSeats")} value={seats.freeAnyShift} />
          </div>
          {seats.byShift.length > 0 && (
            <div className="mt-4 card">
              <h3 className="mb-3 font-semibold text-slate-700">{t("seatsByShift")}</h3>
              <div className="flex flex-wrap gap-3">
                {seats.byShift.map(({ shift, free }) => (
                  <div key={shift.id} className="rounded-xl bg-paper px-4 py-2">
                    <span className="font-semibold">{shift.nameEn}</span>{" "}
                    <span className="text-sm text-slate-500">
                      ({shift.startTime}–{shift.endTime})
                    </span>
                    : <span className="font-bold text-green-700">{free}</span> {t("free")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Fees */}
        <section aria-labelledby="fees">
          <h2 id="fees" className="mb-6 font-display text-3xl font-bold text-navy">
            {t("feeStructure")}
          </h2>
          {plans.length === 0 ? (
            <p className="card text-slate-600">{t("noPlans")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`card relative ${plan.isOffer ? "border-2 border-brand bg-amber-50" : ""}`}
                >
                  {plan.isOffer && (
                    <span className="absolute -top-3 right-4 rounded-full bg-brand px-3 py-0.5 text-xs font-bold uppercase text-white">
                      {t("offer")}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.nameEn}</h3>
                  <div className="mt-2 font-display text-4xl font-bold text-brand">{formatRupees(plan.price)}</div>
                  <div className="mt-1 text-slate-600">
                    {tc("months", { count: plan.durationMonths })} ·{" "}
                    {plan.shift ? plan.shift.nameEn : t("anyShift")}
                  </div>
                  {plan.validTill && (
                    <div className="mt-2 text-sm text-slate-500">
                      {t("validTill", { date: formatDate(plan.validTill) })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Facilities */}
        <section aria-labelledby="facilities">
          <h2 id="facilities" className="mb-6 font-display text-3xl font-bold text-navy">
            {t("facilities")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((f, i) => (
              <li
                key={f.id}
                className={`flex items-center gap-3 rounded-full px-5 py-3 font-semibold text-white shadow ${FACILITY_COLORS[i % FACILITY_COLORS.length]}`}
              >
                <span className="text-2xl" aria-hidden>
                  {f.icon}
                </span>
                {f.titleEn}
              </li>
            ))}
          </ul>
        </section>

        {gallery.length > 0 && (
          <section aria-labelledby="gallery">
            <h2 id="gallery" className="mb-6 font-display text-3xl font-bold text-navy">
              {t("gallery")}
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {gallery.map((g) => (
                <figure key={g.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/files/${g.path}`} alt={g.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
                  {g.caption && <figcaption className="px-3 py-2 text-sm text-slate-600">{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <section aria-labelledby="contact" className="grid gap-6 md:grid-cols-2">
          <div className="card space-y-4">
            <h2 id="contact" className="font-display text-3xl font-bold text-navy">
              {t("contact")}
            </h2>
            <ContactRow label={t("address")} value={settings.address} />
            <ContactRow
              label={t("phone")}
              value={<a className="font-semibold text-navy underline" href={tel}>{settings.mobile}</a>}
            />
            <ContactRow
              label={t("emergency")}
              value={
                <a className="font-semibold text-navy underline" href={`tel:+91${settings.emergencyMobile}`}>
                  {settings.emergencyMobile}
                </a>
              }
            />
            {settings.openingHours && <ContactRow label={t("hours")} value={settings.openingHours} />}
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <iframe
              title="Map"
              className="h-full min-h-72 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={
                settings.mapEmbedUrl ||
                `https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`
              }
            />
          </div>
        </section>
      </main>

      <footer className="bg-navy-dark py-6 text-center text-sm text-white/80">
        <p className="font-semibold text-white">{settings.address}</p>
        <p className="mt-1">
          📞 {settings.mobile} · {t("emergency")} {settings.emergencyMobile}
        </p>
        <p className="mt-2">
          © {today.getUTCFullYear()} {settings.libraryName}. {t("footer")}
        </p>
      </footer>

      {promo && (
        <OfferPopup
          storageKey={`${promo.id}:${promo.updatedAt.getTime()}`}
          title={promo.titleEn}
          message={promo.messageEn}
          badge={promo.badge}
          imageUrl={promo.imagePath ? `/files/${promo.imagePath}` : null}
          ctaText={promo.ctaTextEn}
          ctaLink={promo.ctaLink}
          closeLabel={tc("close")}
        />
      )}
    </>
  );
}

const FACILITY_COLORS = ["bg-pink-600", "bg-sky-600", "bg-brand", "bg-indigo-700", "bg-teal-600", "bg-violet-600"];

function Stat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="card text-center">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <div className="mt-1 font-display text-4xl font-bold text-navy">{value}</div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
    </div>
  );
}

function ContactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-lg">{value}</div>
    </div>
  );
}
