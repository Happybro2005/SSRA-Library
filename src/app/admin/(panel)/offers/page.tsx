import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, todayIST, toDateInput, addDays } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { OfferPopup } from "@/components/OfferPopup";
import { deletePromotion, savePromotion, togglePromotion } from "./actions";

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const today = todayIST();
  const [promos, plans, settings] = await Promise.all([
    prisma.promotion.findMany({ orderBy: [{ isActive: "desc" }, { priority: "desc" }, { startDate: "desc" }] }),
    prisma.feePlan.findMany({ orderBy: { sortOrder: "asc" } }),
    getSettings(),
  ]);
  const live = promos.find((p) => p.isActive && p.startDate <= today && p.endDate >= today);
  const editing = params.edit === "new" ? null : promos.find((p) => p.id === params.edit);
  const showForm = params.edit === "new" || !!editing;

  const stateOf = (p: (typeof promos)[number]) => {
    if (!p.isActive) return { key: "NONE", label: "Off" };
    if (p.endDate < today) return { key: "EXPIRED", label: "Ended" };
    if (p.startDate > today) return { key: "UPCOMING", label: "Scheduled" };
    return p.id === live?.id ? { key: "ACTIVE", label: "Showing now" } : { key: "PENDING", label: "Active (lower priority)" };
  };

  return (
    <>
      <PageHeader title="Offer popups">
        <Link href="/admin/offers?edit=new" className="btn-brand">
          + New offer
        </Link>
      </PageHeader>
      <Flash params={params} />
      <p className="mb-6 text-slate-600">
        The popup appears on the home page about a second after it opens. Only one offer shows at a time: the switched-on
        offer with today inside its dates and the highest priority. Each visitor sees it once until you edit it.
      </p>

      {promos.length === 0 ? (
        <Empty>No offers yet. Create one for Diwali, Chhath, New Year or a fee discount.</Empty>
      ) : (
        <div className="mb-8 space-y-2">
          {promos.map((p) => {
            const st = stateOf(p);
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <div className="font-semibold">
                    {p.titleEn} {p.badge && <span className="ml-1 rounded bg-sun px-2 text-sm">{p.badge}</span>}
                  </div>
                  <div className="text-sm text-slate-500">
                    {formatDate(p.startDate)} – {formatDate(p.endDate)} · priority {p.priority}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={st.key} label={st.label} />
                  <Link href={`/admin/offers?edit=${p.id}`} className="btn-outline btn-sm">
                    Edit / preview
                  </Link>
                  <form action={togglePromotion.bind(null, p.id, !p.isActive)}>
                    <SubmitButton className="btn-outline btn-sm">{p.isActive ? "Switch off" : "Switch on"}</SubmitButton>
                  </form>
                  <form action={deletePromotion.bind(null, p.id)}>
                    <SubmitButton className="btn-danger btn-sm" confirm="Delete this offer?">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <form action={savePromotion.bind(null, editing?.id ?? null)} className="card space-y-4">
            <h2 className="text-lg font-semibold">{editing ? "Edit offer" : "New offer"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Title  *</span>
                <input name="titleEn" defaultValue={editing?.titleEn} className="input" required placeholder="Diwali Special Offer" />
              </label>
              <label className="block">
                <span className="label">Message  *</span>
                <textarea name="messageEn" defaultValue={editing?.messageEn} rows={3} className="input" required />
              </label>
              <label className="block">
                <span className="label">Big badge text</span>
                <input name="badge" defaultValue={editing?.badge ?? ""} className="input" placeholder="₹700 / 2 months · 20% OFF" />
              </label>
              <label className="block">
                <span className="label">Linked fee plan (optional)</span>
                <select name="planId" defaultValue={editing?.planId ?? ""} className="input">
                  <option value="">—</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn} — ₹{p.price}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Button text </span>
                <input name="ctaTextEn" defaultValue={editing?.ctaTextEn ?? ""} className="input" placeholder="Call to book your seat" />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Button link</span>
                <input
                  name="ctaLink"
                  defaultValue={editing?.ctaLink ?? `tel:+91${settings.mobile}`}
                  className="input"
                  placeholder="tel:+919935184537 or https://wa.me/919935184537 or /login"
                />
              </label>
              <label className="block">
                <span className="label">Show from *</span>
                <input type="date" name="startDate" defaultValue={toDateInput(editing?.startDate ?? today)} className="input" required />
              </label>
              <label className="block">
                <span className="label">Show until *</span>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={toDateInput(editing?.endDate ?? addDays(today, 30))}
                  className="input"
                  required
                />
              </label>
              <label className="block">
                <span className="label">Priority (higher wins)</span>
                <input type="number" name="priority" defaultValue={editing?.priority ?? 0} className="input" />
              </label>
              <label className="block">
                <span className="label">Image (optional)</span>
                <input type="file" name="image" accept="image/*" className="input" />
              </label>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} /> Switched on
              </label>
              {editing?.imagePath && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="removeImage" /> Remove current image
                </label>
              )}
            </div>
            <SubmitButton className="btn-brand" pendingText="Saving…">
              Save offer
            </SubmitButton>
          </form>

          {editing && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">Preview</h2>
              </div>
              <div className="grid place-items-center rounded-2xl bg-slate-800/80 p-6">
                <OfferPopup
                  preview
                  storageKey="preview"
                  title={editing.titleEn}
                  message={editing.messageEn}
                  badge={editing.badge}
                  imageUrl={editing.imagePath ? `/files/${editing.imagePath}` : null}
                  ctaText={editing.ctaTextEn}
                  ctaLink={editing.ctaLink}
                  closeLabel="Close"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
