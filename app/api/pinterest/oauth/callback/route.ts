// app/api/pinterest/oauth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, getUserAccount } from "@/app/lib/pinterest";
import { saveSettings } from "@/app/lib/goga/pinterest-settings";
import { requireSession } from "@/app/lib/goga/require-auth";
import { PINTEREST_OAUTH_STATE_COOKIE } from "@/app/lib/goga/pinterest-oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest) {
  await requireSession();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? url.origin).replace(
    /\/$/,
    "",
  );

  const expectedState = req.cookies.get(PINTEREST_OAUTH_STATE_COOKIE)?.value;
  const clearStateCookie = (res: NextResponse) => {
    res.cookies.set(PINTEREST_OAUTH_STATE_COOKIE, "", {
      path: "/api/pinterest/oauth",
      maxAge: 0,
    });
    return res;
  };

  if (!expectedState || !safeEqual(state, expectedState)) {
    return clearStateCookie(
      NextResponse.redirect(`${origin}/app/pinterest?error=bad_state`),
    );
  }
  if (!code)
    return clearStateCookie(
      NextResponse.redirect(`${origin}/app/pinterest?error=no_code`),
    );
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
    return clearStateCookie(
      NextResponse.redirect(`${origin}/app/pinterest?connected=1`),
    );
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : "error";
    return clearStateCookie(
      NextResponse.redirect(`${origin}/app/pinterest?error=${msg}`),
    );
  }
}
