import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Field, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { UpiQr } from "@/components/UpiQr";
import {
  deleteFacility,
  deleteGalleryImage,
  removeUpiQr,
  saveFacility,
  saveSettings,
  uploadGallery,
  uploadUpiQr,
} from "./actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const params = await searchParams;
  const [s, facilities, gallery] = await Promise.all([
    getSettings(),
    prisma.facility.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.galleryImage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
  ]);

  return (
    <>
      <PageHeader title="Settings" />
      <Flash params={params} />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <form action={saveSettings} className="card space-y-4">
          <h2 className="text-lg font-semibold">Library details (shown on the website)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Library name" name="libraryName" defaultValue={s.libraryName} />
            <Field label="Owner / director" name="ownerName" defaultValue={s.ownerName} />
            <div className="sm:col-span-2">
              <Field label="Tagline" name="tagline" defaultValue={s.tagline} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Address" name="address" defaultValue={s.address} />
            </div>
            <Field label="Mobile" name="mobile" defaultValue={s.mobile} />
            <Field label="Emergency number" name="emergencyMobile" defaultValue={s.emergencyMobile} />
            <Field label="WhatsApp number" name="whatsapp" defaultValue={s.whatsapp} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Opens at" name="openTime" type="time" defaultValue={s.openTime} />
              <Field label="Closes at" name="closeTime" type="time" defaultValue={s.closeTime} />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Google Maps embed link (optional — Share → Embed a map → copy the src URL)"
                name="mapEmbedUrl"
                defaultValue={s.mapEmbedUrl}
                placeholder="https://www.google.com/maps/embed?pb=…"
              />
            </div>
          </div>
          <h3 className="pt-2 font-semibold">Top banner announcement (optional)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Message" name="announcementEn" defaultValue={s.announcementEn} placeholder="Library closed on Holi" />
          </div>
          <h3 className="pt-2 font-semibold">UPI payments</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="UPI ID" name="upiId" defaultValue={s.upiId} placeholder="9935184537@ybl" />
            <Field label="Payee name" name="upiPayeeName" defaultValue={s.upiPayeeName} />
          </div>
          <SubmitButton>Save settings</SubmitButton>
        </form>

        <section className="card self-start">
          <h2 className="mb-2 text-lg font-semibold">UPI QR code</h2>
          <p className="mb-3 text-sm text-slate-600">
            Students see this on the “Pay fees” page. If you only set the UPI ID, a QR with the exact amount is generated
            automatically. You can also upload your shop QR (PhonePe / Paytm / GPay).
          </p>
          <div className="mb-3">
            <UpiQr upiId={s.upiId} payeeName={s.upiPayeeName} uploadedPath={s.upiQrPath} size={200} />
            {!s.upiId && !s.upiQrPath && <p className="text-sm text-amber-700">No UPI ID or QR yet — online payment is hidden.</p>}
          </div>
          <form action={uploadUpiQr} className="flex flex-wrap gap-2">
            <input type="file" name="qr" accept="image/*" className="input max-w-xs" required />
            <SubmitButton className="btn-outline">Upload QR</SubmitButton>
          </form>
          {s.upiQrPath && (
            <form action={removeUpiQr} className="mt-2">
              <SubmitButton className="text-sm text-red-600 hover:underline">Remove uploaded QR</SubmitButton>
            </form>
          )}
        </section>
      </div>

      <section id="facilities" className="mt-6 card">
        <h2 className="mb-3 text-lg font-semibold">Facilities</h2>
        <div className="space-y-2">
          {[...facilities, null].map((f) => (
            <form
              key={f?.id ?? "new"}
              action={saveFacility.bind(null, f?.id ?? null)}
              className="grid grid-cols-[4rem_1fr] gap-2 rounded-lg bg-paper p-2 sm:grid-cols-[4rem_1fr_5rem_auto]"
            >
              <input name="icon" defaultValue={f?.icon ?? "✓"} className="input text-center" aria-label="Icon (emoji)" />
              <input name="titleEn" defaultValue={f?.titleEn} placeholder="Facility" className="input" required />
              <input type="number" name="sortOrder" defaultValue={f?.sortOrder ?? facilities.length} className="input" aria-label="Order" />
              <div className="flex gap-2">
                <SubmitButton className="btn-primary btn-sm">{f ? "Save" : "+ Add"}</SubmitButton>
                {f && (
                  <button formAction={deleteFacility.bind(null, f.id)} formNoValidate className="btn-danger btn-sm">
                    ✕
                  </button>
                )}
              </div>
            </form>
          ))}
        </div>
      </section>

      <section id="gallery" className="mt-6 card">
        <h2 className="mb-3 text-lg font-semibold">Photo gallery</h2>
        <form action={uploadGallery} className="mb-4 flex flex-wrap items-end gap-2">
          <label>
            <span className="label">Photos</span>
            <input type="file" name="images" accept="image/*" multiple required className="input" />
          </label>
          <label>
            <span className="label">Caption (optional)</span>
            <input name="caption" className="input" />
          </label>
          <SubmitButton className="btn-outline" pendingText="Uploading…">
            Upload
          </SubmitButton>
        </form>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {gallery.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-lg border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/files/${g.path}`} alt={g.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
              <form action={deleteGalleryImage.bind(null, g.id)} className="p-1 text-center">
                <SubmitButton className="text-xs text-red-600 hover:underline" confirm="Remove this photo?">
                  Remove
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
