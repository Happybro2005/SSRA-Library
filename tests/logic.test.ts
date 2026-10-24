import { describe, expect, it } from "vitest";
import { addMonths, parseDateOnly, todayIST } from "@/lib/dates";
import { computeEndDate, findSeatConflict, membershipStatus, shiftsOverlap } from "@/lib/membership";
import { formatReceiptNo } from "@/lib/receipts";
import { checkOtp, hashOtp } from "@/lib/otp";
import { normalizeIndianMobile, waLink } from "@/lib/whatsapp";
import { upiPayLink } from "@/lib/upi";
import { renewalStart } from "@/lib/membership-service";

const d = parseDateOnly;
const MORNING = { startTime: "06:00", endTime: "14:00" };
const EVENING = { startTime: "14:00", endTime: "22:00" };
const FULL = { startTime: "06:00", endTime: "22:00" };

describe("shifts", () => {
  it("back-to-back shifts can share a seat", () => expect(shiftsOverlap(MORNING, EVENING)).toBe(false));
  it("full day blocks morning and evening", () => {
    expect(shiftsOverlap(FULL, MORNING)).toBe(true);
    expect(shiftsOverlap(EVENING, FULL)).toBe(true);
  });
});

describe("end dates", () => {
  it("2-month plan from 1 Nov ends 31 Dec", () => expect(computeEndDate(d("2026-11-01"), 2)).toEqual(d("2026-12-31")));
  it("1-month plan from 15 Oct ends 14 Nov", () => expect(computeEndDate(d("2026-10-15"), 1)).toEqual(d("2026-11-14")));
  it("clamps month end (31 Jan + 1 month)", () => expect(addMonths(d("2027-01-31"), 1)).toEqual(d("2027-02-28")));
});

describe("seat conflicts", () => {
  const existing = [{ startDate: d("2026-11-01"), endDate: d("2026-12-31"), shift: MORNING, membershipId: "a" }];
  it("blocks same seat, same shift, overlapping dates", () => {
    expect(findSeatConflict({ startDate: d("2026-12-15"), endDate: d("2027-01-14"), shift: MORNING }, existing)).toBeDefined();
  });
  it("blocks a full-day booking over a morning booking", () => {
    expect(findSeatConflict({ startDate: d("2026-11-10"), endDate: d("2026-12-09"), shift: FULL }, existing)).toBeDefined();
  });
  it("allows evening on the same seat", () => {
    expect(findSeatConflict({ startDate: d("2026-11-01"), endDate: d("2026-12-31"), shift: EVENING }, existing)).toBeUndefined();
  });
  it("allows the day after it ends", () => {
    expect(findSeatConflict({ startDate: d("2027-01-01"), endDate: d("2027-01-31"), shift: MORNING }, existing)).toBeUndefined();
  });
  it("ignores the membership being edited", () => {
    expect(findSeatConflict({ startDate: d("2026-11-01"), endDate: d("2026-12-31"), shift: MORNING }, existing, "a")).toBeUndefined();
  });
});

describe("membership status", () => {
  const m = { startDate: d("2026-10-01"), endDate: d("2026-10-31") };
  it("active", () => expect(membershipStatus(m, d("2026-10-10"))).toBe("ACTIVE"));
  it("expiring within 7 days", () => expect(membershipStatus(m, d("2026-10-25"))).toBe("EXPIRING"));
  it("last day is still valid", () => expect(membershipStatus(m, d("2026-10-31"))).toBe("EXPIRING"));
  it("expired", () => expect(membershipStatus(m, d("2026-11-01"))).toBe("EXPIRED"));
  it("upcoming", () => expect(membershipStatus(m, d("2026-09-30"))).toBe("UPCOMING"));
});

describe("renewal start", () => {
  it("continues the day after a running membership", () => expect(renewalStart(d("2026-10-31"), d("2026-10-25"))).toEqual(d("2026-11-01")));
  it("starts today after a lapse", () => expect(renewalStart(d("2026-09-30"), d("2026-10-25"))).toEqual(d("2026-10-25")));
});

