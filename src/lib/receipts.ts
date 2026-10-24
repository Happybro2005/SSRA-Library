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
