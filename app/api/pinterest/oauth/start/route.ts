// app/api/pinterest/oauth/start/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, isPinterestConfigured } from "@/app/lib/pinterest";
import { requireSession } from "@/app/lib/goga/require-auth";

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
  return NextResponse.redirect(authorizeUrl(redirectUri, "goga"));
}
