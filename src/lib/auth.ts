import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "./db";
import { verifyOtp } from "./otp";
import { mobileSchema } from "./validation";

function toSessionUser(user: { id: string; name: string; mobile: string; role: string }) {
  return { id: user.id, name: user.name, mobile: user.mobile, role: user.role };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "password",
      credentials: { mobile: {}, password: {} },
      async authorize(credentials) {
        const mobile = mobileSchema.safeParse(credentials?.mobile);
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!mobile.success || !password) return null;
        const user = await prisma.user.findUnique({ where: { mobile: mobile.data } });
        if (!user || !user.isActive || !user.passwordHash) return null;
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;
        return toSessionUser(user);
      },
    }),
    Credentials({
      id: "otp",
      credentials: { mobile: {}, code: {} },
      async authorize(credentials) {
        const mobile = mobileSchema.safeParse(credentials?.mobile);
        const code = typeof credentials?.code === "string" ? credentials.code.trim() : "";
        if (!mobile.success || !/^\d{6}$/.test(code)) return null;
        const user = await prisma.user.findUnique({ where: { mobile: mobile.data } });
        if (!user || !user.isActive) return null;
        if (!(await verifyOtp(mobile.data, code))) return null;
        return toSessionUser(user);
      },
    }),
  ],
});
