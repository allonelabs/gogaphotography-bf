// V4 stub — heavy logic proxied to Hetzner runner.
import { proxyToRunner } from "@/app/lib/hetzner-proxy";
import { requireApiSession } from "@/app/lib/goga/require-api-session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const gate = await requireApiSession();
  if (!gate.ok) return gate.response;
  return proxyToRunner(req);
}
