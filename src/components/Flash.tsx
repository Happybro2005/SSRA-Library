import { Notice } from "./ui";
import type { FlashParams } from "@/lib/flash";

export function Flash({ params }: { params: FlashParams }) {
  if (params.error) return <Notice tone="error">{params.error}</Notice>;
  if (params.ok) return <Notice tone="success">{params.ok}</Notice>;
  return null;
}
