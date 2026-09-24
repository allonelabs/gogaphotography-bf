import "server-only";

/**
 * Origin of the public static site (`allonelabs/gogaphotography`), which
 * now hosts contract signing at `/sign?t=<token>`. Shared by the contract
 * actions (email body) and the admin contract editor (copy-link button) so
 * they never drift.
 */
export function publicSiteOrigin(): string {
  return (
    process.env["PUBLIC_SITE_URL"] ?? "https://gogaphotography.vercel.app"
  ).replace(/\/$/, "");
}

export function publicSignUrl(token: string): string {
  return `${publicSiteOrigin()}/sign?t=${token}`;
}
