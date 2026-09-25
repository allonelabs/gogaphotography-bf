// app/api/pinterest/oauth/start/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { authorizeUrl, isPinterestConfigured } from "@/app/lib/pinterest";
import { requireSession } from "@/app/lib/goga/require-auth";
import { PINTEREST_OAUTH_STATE_COOKIE } from "@/app/lib/goga/pinterest-oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireSession();
  if (!isPinterestConfigured()) {
    return NextResponse.json(
      { error: "PINTEREST_APP_ID/SECRET not set" },
      { status: 503 },
    );
  }
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  ).replace(/\/$/, "");
  const redirectUri = `${origin}/api/pinterest/oauth/callback`;

  // Random per-attempt CSRF token, bound to the browser via an httpOnly
  // cookie and echoed back by Pinterest as `state`. Without this, an
  // attacker could trick a signed-in operator into completing an OAuth
  // flow initiated (and controlled) by the attacker.
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authorizeUrl(redirectUri, state));
  res.cookies.set(PINTEREST_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/pinterest/oauth",
    maxAge: 600,
  });
  return res;
}
