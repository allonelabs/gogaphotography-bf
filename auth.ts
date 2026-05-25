import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * GOGA admin auth — single shared password.
 *
 * Single-tenant photographer studio: one operator (Goga), one password.
 * NextAuth machinery is reused only as the JWT-cookie carrier so BF chrome
 * (useSession, auth(), AccountMenu) keeps working unchanged. There is no
 * user table, no Google OAuth, no per-email role/permission lookups.
 *
 * The `password` Credentials provider compares the submitted value to
 * `ADMIN_PASSWORD` in constant-ish time and returns a fixed operator
 * profile. The /admin/login page calls signIn("password", {password}).
 */
const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "password",
      name: "GOGA admin",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(c) {
        const expected = process.env["ADMIN_PASSWORD"];
        if (!expected) return null;
        const submitted = typeof c?.password === "string" ? c.password : "";
        if (!submitted) return null;
        if (!constantTimeEqual(submitted, expected)) return null;
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