describe("dates in India", () => {
  it("uses IST, not UTC, for today", () => {
    // 20:00 UTC on 23 Oct is 01:30 IST on 24 Oct
    expect(todayIST(new Date("2026-10-23T20:00:00Z"))).toEqual(d("2026-10-24"));
  });
});

describe("receipts", () => {
  it("pads the number", () => expect(formatReceiptNo(2026, 7)).toBe("SSRA-2026-0007"));
});

describe("otp", () => {
  const base = { codeHash: hashOtp("9935184537", "123456"), attempts: 0, usedAt: null, expiresAt: new Date(Date.now() + 60_000) };
  it("accepts the right code", () => expect(checkOtp(base, "9935184537", "123456")).toBe("OK"));
  it("rejects a wrong code", () => expect(checkOtp(base, "9935184537", "654321")).toBe("WRONG_CODE"));
  it("rejects a code for another number", () => expect(checkOtp(base, "9000000000", "123456")).toBe("WRONG_CODE"));
  it("expires", () => expect(checkOtp({ ...base, expiresAt: new Date(Date.now() - 1) }, "9935184537", "123456")).toBe("EXPIRED"));
  it("locks after 5 attempts", () => expect(checkOtp({ ...base, attempts: 5 }, "9935184537", "123456")).toBe("TOO_MANY_ATTEMPTS"));
  it("cannot be reused", () => expect(checkOtp({ ...base, usedAt: new Date() }, "9935184537", "123456")).toBe("USED"));
});

describe("links", () => {
  it("adds India code for WhatsApp", () => {
    expect(normalizeIndianMobile("99351 84537")).toBe("919935184537");
    expect(waLink("9935184537", "hi there")).toBe("https://wa.me/919935184537?text=hi%20there");
  });
  it("builds a UPI link with amount", () => {
    expect(upiPayLink({ upiId: "ssra@ybl", payeeName: "SSRA Library", amount: 700 })).toBe(
      "upi://pay?pa=ssra%40ybl&pn=SSRA+Library&cu=INR&am=700",
    );
  });
});

describe("book borrowing", async () => {
  const { borrowBlock, endOfDayIST, MAX_BOOKS_PER_STUDENT } = await import("@/lib/library");
  const ok = { activeMember: true, openCount: 0, availableCopies: 2, hasIt: false, requested: false };
  it("allows an active member when a copy is free", () => expect(borrowBlock(ok)).toBeNull());
  it("needs an active membership", () => expect(borrowBlock({ ...ok, activeMember: false })).toBe("NOT_MEMBER"));
  it("needs a free copy", () => expect(borrowBlock({ ...ok, availableCopies: 0 })).toBe("UNAVAILABLE"));
  it("caps books per student", () => expect(borrowBlock({ ...ok, openCount: MAX_BOOKS_PER_STUDENT })).toBe("LIMIT"));
  it("blocks duplicates", () => {
    expect(borrowBlock({ ...ok, hasIt: true })).toBe("ALREADY_HAVE");
    expect(borrowBlock({ ...ok, requested: true })).toBe("ALREADY_REQUESTED");
  });
  it("a due date lasts until midnight IST at the end of that day", () => {
    expect(endOfDayIST(d("2026-11-06")).toISOString()).toBe("2026-11-06T18:30:00.000Z");
  });
});

describe("amount in words", async () => {
  const { amountInWords } = await import("@/lib/receipts");
  it("hundreds", () => expect(amountInWords(700)).toBe("Rupees Seven Hundred Only"));
  it("teens and tens", () => expect(amountInWords(1415)).toBe("Rupees One Thousand Four Hundred Fifteen Only"));
  it("lakh", () => expect(amountInWords(125000)).toBe("Rupees One Lakh Twenty Five Thousand Only"));
  it("crore", () => expect(amountInWords(10000001)).toBe("Rupees One Crore One Only"));
  it("zero", () => expect(amountInWords(0)).toBe("Rupees Zero Only"));
});
