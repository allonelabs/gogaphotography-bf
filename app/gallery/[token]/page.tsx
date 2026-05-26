import { notFound } from "next/navigation";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import {
  deliveryExpired,
  hasDeliveryCookie,
  loadDelivery,
} from "@/app/lib/goga/delivery-gate";
import { GalleryLogin } from "./_login";
import { GalleryGrid } from "./_grid";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your photos — GOGA Photography",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function GalleryPage({ params }: Props) {
  const { token } = await params;
  const delivery = await loadDelivery(token);
  if (!delivery || delivery.archived) notFound();

  if (deliveryExpired(delivery)) {
    return (
      <main className="min-h-screen bg-[#0f0f10] px-5 py-24 text-center text-white">
        <h1 className="text-3xl font-semibold">This gallery has expired</h1>
        <p className="mt-2 text-white/55">
          Please reach out to{" "}
          <a className="underline" href="mailto:info@goga.photography">
            info@goga.photography
          </a>{" "}
          for access.
        </p>
      </main>
    );
  }

  const cookieOK = await hasDeliveryCookie(token);
  if (delivery.password_hash && !cookieOK) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0f0f10] px-5 text-white">
        <div className="w-full max-w-sm rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/10 backdrop-blur">
          <h1
            className="text-3xl font-semibold tracking-[-0.01em]"
            style={{ fontVariationSettings: '"wght" 640' }}
          >
            Your photos
          </h1>
          <p className="mb-7 mt-2 text-[12px] uppercase tracking-[0.28em] text-white/55">
            Enter the password you received from the studio.
          </p>
          <GalleryLogin token={token} />
        </div>
      </main>
    );
  }

  // Increment view counter (best-effort, awaited so failures log instead
  // of vanishing). Race-safe enough for analytics — concurrent loads may
  // collide but the loss is bounded and visible.
  const { error: viewErr } = await gogaAdmin()
    .from("deliveries")
    .update({
      view_count: 1 + ((delivery as { view_count?: number }).view_count ?? 0),
      last_viewed_at: new Date().toISOString(),
    })
    .eq("id", delivery.id);
  if (viewErr) console.error("[gallery] view_count++ failed:", viewErr);

  const sb = gogaAdmin();
  const { data: images } = await sb
    .from("delivery_images")
    .select("id, image_path, caption, sort_order, favorited_at")
    .eq("delivery_id", delivery.id)
    .order("sort_order", { ascending: true });

  const items = await Promise.all(
    (images ?? []).map(async (i) => {
      const { data } = await sb.storage
        .from("deliveries")
        .createSignedUrl(i.image_path, 3600);
      return {
        id: i.id,
        url: data?.signedUrl ?? "",
        caption: i.caption ?? "",
        favorited: !!i.favorited_at,
      };
    }),
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-12 sm:px-10 sm:py-16 text-white">
      <header className="mx-auto mb-12 max-w-5xl text-center">
        <div className="mb-4 text-[13px] uppercase tracking-[0.32em] text-white/55">
          GOGA
        </div>
        <h1
          className="text-4xl font-semibold tracking-[-0.01em] sm:text-5xl md:text-6xl"
          style={{ fontVariationSettings: '"wght" 640' }}
        >
          Your photos
        </h1>
        {delivery.intro_en ? (
          <p className="mx-auto mt-5 max-w-xl whitespace-pre-wrap text-[15px] leading-[1.6] italic text-white/75">
            {delivery.intro_en}
          </p>
        ) : null}
        <p className="mt-5 text-[11px] uppercase tracking-[0.28em] text-white/45">
          {items.length} photo{items.length === 1 ? "" : "s"}
          {delivery.downloads_enabled ? " · downloads enabled" : ""}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="py-20 text-center text-white/55">
          The gallery is being prepared. Check back soon — the studio will email
          you when it's ready.
        </p>
      ) : (
        <GalleryGrid
          token={token}
          items={items}
          downloadsEnabled={delivery.downloads_enabled}
        />
      )}
    </main>
  );
}
