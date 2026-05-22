import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Hit = {
  id: string;
  label: string;
  hint: string;
  href: string;
  group: "Leads" | "Bookings" | "Packages" | "Projects" | "Contracts";
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 1) {
    return NextResponse.json({ hits: [] });
  }

  const sb = gogaAdmin();
  const like = `%${q.replace(/[%_]/g, " ")}%`;
  const limit = 6;

  const [leads, bookings, packages, projects, contracts] = await Promise.all([
    sb
      .from("leads")
      .select("id, name, email, stage, shoot_date")
      .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(limit),
    sb
      .from("bookings")
      .select("id, client_name, client_email, shoot_date, status")
      .or(
        `client_name.ilike.${like},client_email.ilike.${like},location.ilike.${like}`,
      )
      .order("shoot_date", { ascending: false })
      .limit(limit),
    sb
      .from("packages")
      .select("id, slug, name_en, name_ka")
      .or(`name_en.ilike.${like},name_ka.ilike.${like},slug.ilike.${like}`)
      .limit(limit),
    sb
      .from("projects")
      .select("id, slug, title_en, title_ka")
      .or(`title_en.ilike.${like},title_ka.ilike.${like},slug.ilike.${like}`)
      .limit(limit),
    sb
      .from("contracts")
      .select(
        "id, status, signer_name, signer_email, bookings(client_name, shoot_date)",
      )
      .or(`signer_name.ilike.${like},signer_email.ilike.${like}`)
      .limit(limit),
  ]);

  const hits: Hit[] = [];

  for (const r of leads.data ?? []) {
    const bits: string[] = [];
    if (r.email) bits.push(r.email);
    if (r.stage) bits.push(r.stage);
    if (r.shoot_date)
      bits.push(new Date(r.shoot_date).toLocaleDateString("en-US"));
    hits.push({
      id: `lead:${r.id}`,
      label: r.name ?? r.email ?? "(no name)",
      hint: bits.join(" · ") || "Lead",
      href: `/app/leads/${r.id}`,
      group: "Leads",
    });
  }
  for (const r of bookings.data ?? []) {
    const bits: string[] = [];
    if (r.shoot_date)
      bits.push(new Date(r.shoot_date).toLocaleDateString("en-US"));
    if (r.status) bits.push(r.status);
    hits.push({
      id: `booking:${r.id}`,
      label: r.client_name ?? r.client_email ?? "(booking)",
      hint: bits.join(" · ") || "Booking",
      href: `/app/bookings/${r.id}`,
      group: "Bookings",
    });
  }
  for (const r of packages.data ?? []) {
    hits.push({
      id: `package:${r.id}`,
      label: r.name_en ?? r.slug,
      hint: r.slug,
      href: `/app/packages/${r.id}`,
      group: "Packages",
    });
  }
  for (const r of projects.data ?? []) {
    hits.push({
      id: `project:${r.id}`,
      label: r.title_en ?? r.slug,
      hint: r.slug,
      href: `/app/projects/${r.id}`,
      group: "Projects",
    });
  }
  for (const r of contracts.data ?? []) {
    const bits: string[] = [];
    if (r.status) bits.push(r.status);
    if (r.bookings?.client_name) bits.unshift(r.bookings.client_name);
    hits.push({
      id: `contract:${r.id}`,
      label: r.signer_name ?? r.bookings?.client_name ?? "(contract)",
      hint: bits.join(" · ") || "Contract",
      href: `/app/contracts/${r.id}`,
      group: "Contracts",
    });
  }

  return NextResponse.json({ hits });
}
