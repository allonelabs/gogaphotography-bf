// app/api/store/download/[token]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { resolveDownload } from "@/app/lib/goga/store-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const result = await resolveDownload(token);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status },
    );
  }
  return NextResponse.redirect(result.signedUrl);
}
