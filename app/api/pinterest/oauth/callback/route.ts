// app/api/pinterest/oauth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, getUserAccount } from "@/app/lib/pinterest";
import { saveSettings } from "@/app/lib/goga/pinterest-settings";
import { requireSession } from "@/app/lib/goga/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireSession();
  const code = new URL(req.url).searchParams.get("code");
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  ).replace(/\/$/, "");
  if (!code)
    return NextResponse.redirect(`${origin}/app/pinterest?error=no_code`);
  try {
    const redirectUri = `${origin}/api/pinterest/oauth/callback`;
    const tok = await exchangeCode(code, redirectUri);
    const account = await getUserAccount(tok.access_token);
    await saveSettings({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? null,
      token_expires_at: new Date(
        Date.now() + tok.expires_in * 1000,
      ).toISOString(),
      connected_account: account.username ?? "connected",
    });
    return NextResponse.redirect(`${origin}/app/pinterest?connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : "error";
    return NextResponse.redirect(`${origin}/app/pinterest?error=${msg}`);
  }
}
