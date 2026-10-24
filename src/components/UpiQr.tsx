import QRCode from "qrcode";
import { upiPayLink } from "@/lib/upi";

/** Shows the uploaded UPI QR image if there is one, otherwise generates a QR from the UPI ID. */
export async function UpiQr({
  upiId,
  payeeName,
  uploadedPath,
  amount,
  note,
  size = 240,
}: {
  upiId: string;
  payeeName: string;
  uploadedPath?: string;
  amount?: number;
  note?: string;
  size?: number;
}) {
  // An uploaded QR can't carry the amount, so prefer a generated one when an amount is given.
  const src =
    uploadedPath && !(amount && upiId)
      ? `/files/${uploadedPath}`
      : upiId
        ? await QRCode.toDataURL(upiPayLink({ upiId, payeeName, amount, note }), { width: size, margin: 1 })
        : null;
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`UPI QR code for ${upiId || payeeName}`} width={size} height={size} className="rounded-lg border bg-white p-2" />
  );
}
