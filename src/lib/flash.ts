import { redirect } from "next/navigation";

/** Redirects back to a page with a one-line ok/error message shown by <Flash>. */
export function flashRedirect(path: string, kind: "ok" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

export type FlashParams = { ok?: string; error?: string };
