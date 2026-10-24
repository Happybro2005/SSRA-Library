import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { coveringWhere, getActivePromotion, getPublicPlans } from "@/lib/queries";
import { formatDate, formatRupees, todayIST } from "@/lib/dates";
import { shiftsOverlap } from "@/lib/membership";
import { formatTime12, hoursLabel, openState } from "@/lib/hours";
import { waLink } from "@/lib/whatsapp";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OfferPopup } from "@/components/OfferPopup";
import { SubmitButton } from "@/components/SubmitButton";
import { SeatBoard } from "@/components/public/SeatBoard";
import { DayTimeline } from "@/components/public/DayTimeline";
import { ScrollIntoView } from "@/components/public/ScrollIntoView";
import { sendEnquiry } from "./contact/actions";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ sent?: string; enquiry?: string }> }) {
  const { sent, enquiry } = await searchParams;
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const today = todayIST();

  const [settings, seats, shifts, current, plans, facilities, gallery, promo, bookStats, ebooks, shelf] = await Promise.all([
    getSettings(),
    prisma.seat.findMany({ where: { isActive: true }, orderBy: { number: "asc" }, select: { id: true, number: true } }),
    prisma.shift.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.membership.findMany({ where: { ...coveringWhere(today), seat: { isActive: true } }, select: { seat: { select: { number: true } }, shift: true } }),
    getPublicPlans(today),
    prisma.facility.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.galleryImage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 8 }),
    getActivePromotion(today),
    prisma.book.aggregate({ where: { type: "PHYSICAL" }, _count: true, _sum: { availableCopies: true } }),
    prisma.book.count({ where: { type: "EBOOK" } }),
    prisma.book.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 6,
      select: { id: true, title: true, author: true, category: true, type: true, totalCopies: true, availableCopies: true },
    }),
  ]);

  const hours = hoursLabel(settings.openTime, settings.closeTime);
  const state = openState(settings.openTime, settings.closeTime);
  const tel = `tel:+91${settings.mobile}`;
  const wa = waLink(settings.whatsapp, "Hello, I want admission details for SSRA Library.");
  const offerPlan = plans.find((p) => p.isOffer);
  const board = shifts.map((s) => ({
    id: s.id,
    name: s.nameEn,
    hours: `${formatTime12(s.startTime)}–${formatTime12(s.endTime)}`,
    taken: [...new Set(current.filter((m) => shiftsOverlap(m.shift, s)).map((m) => m.seat.number))],
  }));
  const values = [t("value1"), t("value2"), t("value3"), t("value4")];

  return (
    <div className="bg-chalk">
      <SiteHeader />

      {settings.announcementEn && (
        <div className="bg-lamp px-4 py-2 text-center text-sm font-semibold text-navy-dark">{settings.announcementEn}</div>
      )}

      {/* Hero: the reading hall, live */}
      <section className="relative overflow-hidden bg-navy-dark text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pb-20 lg:pt-16">
          <div>
            {/* On phones the header has no room for this, so show it here */}
            <p className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] sm:hidden ${state.open ? "bg-leaf/15 text-emerald-300" : "bg-white/10 text-white/70"}`}>
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${state.open ? "bg-emerald-400" : "bg-white/50"}`} />
              {state.label}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 sm:text-xs">{t("eyebrow")}</p>
            <h1 className="mt-4 font-poster text-[clamp(3.6rem,11vw,7.25rem)] font-black uppercase leading-[0.86] tracking-tight">
              {t("heroTitleA")}
              <br />
              <span className="text-lamp">{t("heroTitleB")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">{t("heroLead", { hours })}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href={tel} className="btn-brand px-5 py-3 text-base">
                📞 {t("bookSeat")}
              </a>
              <a href={wa} target="_blank" rel="noopener" className="btn border border-white/25 px-5 py-3 text-base text-white hover:bg-white/10">
                💬 {t("whatsappUs")}
              </a>
              <a href="#fees" className="px-2 py-3 text-sm font-semibold text-white/75 underline-offset-4 hover:text-white hover:underline">
                {t("seeFees")} ↓
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
              {[t("fullyAc"), t("forBoysGirls"), "CCTV", "24×7 power backup"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lamp" />
                  {x}
                </li>
              ))}
            </ul>
          </div>

          {seats.length > 0 && (
            <SeatBoard
              seats={seats.map((s) => s.number)}
              shifts={board}
              ctaHref={tel}
              labels={{
                hall: t("hall"),
                plan: t("seatPlan"),
                freeOf: t("freeOf", { free: "{free}", total: "{total}" }),
                free: t("seatFree"),
                taken: t("seatTaken"),
                note: t("boardNote"),
                cta: t("boardCta"),
              }}
            />
          )}
        </div>
      </section>

      {/* Festival offer, if one is running */}
      {offerPlan && (
        <section aria-label={offerPlan.nameEn} className="border-y-2 border-dashed border-white/40 bg-brand text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-brand">{t("offer")}</span>
              <span className="text-lg font-semibold">{offerPlan.nameEn}</span>
              <span className="font-poster text-4xl font-black uppercase leading-none">
                {tc("months", { count: offerPlan.durationMonths })} · {formatRupees(offerPlan.price)}
              </span>
              {offerPlan.validTill && <span className="text-sm text-white/85">{t("validTill", { date: formatDate(offerPlan.validTill) })}</span>}
            </div>
            <a href={tel} className="btn bg-white text-brand hover:bg-red-50">
              {t("offerCta")}
            </a>
          </div>
        </section>
      )}

      <main>
        {/* Opening hours and shifts */}
        <Section id="day" title={t("dayTitle")} lead={t("dayLead", { open: formatTime12(settings.openTime), close: formatTime12(settings.closeTime) })}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 pt-10 sm:p-8 sm:pt-12">
            <DayTimeline open={settings.openTime} close={settings.closeTime} shifts={shifts} nowLabel={t("now")} />
          </div>
        </Section>

        {/* Fees */}
        <Section id="fees" title={t("feesTitle")} lead={t("feesLead")}>
          {plans.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-ink">{t("noPlans")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`relative rounded-2xl p-6 ${plan.isOffer ? "bg-lamp text-navy-dark" : "border border-slate-200 bg-white"}`}
                >
                  {plan.isOffer && (
                    <span className="absolute right-4 top-4 rounded bg-brand px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-white">
                      {t("offer")}
                    </span>
                  )}
                  <h3 className="pr-16 text-lg font-semibold">{plan.nameEn}</h3>
                  <div className="mt-3 font-poster text-6xl font-black leading-none">{formatRupees(plan.price)}</div>
                  <div className="mt-2 font-mono text-sm">
                    {tc("months", { count: plan.durationMonths })} · {plan.shift ? plan.shift.nameEn : t("anyShift")}
                  </div>
                  {plan.validTill && <div className="mt-3 text-sm opacity-75">{t("validTill", { date: formatDate(plan.validTill) })}</div>}
                </article>
              ))}
            </div>
          )}
        </Section>

        {/* Facilities */}
        {facilities.length > 0 && (
          <Section id="facilities" title={t("facilitiesTitle")}>
            <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {facilities.map((f) => (
                <li key={f.id} className="flex items-center gap-3 border-b border-slate-200 py-3">
                  <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg ring-1 ring-slate-200">
                    {f.icon}
                  </span>
                  <span className="font-medium text-ink">{f.titleEn}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Books */}
        <Section id="books" title={t("booksTitle")} lead={t("booksLead")}>
          <dl className="mb-6 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {[
              [t("statTitles"), bookStats._count],
              [t("statOnShelf"), bookStats._sum.availableCopies ?? 0],
              [t("statEbooks"), ebooks],
            ].map(([label, value]) => (
              <div key={String(label)} className="px-3 py-4 text-center sm:px-6">
                <dd className="font-poster text-4xl font-black text-navy-dark sm:text-5xl">{value}</dd>
                <dt className="mt-1 text-xs text-slate-ink sm:text-sm">{label}</dt>
              </div>
            ))}
          </dl>
          {shelf.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-ink">{t("noBooks")}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shelf.map((b) => (
                <li key={b.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <span aria-hidden className={`w-2 shrink-0 rounded-full ${b.type === "EBOOK" ? "bg-sky-500" : b.availableCopies > 0 ? "bg-leaf" : "bg-slate-300"}`} />
                  <div className="min-w-0">
                    <div className="font-semibold leading-snug text-ink">{b.title}</div>
                    <div className="text-sm text-slate-ink">{[b.author, b.category].filter(Boolean).join(" · ")}</div>
                    <div className="mt-1.5 font-mono text-xs">
                      {b.type === "EBOOK" ? (
                        <span className="text-sky-700">{t("ebookTag")}</span>
                      ) : b.availableCopies > 0 ? (
                        <span className="text-leaf">{t("onShelfCount", { count: b.availableCopies })}</span>
                      ) : (
                        <span className="text-slate-500">{t("allOut")}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/books" className="btn-primary mt-6">
            {t("browseBooks")} →
          </Link>
        </Section>

        {/* About us */}
        <Section id="about" title={t("aboutTitle")}>
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4 text-lg leading-relaxed text-ink">
              <p>{t("aboutP1")}</p>
              <p>{t("aboutP2", { owner: settings.ownerName })}</p>
              <ul className="grid gap-2 pt-2 text-base sm:grid-cols-2">
                {values.map((v) => (
                  <li key={v} className="flex items-center gap-2">
                    <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-leaf text-[11px] text-white">
                      ✓
                    </span>
                    {v}
                  </li>
                ))}
              </ul>
            </div>
            <aside className="rounded-2xl bg-navy-dark p-6 text-white">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">{t("director")}</div>
              <div className="mt-1 font-poster text-4xl font-black uppercase leading-none">{settings.ownerName}</div>
              <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">{t("visitUs")}</div>
              <p className="mt-1 text-white/85">{settings.address}</p>
              <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">{t("hours")}</div>
              <p className="mt-1 font-mono text-xl text-lamp">{hours}</p>
            </aside>
          </div>
        </Section>

        {gallery.length > 0 && (
          <Section id="gallery" title={t("gallery")}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {gallery.map((g) => (
                <figure key={g.id} className="overflow-hidden rounded-2xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/files/${g.path}`} alt={g.caption ?? "SSRA Library"} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  {g.caption && <figcaption className="px-3 py-2 text-sm text-slate-ink">{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </Section>
        )}

        {/* Contact us */}
        <Section id="contact" title={t("contactTitle")} lead={t("contactLead")}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
                <Info label={t("address")} value={settings.address} wide />
                <Info label={t("phone")} value={<a href={tel} className="font-semibold text-navy underline">{settings.mobile}</a>} />
                <Info
                  label={t("emergency")}
                  value={<a href={`tel:+91${settings.emergencyMobile}`} className="font-semibold text-navy underline">{settings.emergencyMobile}</a>}
                />
                <Info label={t("whatsappLine")} value={<a href={wa} target="_blank" rel="noopener" className="font-semibold text-navy underline">{settings.whatsapp}</a>} />
                <Info label={t("hours")} value={<span className="font-mono">{hours}</span>} />
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <iframe
                  title="Map to SSRA Library"
                  className="h-72 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={settings.mapEmbedUrl || `https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`}
                />
              </div>
            </div>

            <form id="enquiry" action={sendEnquiry} className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
              {(sent || enquiry) && <ScrollIntoView targetId="enquiry" />}
              {sent && (
                <p role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                  {t("formSent")}
                </p>
              )}
              {enquiry === "invalid" && (
                <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
                  {t("formError")}
                </p>
              )}
              {enquiry === "limit" && (
                <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {t("formLimit")}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="label">{t("formName")}</span>
                  <input name="name" required minLength={2} maxLength={60} autoComplete="name" className="input" />
                </label>
                <label className="block">
                  <span className="label">{t("formMobile")}</span>
                  <input name="mobile" type="tel" inputMode="numeric" required autoComplete="tel-national" placeholder="98XXXXXXXX" className="input" />
                </label>
              </div>
              <label className="block">
                <span className="label">{t("formShift")}</span>
                <select name="shift" className="input" defaultValue="">
                  <option value="">{t("formShiftAny")}</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={`${s.nameEn} (${formatTime12(s.startTime)}–${formatTime12(s.endTime)})`}>
                      {s.nameEn} · {formatTime12(s.startTime)}–{formatTime12(s.endTime)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">{t("formMessage")}</span>
                <textarea name="message" required minLength={5} maxLength={1000} rows={4} placeholder={t("formMessagePh")} className="input" />
              </label>
              {/* Spam trap: hidden from people, bots fill it in */}
              <label className="hidden" aria-hidden>
                Website <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <SubmitButton className="btn-brand w-full py-3" pendingText="Sending…">
                {t("formSend")}
              </SubmitButton>
            </form>
          </div>
        </Section>
      </main>

      <SiteFooter />

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
    </div>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-b border-slate-200/70 last:border-0">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <h2 id={`${id}-title`} className="font-poster text-5xl font-black uppercase leading-none text-navy-dark sm:text-6xl">
          {title}
        </h2>
        {lead && <p className="mt-3 max-w-2xl text-lg text-slate-ink">{lead}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function Info({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-ink">{label}</div>
      <div className="mt-1 text-ink">{value}</div>
    </div>
  );
}
