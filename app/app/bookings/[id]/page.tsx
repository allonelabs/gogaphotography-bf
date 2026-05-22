import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { BookingDetail } from "./_detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const sb = gogaAdmin();
  const { data } = await sb
    .from("bookings")
    .select(
      `id, lead_id, package_id, shoot_date, shoot_time, duration_hours, location,
       subtotal_cents, deposit_cents, total_cents, currency, status, deposit_status,
       stripe_session_id, contract_status, client_name, client_email, client_phone,
       notes, created_at,
       packages(name_en, slug)`,
    )
    .eq("id", id)
    .single();
  if (!data) notFound();

  return (
    <AppShell
      breadcrumb={[
        { label: "Pipeline" },
        { label: "Bookings", href: "/app/bookings" },
        { label: data.client_name ?? data.shoot_date },
      ]}
      chatScope={{ level: "tool", tool: "bookings" }}
      chatScopeLabel={data.client_name ?? "Booking"}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              {data.client_name ?? "Booking"}
            </h1>
            <p className="mt-1 text-[12px] text-[var(--ink-500)]">
              {data.shoot_date}
              {data.shoot_time ? ` · ${data.shoot_time}` : ""}
              {data.location ? ` · ${data.location}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data.lead_id ? (
              <Link
                href={`/app/leads/${data.lead_id}`}
                className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
              >
                Lead →
              </Link>
            ) : null}
            <Link
              href="/app/bookings"
              className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
            >
              ← back
            </Link>
          </div>
        </header>

        <BookingDetail
          booking={{
            id: data.id,
            leadId: data.lead_id,
            shootDate: data.shoot_date,
            shootTime: data.shoot_time,
            durationHours: data.duration_hours,
            location: data.location,
            subtotalCents: data.subtotal_cents,
            depositCents: data.deposit_cents,
            totalCents: data.total_cents,
            currency: data.currency,
            status: data.status,
            depositStatus: data.deposit_status,
            contractStatus: data.contract_status,
            clientName: data.client_name,
            clientEmail: data.client_email,
            clientPhone: data.client_phone,
            notes: data.notes,
            createdAt: data.created_at,
            packageName: data.packages?.name_en ?? null,
          }}
        />
      </div>
    </AppShell>
  );
}
