export const metadata = { title: "Thank you · GOGA Photography" };

export default function ThanksPage() {
  return (
    <div className="min-h-screen w-full grid place-items-center bg-[#0a0a0a] text-[#f4f4f4] px-5 font-sans">
      <div className="w-full max-w-[480px] text-center">
        <h1
          className="text-[28px] uppercase tracking-[0.06em] m-0"
          style={{ fontVariationSettings: '"wght" 640, "opsz" 36' }}
        >
          Thank you
        </h1>
        <p className="mt-3 text-[13px] uppercase tracking-[0.28em] text-white/55">
          Your deposit is being confirmed
        </p>
        <p className="mt-8 text-[15px] leading-[1.7] text-white/70">
          We&rsquo;ll send a confirmation email with the contract and shoot
          details shortly. If anything looks off, reply to that email or write
          to{" "}
          <a
            href="mailto:hello@goga.photography"
            className="underline underline-offset-4 hover:text-white"
          >
            hello@goga.photography
          </a>
          .
        </p>
      </div>
    </div>
  );
}
