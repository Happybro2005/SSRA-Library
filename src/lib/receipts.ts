import type { Prisma } from "@prisma/client";

export function formatReceiptNo(year: number, n: number): string {
  return `SSRA-${year}-${String(n).padStart(4, "0")}`;
}

/** Atomically allocates the next receipt number for the year. Call inside a transaction. */
export async function nextReceiptNo(tx: Prisma.TransactionClient, now: Date = new Date()): Promise<string> {
  const year = now.getFullYear();
  const counter = await tx.counter.upsert({
    where: { key: `receipt-${year}` },
    create: { key: `receipt-${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return formatReceiptNo(year, counter.value);
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** Whole rupees in words using the Indian system: 125000 → "Rupees One Lakh Twenty Five Thousand Only". */
export function amountInWords(rupees: number): string {
  let n = Math.floor(Math.abs(rupees));
  if (n === 0) return "Rupees Zero Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  return `Rupees ${parts.join(" ")} Only`;
}
