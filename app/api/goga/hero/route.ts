import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let body: {
    headline_en?: string | null;
    headline_ka?: string | null;
    subtitle_en?: string | null;
    subtitle_ka?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { error } = await gogaAdmin()
    .from("hero")
    .update({
      headline_en: body.headline_en ?? null,
      headline_ka: body.headline_ka ?? null,
      subtitle_en: body.subtitle_en ?? null,
      subtitle_ka: body.subtitle_ka ?? null,
    })
    .eq("id", 1);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
