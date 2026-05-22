import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

const isDev =
  process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_AUTH === "1";

/**
 * Augmented authz blob attached to the JWT and session.
 */
interface SessionAuthzPayload {
  role: string | null;
  permissions: string[];
  organization_id: number | null;
  organization_name: string | null;
  organization_slug: string | null;
}

/**
 * Auto-provision an organization for a new email if one doesn't exist for
 * that email's domain. Travelplace.ge / allonelabs.com are seeded by 0006;
 * any other domain creates a new org named after the domain.
 *
 * Returns the resolved organization row { id, slug, name }.
 */
async function resolveOrgForEmail(
  supabase: any,
  email: string,
): Promise<{ id: number; slug: string; name: string } | null> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  // 1) Existing org for this domain?
  const { data: existing } = await supabase
    .from("organization")
    .select("id, slug, name")
    .ilike("domain", domain)
    .limit(1)
    .maybeSingle();
  if (existing) return existing as any;
  // 2) Create a new org for the domain
  const slug = domain.replace(/\./g, "-").toLowerCase();
  const name = domain
    .split(".")[0]
    .replace(/(^|[-_ ])\w/g, (m) => m.toUpperCase());
  const { data: created } = await supabase
    .from("organization")
    .insert({ slug, name, domain })
    .select("id, slug, name")
    .single();
  return (created as any) ?? null;
}

/**
 * Look up the role + permissions + organization for the given email.
 *
 * Joins administration -> role -> role_permission -> permission for authz,
 * and organization_membership -> organization for tenant identity.
 *
 * If the user has no membership yet, auto-provision one based on email
 * domain so first sign-in lands them in the right org (Travelplace,
 * AllOne Labs, or a new org for their domain).
 */
async function loadAuthzForEmail(
  email: string,
): Promise<SessionAuthzPayload | null> {
  try {
    const supabase = await createServerSupabaseClient();

    // ── Role + permissions ──────────────────────────────────────────────
    const { data: admin } = await (supabase as any)
      .from("administration")
      .select("id, role_id, role:role(id, name)")
      .eq("mail", email)
      .limit(1)
      .maybeSingle();
    const roleName: string | null = (admin as any)?.role?.name ?? null;
    const roleId: number | null = (admin as any)?.role_id ?? null;
    let permissions: string[] = [];
    if (roleId) {
      const { data: perms } = await (supabase as any)
        .from("role_permission")
        .select("permission:permission(code)")
        .eq("role_id", roleId);
      permissions = (perms ?? [])
        .map((p: any) => p?.permission?.code)
        .filter((c: unknown): c is string => typeof c === "string");
    }

    // ── Organization (membership-based, auto-provision on first sign-in) ──
    let orgRow: { id: number; slug: string; name: string } | null = null;
    const { data: membership } = await (supabase as any)
      .from("organization_membership")
      .select("organization_id, organization:organization(id, slug, name)")
      .ilike("user_email", email)
      .limit(1)
      .maybeSingle();
    if (membership?.organization) {
      orgRow = membership.organization as any;
    } else {
      orgRow = await resolveOrgForEmail(supabase, email);
      if (orgRow) {
        // Best-effort: insert membership so subsequent sign-ins skip the
        // resolve step. If it races on the unique constraint, that's fine.
        await (supabase as any).from("organization_membership").insert({
          organization_id: orgRow.id,
          user_email: email,
          role_id: roleId,
        });
      }
    }

    return {
      role: roleName,
      permissions,
      organization_id: orgRow?.id ?? null,
      organization_name: orgRow?.name ?? null,
      organization_slug: orgRow?.slug ?? null,
    };
  } catch {
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    ...(isDev
      ? [
          Credentials({
            id: "dev",
            name: "Dev sign-in",
            credentials: {
              email: { label: "Email", type: "email" },
              name: { label: "Name", type: "text" },
            },
            async authorize(c) {
              const email = String(c?.email ?? "dev@allonelabs.com");
              const name = String(c?.name ?? email.split("@")[0]);
              return { id: email, email, name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Refresh on initial sign-in OR explicit session refresh.
      const email =
        (typeof user?.email === "string" && user.email) ||
        (typeof token.email === "string" && token.email) ||
        null;
      const needsLoad =
        !!email &&
        (trigger === "signIn" ||
          trigger === "signUp" ||
          trigger === "update" ||
          token.role === undefined ||
          (token as any).organization_id === undefined);
      if (needsLoad && email) {
        const authz = await loadAuthzForEmail(email);
        if (authz) {
          (token as any).role = authz.role;
          (token as any).permissions = authz.permissions;
          (token as any).organization_id = authz.organization_id;
          (token as any).organization_name = authz.organization_name;
          (token as any).organization_slug = authz.organization_slug;
        } else {
          (token as any).role = null;
          (token as any).permissions = [];
          (token as any).organization_id = null;
          (token as any).organization_name = null;
          (token as any).organization_slug = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = (token as any).role ?? null;
        (session.user as any).permissions = (token as any).permissions ?? [];
        (session.user as any).organization_id =
          (token as any).organization_id ?? null;
        (session.user as any).organization_name =
          (token as any).organization_name ?? null;
        (session.user as any).organization_slug =
          (token as any).organization_slug ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  trustHost: true,
});
