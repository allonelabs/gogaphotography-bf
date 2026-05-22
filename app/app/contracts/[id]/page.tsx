import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { ContractEditor } from "./_editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ContractAdminPage({ params }: Props) {
  const { id } = await params;
  const sb = gogaAdmin();
  const { data: c } = await sb
    .from("contracts")
    .select(
      `id, booking_id, token, body_en, body_ka, status, signer_name,
       signer_email, signed_at, signed_ip, sent_at, signature_path,
       bookings(client_name, shoot_date, packages(name_en))`,
    )
    .eq("id", id)
    .single();
  if (!c) notFound();

  let signatureUrl: string | null = null;
  if (c.signature_path) {
    const { data } = await sb.storage
      .from("contracts")
      .createSignedUrl(c.signature_path, 3600);
    signatureUrl = data?.signedUrl ?? null;
  }

  return (
    <AppShell
      breadcrumb={[
        { label: "Pipeline" },
        { label: "Contracts", href: "/app/contracts" },
        { label: c.bookings?.client_name ?? c.signer_name ?? "Contract" },
      ]}
      chatScope={{ level: "tool", tool: "contracts" }}
      chatScopeLabel={c.bookings?.client_name ?? "Contract"}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Contract ·{" "}
              {c.bookings?.client_name ?? c.signer_name ?? "(no signer)"}
            </h1>
            <p className="mt-1 text-[12px] text-[var(--ink-500)]">
              {c.bookings?.packages?.name_en ?? "Photography session"}
              {c.bookings?.shoot_date
                ? ` · ${new Date(c.bookings.shoot_date).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <Link
            href={`/app/bookings/${c.booking_id}`}
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            ← booking
          </Link>
        </header>

        <ContractEditor
          contract={{
            id: c.id,
            token: c.token,
            bodyEn: c.body_en ?? "",
            bodyKa: c.body_ka ?? "",
            status: c.status,
            signerName: c.signer_name,
            signerEmail: c.signer_email,
            signedAt: c.signed_at,
            signedIp: c.signed_ip,
            sentAt: c.sent_at,
            signatureUrl,
          }}
        />
      </div>
    </AppShell>
  );
}
