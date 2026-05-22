import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { DeliveryManager } from "./_manager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function DeliveryAdminPage({ params }: Props) {
  const { id } = await params;
  const sb = gogaAdmin();

  const [{ data: delivery }, { data: images }] = await Promise.all([
    sb
      .from("deliveries")
      .select(
        `id, booking_id, token, password_hash, intro_en, intro_ka,
         expires_at, downloads_enabled, archived, view_count, last_viewed_at,
         bookings(client_name, client_email, shoot_date)`,
      )
      .eq("id", id)
      .single(),
    sb
      .from("delivery_images")
      .select(
        "id, image_path, caption, sort_order, favorited_at, download_count",
      )
      .eq("delivery_id", id)
      .order("sort_order", { ascending: true }),
  ]);
  if (!delivery) notFound();

  const items = await Promise.all(
    (images ?? []).map(async (img) => {
      const { data } = await sb.storage
        .from("deliveries")
        .createSignedUrl(img.image_path, 3600);
      return {
        id: img.id,
        imagePath: img.image_path,
        previewUrl: data?.signedUrl ?? "",
        caption: img.caption ?? "",
        favoritedAt: img.favorited_at,
        downloadCount: img.download_count,
      };
    }),
  );

  return (
    <AppShell
      breadcrumb={[
        { label: "Pipeline" },
        { label: "Deliveries", href: "/app/deliveries" },
        { label: delivery.bookings?.client_name ?? "Delivery" },
      ]}
      chatScope={{ level: "tool", tool: "deliveries" }}
      chatScopeLabel={delivery.bookings?.client_name ?? "Delivery"}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Delivery · {delivery.bookings?.client_name ?? "(client)"}
            </h1>
            <p className="mt-1 text-[12px] text-[var(--ink-500)]">
              {delivery.bookings?.shoot_date
                ? `Shoot · ${new Date(delivery.bookings.shoot_date).toLocaleDateString()}`
                : ""}
              {delivery.bookings?.client_email
                ? ` · ${delivery.bookings.client_email}`
                : ""}
            </p>
          </div>
          <Link
            href={`/app/bookings/${delivery.booking_id}`}
            className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] hover:bg-slate-50"
          >
            ← booking
          </Link>
        </header>

        <DeliveryManager
          delivery={{
            id: delivery.id,
            token: delivery.token,
            hasPassword: !!delivery.password_hash,
            introEn: delivery.intro_en,
            introKa: delivery.intro_ka,
            expiresAt: delivery.expires_at,
            downloadsEnabled: delivery.downloads_enabled,
            viewCount: delivery.view_count,
            lastViewedAt: delivery.last_viewed_at,
          }}
          items={items}
        />
      </div>
    </AppShell>
  );
}
