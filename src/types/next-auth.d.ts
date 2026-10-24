import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "STUDENT";
      mobile: string;
      /** How this session logged in: "otp" or "password". */
      loginMethod?: string;
    } & DefaultSession["user"];
  }
}
