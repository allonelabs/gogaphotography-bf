import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio admin · GOGA" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  const session = await auth();
  const { next } = await searchParams;
  // Require a same-origin path: must start with "/", must not start with "//"
  // (protocol-relative), and the only safe scope here is "/app" or "/app/…".
  const safeNext =
    typeof next === "string" &&
    /^\/app(\/|$)/.test(next) &&
    !next.startsWith("//");
  const target = safeNext ? next : "/app";
  if (session?.user?.email) {
    redirect(target);
  }

  return (
    <div className="min-h-screen w-full grid place-items-center bg-[#0a0a0a] text-[#f4f4f4] px-5 font-sans">
      <div className="w-full max-w-[420px] rounded-[14px] border border-white/10 bg-[#131313] p-8 md:p-9 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logomark.svg"
            alt="GOGA Photography"
            width={48}
            height={48}
          />
        </div>
        <h1
          className="text-[22px] uppercase tracking-[0.18em] m-0"
          style={{ fontVariationSettings: '"wght" 640' }}
        >
          GOGA
        </h1>
        <p className="mt-1 mb-7 text-[11px] uppercase tracking-[0.28em] text-white/55">
          Studio admin
        </p>
        <LoginForm next={target} />
      </div>
    </div>
  );
}
