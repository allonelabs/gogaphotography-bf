// app/api/blog/upload/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "@/app/lib/goga/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await requireSession();
  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  if (!file || file.size === 0)
    return NextResponse.json({ error: "no file" }, { status: 400 });
  const sb = gogaAdmin();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `blog/body/${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from("projects").upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${path}`;
  return NextResponse.json({ url });
}
