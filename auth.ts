import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  clientIpFromRequest,
  failureDelay,
  isLockedOut,
  recordFailure,
  recordSuccess,
  secureEqual,
} from "@/app/lib/goga/login-security";

/**
 * GOGA admin auth — single shared password.
 *
 * Single-tenant photographer studio: one operator (Goga), one password.
 * NextAuth machinery is reused only as the JWT-cookie carrier so BF chrome
 * (useSession, auth(), AccountMenu) keeps working unchanged. There is no
 * user table, no Google OAuth, no per-email role/permission lookups.
 *
 * The `password` Credentials provider compares the submitted value to
 * `ADMIN_PASSWORD` via a constant-time digest comparison, locks an IP out
 * after repeated failures, and adds a small fixed delay on every failure
 * to blunt brute-forcing. The /admin/login page calls
 * signIn("password", {password}).
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "password",
      name: "GOGA admin",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(c, request) {
        const ip = clientIpFromRequest(request);
        if (isLockedOut(ip)) {
          await failureDelay();
          return null;
        }

        const expected = process.env["ADMIN_PASSWORD"];
        const submitted = typeof c?.password === "string" ? c.password : "";
        const ok =
          !!expected && !!submitted && secureEqual(submitted, expected);
        if (!ok) {
          recordFailure(ip);
          await failureDelay();
          return null;
        }

        recordSuccess(ip);
        return {
          id: "goga",
          email: "goga@goga.photography",
          name: "Goga",
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.name = (token.name as string | null) ?? "Goga";
        session.user.email =
          (token.email as string | null) ?? "goga@goga.photography";
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  trustHost: true,
});
