import { formatDate, formatRupees } from "./dates";

export function normalizeIndianMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export function waLink(mobile: string, text: string): string {
  return `https://wa.me/${normalizeIndianMobile(mobile)}?text=${encodeURIComponent(text)}`;
}

export type ReminderData = {
  name: string;
  seatNumber?: number;
  endDate?: Date;
  expired: boolean;
  amount?: number;
  upiId?: string;
  libraryName: string;
  libraryPhone: string;
};

export function feeReminderText(d: ReminderData): string {
  const date = d.endDate ? formatDate(d.endDate) : "";
  const seat = d.seatNumber ? ` (Seat ${d.seatNumber})` : "";
  const amount = d.amount ? formatRupees(d.amount) : "";

  const en = d.expired
    ? `Hello ${d.name},\nYour ${d.libraryName} membership${seat} expired on ${date}. Please pay the fee${amount ? ` of ${amount}` : ""} at the earliest.`
    : `Hello ${d.name},\nYour ${d.libraryName} membership${seat} expires on ${date}. Please renew${amount ? ` (${amount})` : ""} on time.`;

  const pay = d.upiId ? `\nUPI: ${d.upiId}` : "";
  return `${en}${pay}\n📞 ${d.libraryPhone}\n- ${d.libraryName}`;
}
