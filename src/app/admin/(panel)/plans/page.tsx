import { prisma } from "@/lib/db";
import { formatDate, formatRupees, toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { deletePlan, savePlan } from "./actions";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const params = await searchParams;
  const [plans, shifts] = await Promise.all([
    prisma.feePlan.findMany({ include: { shift: true, _count: { select: { memberships: true } } }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    prisma.shift.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Fee plans" />
      <Flash params={params} />
      <p className="mb-4 text-slate-600">
        Active plans within their valid dates appear in the fee structure on the home page. Mark festival discounts as
        “Offer” to highlight them.
      </p>
      <div className="space-y-4">
        {[...plans, null].map((plan) => (
          <form key={plan?.id ?? "new"} action={savePlan.bind(null, plan?.id ?? null)} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {plan ? (
                  <>
                    {plan.nameEn} — {formatRupees(plan.price)}
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      {plan._count.memberships} memberships
                      {plan.validTill && ` · till ${formatDate(plan.validTill)}`}
                    </span>
                  </>
                ) : (
                  "+ New plan"
                )}
              </h2>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="isOffer" defaultChecked={plan?.isOffer} /> Offer
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} /> Active
                </label>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="label">Plan name *</span>
                <input name="nameEn" defaultValue={plan?.nameEn} className="input" required />
              </label>
              <label className="block">
                <span className="label">Duration (months) *</span>
                <input type="number" name="durationMonths" min={1} max={24} defaultValue={plan?.durationMonths ?? 1} className="input" required />
              </label>
              <label className="block">
                <span className="label">Price (₹) *</span>
                <input type="number" name="price" min={0} defaultValue={plan?.price} className="input" required />
              </label>
              <label className="block">
                <span className="label">Shift</span>
                <select name="shiftId" defaultValue={plan?.shiftId ?? ""} className="input">
                  <option value="">Any shift</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Valid from</span>
                <input type="date" name="validFrom" defaultValue={plan?.validFrom ? toDateInput(plan.validFrom) : ""} className="input" />
              </label>
              <label className="block">
                <span className="label">Valid till</span>
                <input type="date" name="validTill" defaultValue={plan?.validTill ? toDateInput(plan.validTill) : ""} className="input" />
              </label>
              <label className="block">
                <span className="label">Display order</span>
                <input type="number" name="sortOrder" defaultValue={plan?.sortOrder ?? plans.length} className="input" />
              </label>
            </div>
            <div className="flex gap-2">
              <SubmitButton className="btn-primary btn-sm">{plan ? "Save" : "Add plan"}</SubmitButton>
              {plan && (
                <button
                  formAction={deletePlan.bind(null, plan.id)}
                  formNoValidate
                  className="btn-danger btn-sm"
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
