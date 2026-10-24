export function upiPayLink(opts: { upiId: string; payeeName: string; amount?: number; note?: string }): string {
  const params = new URLSearchParams({ pa: opts.upiId, pn: opts.payeeName, cu: "INR" });
  if (opts.amount) params.set("am", String(opts.amount));
  if (opts.note) params.set("tn", opts.note);
  return `upi://pay?${params.toString()}`;
}
