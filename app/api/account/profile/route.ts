// Profile read + upsert against Supabase. Identifies the user by their
// NextAuth session email; service-role client writes the row.
//
// Schema mapping (DB → UI):
//   profiles.full_name       ↔ name
//   profiles.email           ↔ email
//   profiles.bio             ↔ bio
//   profiles.timezone        ↔ timezone
//   profiles.socials.role    ↔ role     (free-form, not enumerated)
//   profiles.socials.twitter ↔ twitter
//   profiles.socials.github  ↔ github
//   profiles.updated_at      ↔ updatedAt

import { auth } from "../../../../auth";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UIProfile {
  name: string;
  email: string;
  role: string;
  timezone: string;
  bio: string;
  twitter: string;
  github: string;
}

const DEFAULT: UIProfile = {
  name: "",
  email: "",
  role: "",
  timezone: "",
  bio: "",
  twitter: "",
  github: "",
};

function dbToUI(row: Record<string, unknown> | null, sessionEmail: string, sessionName: string | null): UIProfile & { updatedAt?: string } {
  if (!row) {
    return {
      ...DEFAULT,
      email: sessionEmail,
      name: sessionName ?? sessionEmail.split("@")[0],
    };
  }
  const socials = (row.socials as Record<string, string> | undefined) ?? {};
  return {
    name: typeof row.full_name === "string" ? row.full_name : sessionName ?? "",
    email: typeof row.email === "string" ? row.email : sessionEmail,
    role: typeof socials.role === "string" ? socials.role : "",
    timezone: typeof row.timezone === "string" ? row.timezone : "",
    bio: typeof row.bio === "string" ? row.bio : "",
    twitter: typeof socials.twitter === "string" ? socials.twitter : "",
    github: typeof socials.github === "string" ? socials.github : "",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

export async function GET(): Promise<Response> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return jsonResponse({ profile: DEFAULT, error: "not signed in" }, 200);

  const sb = getSupabaseAdmin();
  const { data } = await sb.from("profiles").select("*").eq("email", email).maybeSingle();
  return jsonResponse({ profile: dbToUI(data, email, session?.user?.name ?? null) }, 200);
}

export async function PUT(req: Request): Promise<Response> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return jsonResponse({ error: "not signed in" }, 401);

  let body: Partial<UIProfile> = {};
  try { body = (await req.json()) as Partial<UIProfile>; }
  catch { return jsonResponse({ error: "invalid json" }, 400); }

  const sb = getSupabaseAdmin();
  const row = {
    email,
    full_name: typeof body.name === "string" ? body.name : null,
    bio: typeof body.bio === "string" ? body.bio : null,
    timezone: typeof body.timezone === "string" ? body.timezone : null,
    socials: {
      role: typeof body.role === "string" ? body.role : "",
      twitter: typeof body.twitter === "string" ? body.twitter : "",
      github: typeof body.github === "string" ? body.github : "",
    },
  };
  const { data, error } = await sb.from("profiles").upsert(row, { onConflict: "email" }).select("*").single();
  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ profile: dbToUI(data, email, session?.user?.name ?? null) }, 200);
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
