import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, parseDateOnly, todayIST, toDateInput } from "@/lib/dates";
import { shiftsOverlap } from "@/lib/membership";
import { coveringWhere } from "@/lib/queries";
import { Field, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { saveShift, setSeatCount, toggleSeat, toggleShift } from "./actions";

export default async function SeatsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; shift?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? parseDateOnly(params.date) : todayIST();
  const [seats, shifts, memberships] = await Promise.all([
    prisma.seat.findMany({ orderBy: { number: "asc" } }),
    prisma.shift.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.membership.findMany({ where: coveringWhere(date), include: { user: true, shift: true } }),
  ]);
  const activeShifts = shifts.filter((s) => s.isActive);
  const shift = activeShifts.find((s) => s.id === params.shift) ?? activeShifts[0];
  const relevant = shift ? memberships.filter((m) => shiftsOverlap(m.shift, shift)) : memberships;
  const bySeat = new Map<string, typeof relevant>();
  for (const m of relevant) bySeat.set(m.seatId, [...(bySeat.get(m.seatId) ?? []), m]);
  const activeSeats = seats.filter((s) => s.isActive);
  const occupied = activeSeats.filter((s) => bySeat.has(s.id)).length;

  return (
    <>
      <PageHeader title="Seat map" />
      <Flash params={params} />

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <label>
          <span className="label">Date</span>
          <input type="date" name="date" defaultValue={toDateInput(date)} className="input" />
        </label>
        <label>
          <span className="label">Shift</span>
          <select name="shift" defaultValue={shift?.id} className="input">
            {activeShifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameEn} ({s.startTime}–{s.endTime})
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary">Show</button>
      </form>

      <p className="mb-3 text-slate-600">
        {formatDate(date)} · {shift?.nameEn}: <b className="text-red-700">{occupied} occupied</b> ·{" "}
        <b className="text-green-700">{activeSeats.length - occupied} free</b>
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10">
        {seats.map((seat) => {
          const ms = bySeat.get(seat.id);
          return (
            <div
              key={seat.id}
              className={`rounded-xl border p-2 text-center text-sm ${
                !seat.isActive
                  ? "border-dashed border-slate-300 bg-slate-100 text-slate-400"
                  : ms
                    ? "border-red-200 bg-red-50"
                    : "border-green-200 bg-green-50"
              }`}
            >
              <div className="font-display text-xl font-bold">{seat.number}</div>
              {ms ? (
                ms.map((m) => (
                  <Link key={m.id} href={`/admin/students/${m.userId}`} className="block truncate text-xs text-navy hover:underline">
                    {m.user.name}
                    <span className="text-slate-500"> · {m.shift.nameEn}</span>
                  </Link>
                ))
              ) : (
                <div className="text-xs">{seat.isActive ? "Free" : "Disabled"}</div>
              )}
              {!ms && (
                <form action={toggleSeat.bind(null, seat.id, !seat.isActive)}>
                  <button className="mt-1 text-[11px] text-slate-500 underline">{seat.isActive ? "disable" : "enable"}</button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">Number of seats</h2>
          <form action={setSeatCount} className="flex items-end gap-2">
            <Field label="Total seats" name="count" type="number" min={1} max={500} defaultValue={activeSeats.length} required />
            <SubmitButton>Update</SubmitButton>
          </form>
          <p className="mt-2 text-sm text-slate-500">Reducing the count disables the highest-numbered seats; history is kept.</p>
        </section>

        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">Shifts</h2>
          <p className="mb-3 text-sm text-slate-500">
            Seats are shared between shifts whose times don&apos;t overlap (e.g. Morning + Evening). A Full-day booking blocks both.
          </p>
          <div className="space-y-3">
            {[...shifts, null].map((s) => (
              <form
                key={s?.id ?? "new"}
                action={saveShift.bind(null, s?.id ?? null)}
                className={`grid grid-cols-2 gap-2 rounded-lg p-3 sm:grid-cols-[1fr_6rem_6rem_auto] ${s && !s.isActive ? "bg-slate-100 opacity-60" : "bg-paper"}`}
              >
                <input name="nameEn" defaultValue={s?.nameEn} placeholder="Shift name" className="input" required />
                <input type="time" name="startTime" defaultValue={s?.startTime ?? "06:00"} className="input" required />
                <input type="time" name="endTime" defaultValue={s?.endTime ?? "14:00"} className="input" required />
                <input type="hidden" name="sortOrder" value={s?.sortOrder ?? shifts.length + 1} />
                <div className="col-span-2 flex gap-2 sm:col-span-1">
                  <SubmitButton className="btn-primary btn-sm">{s ? "Save" : "+ Add"}</SubmitButton>
                  {s && (
                    <button formAction={toggleShift.bind(null, s.id, !s.isActive)} className="btn-outline btn-sm">
                      {s.isActive ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
              </form>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
