import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "./db";
import { getSmsProvider } from "./sms";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(mobile: string, code: string): string {
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  return createHmac("sha256", secret).update(`${mobile}:${code}`).digest("hex");
}

type OtpRecord = { codeHash: string; expiresAt: Date; attempts: number; usedAt: Date | null };
export type OtpCheck = "OK" | "EXPIRED" | "TOO_MANY_ATTEMPTS" | "USED" | "WRONG_CODE";

export function checkOtp(record: OtpRecord, mobile: string, code: string, now: Date = new Date()): OtpCheck {
  if (record.usedAt) return "USED";
  if (record.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  if (record.attempts >= OTP_MAX_ATTEMPTS) return "TOO_MANY_ATTEMPTS";
  const a = Buffer.from(record.codeHash, "hex");
  const b = Buffer.from(hashOtp(mobile, code), "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? "OK" : "WRONG_CODE";
}

export type SendOtpResult = { ok: true } | { ok: false; error: "NOT_FOUND" | "COOLDOWN" | "SEND_FAILED" };

export async function sendOtp(mobile: string): Promise<SendOtpResult> {
  const user = await prisma.user.findUnique({ where: { mobile } });
  if (!user || !user.isActive) return { ok: false, error: "NOT_FOUND" };

  const last = await prisma.otpCode.findFirst({ where: { mobile }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false, error: "COOLDOWN" };
  }

  const code = generateOtp();
  await prisma.otpCode.create({
    data: { mobile, codeHash: hashOtp(mobile, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  try {
    await getSmsProvider().sendOtp(mobile, code);
  } catch (err) {
    console.error("[otp] SMS send failed", err);
    return { ok: false, error: "SEND_FAILED" };
  }
  return { ok: true };
}

export async function verifyOtp(mobile: string, code: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({ where: { mobile }, orderBy: { createdAt: "desc" } });
  if (!record) return false;
  const result = checkOtp(record, mobile, code);
  if (result === "OK") {
    await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return true;
  }
  if (result === "WRONG_CODE") {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
  }
  return false;
}
