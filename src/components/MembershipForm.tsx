"use client";

import { useMemo, useState } from "react";
import { computeEndDate, findSeatConflict } from "@/lib/membership";
import { SubmitButton } from "./SubmitButton";

export type PickerPlan = { id: string; name: string; durationMonths: number; price: number; shiftId: string | null };
export type PickerShift = { id: string; name: string; startTime: string; endTime: string };
export type PickerSeat = { id: string; number: number };
export type PickerBooking = {
  membershipId: string;
  seatId: string;
  startDate: string;
  endDate: string;
  shift: { startTime: string; endTime: string };
};

/** Admission / renewal form with a live seat map that greys out seats already booked for the chosen shift and dates. */
export function MembershipForm({
  action,
  plans,
  shifts,
  seats,
  bookings,
  defaults,
  submitLabel = "Save admission",
  allowSkip = false,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  plans: PickerPlan[];
  shifts: PickerShift[];
  seats: PickerSeat[];
  bookings: PickerBooking[];
  defaults: { startDate: string; seatId?: string; shiftId?: string; planId?: string };
  submitLabel?: string;
  /** Shows an "Assign seat & plan now" checkbox (sent as withMembership=on). */
  allowSkip?: boolean;
  /** Extra fields rendered at the top of the same form. */
  children?: React.ReactNode;
}) {
  const [withSeat, setWithSeat] = useState(true);
  const [planId, setPlanId] = useState(defaults.planId ?? plans[0]?.id ?? "");
  const plan = plans.find((p) => p.id === planId);
  const [shiftId, setShiftId] = useState(defaults.shiftId ?? plan?.shiftId ?? shifts[0]?.id ?? "");
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [seatId, setSeatId] = useState(defaults.seatId ?? "");
  const [amount, setAmount] = useState(plan?.price ?? 0);
  const [mode, setMode] = useState("CASH");

  const shift = shifts.find((s) => s.id === shiftId);
  const range = useMemo(() => {
    if (!plan || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
    const start = new Date(`${startDate}T00:00:00.000Z`);
    return { startDate: start, endDate: computeEndDate(start, plan.durationMonths) };
  }, [plan, startDate]);

  const taken = useMemo(() => {
    const set = new Set<string>();
    if (!range || !shift) return set;
    for (const seat of seats) {
      const existing = bookings
        .filter((b) => b.seatId === seat.id)
        .map((b) => ({ ...b, startDate: new Date(b.startDate), endDate: new Date(b.endDate) }));
      if (findSeatConflict({ ...range, shift }, existing)) set.add(seat.id);
    }
    return set;
  }, [range, shift, seats, bookings]);

  const seatTaken = seatId !== "" && taken.has(seatId);

  const showSeat = (!allowSkip || withSeat) && plans.length > 0;

  return (
    <form action={action} className="space-y-5">
      {children}
      {allowSkip && (
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            name="withMembership"
            checked={withSeat}
            onChange={(e) => setWithSeat(e.target.checked)}
            className="h-4 w-4"
          />
          Assign seat & plan now
        </label>
      )}
      {plans.length === 0 && <p className="text-slate-600">Create a fee plan first (Admin → Fee plans) to assign a seat.</p>}
      {showSeat && (
        <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="label">Plan *</span>
          <select
            name="planId"
            className="input"
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              const p = plans.find((x) => x.id === e.target.value);
              if (p) {
                setAmount(p.price);
                if (p.shiftId) setShiftId(p.shiftId);
              }
            }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{p.price} / {p.durationMonths} mo
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Shift *</span>
          <select name="shiftId" className="input" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.startTime}–{s.endTime})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Start date *</span>
          <input
            type="date"
            name="startDate"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </label>
        <div>
          <span className="label">End date</span>
          <div className="input bg-slate-50">{range ? range.endDate.toISOString().slice(0, 10) : "—"}</div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="label mb-0">
            Seat * {seatId && <b>— Seat {seats.find((s) => s.id === seatId)?.number}</b>}
          </span>
          <span className="flex gap-3 text-xs text-slate-500">
            <span><i className="inline-block h-3 w-3 rounded bg-green-500 align-middle" /> free</span>
            <span><i className="inline-block h-3 w-3 rounded bg-slate-300 align-middle" /> booked</span>
            <span><i className="inline-block h-3 w-3 rounded bg-navy align-middle" /> selected</span>
          </span>
        </div>
        <input type="hidden" name="seatId" value={seatId} />
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10 lg:grid-cols-12">
          {seats.map((seat) => {
            const isTaken = taken.has(seat.id);
            const selected = seat.id === seatId;
            return (
              <button
                key={seat.id}
                type="button"
                disabled={isTaken && !selected}
                onClick={() => setSeatId(seat.id)}
                aria-pressed={selected}
                aria-label={`Seat ${seat.number}${isTaken ? " (booked)" : ""}`}
                className={`rounded-md py-2 text-sm font-semibold transition ${
                  selected
                    ? isTaken
                      ? "bg-red-600 text-white"
                      : "bg-navy text-white"
                    : isTaken
                      ? "cursor-not-allowed bg-slate-200 text-slate-400"
                      : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {seat.number}
              </button>
            );
          })}
        </div>
        {seatTaken && <p className="mt-2 text-sm text-red-700">This seat is booked for the chosen shift and dates.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="label">Amount (₹) *</span>
          <input
            type="number"
            name="amount"
            min={0}
            className="input"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </label>
        <label className="block">
          <span className="label">Payment</span>
          <select name="paymentMode" className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="CASH">Paid — Cash</option>
            <option value="UPI">Paid — UPI</option>
            <option value="NONE">Not paid yet</option>
          </select>
        </label>
        {mode === "UPI" && (
          <label className="block">
            <span className="label">UPI ref / UTR</span>
            <input name="upiRef" className="input" />
          </label>
        )}
      </div>
        </>
      )}

      <SubmitButton className="btn-brand" pendingText="Saving…" disabled={showSeat && (!seatId || seatTaken)}>
        {submitLabel}
      </SubmitButton>
      {showSeat && !seatId && <span className="ml-3 text-sm text-slate-500">Pick a seat to continue.</span>}
    </form>
  );
}
