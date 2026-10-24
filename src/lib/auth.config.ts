import type { NextAuthConfig } from "next-auth";

// Edge-safe config shared with middleware (no Prisma / bcrypt here).
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.mobile = (user as { mobile?: string }).mobile;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "ADMIN" | "STUDENT";
      session.user.mobile = token.mobile as string;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role;
      if (pathname === "/admin/login") {
        // Already logged in: go to the right home instead of showing the form again.
        if (role) return Response.redirect(new URL(role === "ADMIN" ? "/admin" : "/student", request.nextUrl));
        return true;
      }
      if (pathname.startsWith("/admin")) {
        if (!role) return Response.redirect(new URL("/admin/login", request.nextUrl));
        if (role !== "ADMIN") return Response.redirect(new URL("/student", request.nextUrl));
      }
      if (pathname.startsWith("/student")) {
        if (!role) return false;
        if (role === "ADMIN") return Response.redirect(new URL("/admin", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
