"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { sendOtp } from "@/lib/otp";
import { mobileSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";

// `mobile` is echoed back so the field keeps its value after a failed attempt (React resets forms after actions).
export type LoginState = { error?: string; otpSentTo?: string; mobile?: string };

async function attempt(provider: "password" | "otp", fields: Record<string, string>, errorKey: string): Promise<LoginState> {
  try {
    await signIn(provider, { ...fields, redirectTo: "/portal" });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: errorKey, mobile: fields.mobile, otpSentTo: provider === "otp" ? fields.mobile : undefined };
    }
    throw err; // NEXT_REDIRECT on success
  }
}

/** On the admin login page, only admin numbers may log in (students use /login). */
async function blockedForAdminPage(formData: FormData): Promise<LoginState | null> {
  if (formData.get("audience") !== "admin") return null;
  const raw = String(formData.get("mobile") ?? "");
  const mobile = mobileSchema.safeParse(raw);
  const user = mobile.success ? await prisma.user.findUnique({ where: { mobile: mobile.data }, select: { role: true } }) : null;
  return user?.role === "ADMIN" ? null : { error: "notAdmin", mobile: raw };
}

export async function passwordLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const blocked = await blockedForAdminPage(formData);
  if (blocked) return blocked;
  return attempt(
    "password",
    { mobile: String(formData.get("mobile") ?? ""), password: String(formData.get("password") ?? "") },
    "invalid",
  );
}

export async function requestOtp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = String(formData.get("mobile") ?? "");
  const mobile = mobileSchema.safeParse(raw);
  if (!mobile.success) return { error: "notFound", mobile: raw };
  const blocked = await blockedForAdminPage(formData);
  if (blocked) return blocked;
  const result = await sendOtp(mobile.data);
  if (!result.ok) {
    const map = { NOT_FOUND: "notFound", COOLDOWN: "cooldown", SEND_FAILED: "sendFailed" } as const;
    return { error: map[result.error], mobile: raw, otpSentTo: result.error === "COOLDOWN" ? mobile.data : undefined };
  }
  return { otpSentTo: mobile.data };
}

export async function otpLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const blocked = await blockedForAdminPage(formData);
  if (blocked) return blocked;
  return attempt(
    "otp",
    { mobile: String(formData.get("mobile") ?? ""), code: String(formData.get("code") ?? "") },
    "invalidOtp",
  );
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
