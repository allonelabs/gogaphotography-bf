import { NextResponse, type NextRequest } from "next/server";

/**
 * Preserve the requested admin path across the login.
 *
 * The layout under /admin/(dashboard) redirects signed-out requests to
 * /admin/login, but a server layout cannot read the URL it was invoked for —
 * so every deep link, including the /app/... ones that now redirect to
 * /admin/..., dropped the operator on the dashboard and made them navigate
 * again. AuthGuard adds ?next= on the client, but the server redirect wins the
 * race on a cold load.
 *
 * Middleware runs before both and does see the path, so add ?next= here.
 * This is convenience only: it never grants access. The session is still
 * checked by the layout on the server and by AuthGuard on the client, and the
 * value is re-validated against a /admin prefix before it is used.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // The session cookie name differs between http (dev) and https (prod).
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token") ||
    req.cookies.has("next-auth.session-token") ||
    req.cookies.has("__Secure-next-auth.session-token");

  if (hasSession) return NextResponse.next();

  // /admin itself is the post-login default, so it needs no ?next=.
  if (pathname === "/admin" || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Only guarded admin pages. Excludes /admin/login (would loop), the auth
  // API, and static assets.
  matcher: ["/admin/((?!login).*)"],
};
