import { notFound } from "next/navigation";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { SignPad } from "./_pad";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sign your contract — GOGA Photography",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function SignPage({ params }: Props) {
  const { token } = await params;
  const sb = gogaAdmin();
  const { data: c } = await sb
    .from("contracts")
    .select(
      `id, token, body_en, status, signer_name, signer_email, signed_at,
       bookings(shoot_date, location, packages(name_en))`,
    )
    .eq("token", token)
    .maybeSingle();
  if (!c) notFound();

  if (c.status === "void") {
    return (
      <main className="min-h-screen bg-[#f6f5f1] px-5 py-20 text-center text-[var(--ink-900)]">
        <h1 className="text-2xl font-semibold">This contract was cancelled</h1>
        <p className="mt-2 text-[var(--ink-500)]">
          Please contact the studio for a new version.
        </p>
      </main>
    );
  }

  if (c.status === "signed") {
    return (
      <main className="min-h-screen bg-[#f6f5f1] px-5 py-20 text-center text-[var(--ink-900)]">
        <h1 className="text-2xl font-semibold">Already signed</h1>
        <p className="mt-2 text-[var(--ink-500)]">
          Signed on{" "}
          {c.signed_at ? new Date(c.signed_at).toLocaleString() : "(unknown)"}{" "}
          by {c.signer_name ?? "the client"}. The studio has been notified.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f5f1] px-4 py-10 sm:py-16 text-[var(--ink-900)]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <div
            className="mb-4 text-[13px] uppercase tracking-[0.32em] text-[var(--ink-500)]"
            style={{ fontVariationSettings: '"wght" 640, "opsz" 18' }}
          >
            GOGA
          </div>
          <h1
            className="text-3xl font-semibold tracking-[-0.01em] sm:text-4xl"
            style={{ fontVariationSettings: '"wght" 640, "opsz" 80' }}
          >
            Photography contract
          </h1>
          <p className="mt-3 text-[13px] tracking-[0.04em] text-[var(--ink-500)]">
            {c.bookings?.packages?.name_en ?? "Photography session"}
            {c.bookings?.shoot_date
              ? ` · ${new Date(c.bookings.shoot_date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`
              : ""}
            {c.bookings?.location ? ` · ${c.bookings.location}` : ""}
          </p>
        </header>

        <section className="mb-8 rounded-2xl bg-white p-8 ring-1 ring-black/5">
          {(c.body_en ?? "").split(/\n\n+/).map((para, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "mb-4 text-[18px] font-semibold uppercase tracking-[0.04em]"
                  : "mb-4 whitespace-pre-wrap text-[15px] leading-[1.65] last:mb-0"
              }
            >
              {para}
            </p>
          ))}
        </section>

        <SignPad token={token} defaultName={c.signer_name ?? ""} />
      </div>
    </main>
  );
}
