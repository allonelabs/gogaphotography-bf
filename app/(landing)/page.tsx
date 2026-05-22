import Script from "next/script";

export default function HomePage() {
  return (
    <div className="bg-black text-white min-h-screen">
      <div
        className="relative z-0"
        style={{
          pointerEvents: "auto",
          animation:
            "0.8s cubic-bezier(0.76, 0, 0.24, 1) 0s 1 normal forwards running page-fade-in",
          willChange: "opacity",
        }}
      >
        <main className="min-h-screen w-full px-5 max-sm:px-3 overflow-x-clip ">
          <header className="w-full mt-5 relative z-10">
            <div className="grid grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-5 w-full h-8 items-end">
              <div className="col-span-1 lg:col-span-3">
                <div
                  className="glitch-wrapper "
                  style={{ position: "relative" }}
                >
                  <div style={{ position: "relative", zIndex: "1" }}>
                    <a href="/index.html">
                      <img
                        alt="AllOnce"
                        width="36"
                        height="36"
                        decoding="async"
                        data-nimg="1"
                        className="h-8 w-auto"
                        src="/images/mark.svg"
                        style={{ color: "transparent" }}
                      />
                    </a>
                  </div>
                </div>
              </div>
              <nav
                aria-label="Primary"
                className="col-start-2 col-span-2 max-sm:col-start-2 max-sm:col-span-2 lg:col-start-4 lg:col-span-6 self-end flex justify-start"
              >
                <div
                  className="flex items-baseline gap-5 whitespace-nowrap"
                  style={{ position: "relative", transform: "none" }}
                >
                  <a
                    className="font-semibold text-sm uppercase underline underline-offset-4 hover:opacity-70"
                    style={{ color: "#0000FF" }}
                    href="/signin/index.html"
                  >
                    Sign In
                  </a>
                </div>
              </nav>
            </div>
          </header>
          <div
            aria-hidden="true"
            className="fixed top-0 left-0 right-0 z-50 pt-5 transition-transform duration-500 ease-in-out pointer-events-none -translate-y-full"
          >
            <div className="pointer-events-auto w-full px-[20px] max-sm:px-[12px] md:px-[20px] lg:px-[20px]">
              <div className="grid grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-5 w-full h-8 items-end">
                <div className="col-span-1 lg:col-span-3">
                  <div
                    className="glitch-wrapper "
                    style={{ position: "relative" }}
                  >
                    <div style={{ position: "relative", zIndex: "1" }}>
                      <a tabIndex={-1} href="/index.html">
                        <img
                          alt="AllOnce"
                          width="36"
                          height="36"
                          decoding="async"
                          data-nimg="1"
                          className="h-8 w-auto"
                          src="/images/mark.svg"
                          style={{ color: "transparent" }}
                        />
                      </a>
                    </div>
                  </div>
                </div>
                <nav
                  aria-label="Primary"
                  className="col-start-2 lg:col-start-4 max-sm:col-start-3 self-end flex justify-start"
                >
                  <div
                    className=""
                    style={{ position: "relative", transform: "none" }}
                  >
                    <a
                      className="font-semibold text-sm uppercase underline underline-offset-4 hover:opacity-70"
                      style={{ color: "#0000FF" }}
                      tabIndex={-1}
                      href="/signin/index.html"
                    >
                      Sign In
                    </a>
                  </div>
                </nav>
              </div>
            </div>
          </div>
          <section className="grid grid-cols-12 max-sm:grid-cols-4 sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 w-full items-start max-sm:h-auto max-sm:min-h-0 rp-hero-section lg:max-dt:h-auto lg:max-dt:!mt-[min(120px,calc(100vh-600px))] min-[1024px]:max-[1399px]:h-[450px] min-[1024px]:max-[1399px]:!mt-[80px] sm:max-lg:h-auto sm:max-lg:!mt-[140px] max-sm:!mt-[100px]">
            <h1
              className="col-[3/10] max-sm:col-[1/5] max-sm:row-start-1 max-sm:text-[clamp(28px,8vw,40px)] sm:col-[1/5] sm:row-start-1 sm:text-[clamp(48px,4.688vw,68px)] lg:col-[3/10] dt:text-[clamp(46px,3.462vw-2.46px,64px)] lg:max-dt:text-[clamp(32px,3.733vw-6.22px,46px)] text-[#c5c5c5] font-medium text-[clamp(46px,3.462vw-2.46px,64px)] leading-[100%] tracking-[-0.06em] self-start"
              style={{ opacity: "1", transform: "none" }}
            >
              <span className="pl-[calc((100%+20px)/7)] lg:max-dt:pl-[calc((100%+20px)/7)] sm:max-lg:pl-[calc((100%+20px)/4)] max-sm:pl-0">
                One prompt.
              </span>
              <br />
              Your entire business.
              <br />
              All at once.
            </h1>
            <div
              className="col-[11/12] max-sm:mt-5 max-sm:col-[3/4] sm:col-[3/4] sm:row-start-2 lg:row-start-1 sm:mt-5 sm:flex lg:col-[11/12] lg:mt-0 flex flex-col gap-[14px] self-start"
              style={{ opacity: "1", transform: "none" }}
            >
              <span
                className="font-medium text-[32px] leading-[100%] tracking-[-0.03em] max-sm:text-[24px] lg:max-dt:text-[clamp(22px,3.2vw-4.77px,32px)] sm:max-lg:text-[clamp(24px,3.2vw-4.77px,28px)]"
                style={{ color: "#0000FF" }}
              >
                36
              </span>
              <span className="flex flex-col [&>span]:block">
                <span className="block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none max-sm:text-[10px] lg:max-dt:text-[clamp(11px,0.8vw+0.8px,11px)] sm:max-lg:text-[clamp(11px,1.25vw-0.5px,14px)]">
                  Evolve
                </span>
                <span className="block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none max-sm:text-[10px] lg:max-dt:text-[clamp(11px,0.8vw+0.8px,11px)] sm:max-lg:text-[clamp(11px,1.25vw-0.5px,14px)]">
                  Tools
                </span>
              </span>
            </div>
            <div
              className="col-[12/13] max-sm:mt-5 max-sm:col-[4/5] sm:col-[4/5] sm:row-start-2 lg:row-start-1 sm:mt-5 sm:flex lg:col-[12/13] lg:mt-0 flex flex-col gap-[14px] self-start"
              style={{ opacity: "1", transform: "none" }}
            >
              <span
                className="font-medium text-[32px] leading-[100%] tracking-[-0.03em] max-sm:text-[24px] lg:max-dt:text-[clamp(22px,3.2vw-4.77px,32px)] sm:max-lg:text-[clamp(24px,3.2vw-4.77px,28px)]"
                style={{ color: "#0000FF" }}
              >
                65
              </span>
              <span className="flex flex-col [&>span]:block">
                <span className="block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none max-sm:text-[10px] lg:max-dt:text-[clamp(11px,0.8vw+0.8px,11px)] sm:max-lg:text-[clamp(11px,1.25vw-0.5px,14px)]">
                  Bridges
                </span>
                <span className="block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none max-sm:text-[10px] lg:max-dt:text-[clamp(11px,0.8vw+0.8px,11px)] sm:max-lg:text-[clamp(11px,1.25vw-0.5px,14px)]">
                  Wired
                </span>
              </span>
            </div>
          </section>
          <section className="workflow">
            <div className="workflow-stage">
              <div className="workflow-frame">
                <svg
                  className="workflow-svg"
                  viewBox="0 0 1280 760"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs></defs>

                  {/* ───────── Scene 01 — Chat (greet) ───────── */}
                  <g className="wf-scene" id="wf-s1" opacity="0">
                    {/* Avatar header */}
                    <g
                      data-fx="pop"
                      data-fx-delay="0.04"
                      transform="translate(640,80)"
                      textAnchor="middle"
                    >
                      <circle cy="0" r="22" fill="#000" />
                      <g fill="#fff">
                        <rect x="-9" y="-6" width="3" height="12" />
                        <rect x="-1.5" y="-10" width="3" height="20" />
                        <rect x="6" y="-4" width="3" height="8" />
                      </g>
                      <text
                        y="44"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.2"
                      >
                        AllOnce
                      </text>
                      <text
                        y="64"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.45)"
                        letterSpacing="0.06em"
                      >
                        active now
                      </text>
                    </g>
                    {/* Bot bubble 1 */}
                    <g
                      data-fx="slide-right"
                      data-fx-delay="0.20"
                      transform="translate(220,200)"
                    >
                      <rect
                        width="380"
                        height="58"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <text
                        x="24"
                        y="36"
                        fontFamily="Inter"
                        fontSize="15"
                        fontWeight="500"
                        fill="#000"
                        letterSpacing="-0.01em"
                      >
                        Welcome to AllOnce.
                      </text>
                    </g>
                    {/* Bot bubble 2 */}
                    <g
                      data-fx="slide-right"
                      data-fx-delay="0.40"
                      transform="translate(220,280)"
                    >
                      <rect
                        width="540"
                        height="58"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <text
                        x="24"
                        y="36"
                        fontFamily="Inter"
                        fontSize="15"
                        fontWeight="500"
                        fill="#000"
                        letterSpacing="-0.01em"
                      >
                        Tell me about your business in one paragraph.
                      </text>
                    </g>
                    {/* Input box (empty placeholder — message hasn't started) */}
                    <g
                      data-fx="slide-up"
                      data-fx-delay="0.55"
                      transform="translate(200,560)"
                    >
                      <rect
                        width="880"
                        height="64"
                        rx="28"
                        fill="#ffffff"
                        stroke="rgba(0,0,0,0.12)"
                        strokeWidth="1"
                      />
                      <text
                        x="32"
                        y="40"
                        fontFamily="Inter"
                        fontSize="15"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.40)"
                        letterSpacing="-0.01em"
                      >
                        Type a message…
                      </text>
                      <circle cx="836" cy="32" r="20" fill="rgba(0,0,0,0.18)" />
                      <text
                        x="836"
                        y="38"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="18"
                        fontWeight="700"
                        fill="#fff"
                      >
                        ↑
                      </text>
                    </g>
                    <text
                      x="640"
                      y="735"
                      textAnchor="middle"
                      fontFamily="Inter"
                      fontSize="13"
                      fontWeight="500"
                      fill="rgba(255,255,255,0.85)"
                    >
                      AllOnce greets you. Then asks one question.
                    </text>
                  </g>

                  {/* ───────── Scene 02 — Chat (user replies) ───────── */}
                  <g className="wf-scene" id="wf-s2" opacity="0">
                    {/* PERSISTENT (no data-fx) — avatar + both bot bubbles, identical to scene 1 */}
                    <g transform="translate(640,80)" textAnchor="middle">
                      <circle cy="0" r="22" fill="#000" />
                      <g fill="#fff">
                        <rect x="-9" y="-6" width="3" height="12" />
                        <rect x="-1.5" y="-10" width="3" height="20" />
                        <rect x="6" y="-4" width="3" height="8" />
                      </g>
                      <text
                        y="44"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.2"
                      >
                        AllOnce
                      </text>
                      <text
                        y="64"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.45)"
                        letterSpacing="0.06em"
                      >
                        active now
                      </text>
                    </g>
                    <g transform="translate(220,200)">
                      <rect
                        width="380"
                        height="58"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <text
                        x="24"
                        y="36"
                        fontFamily="Inter"
                        fontSize="15"
                        fontWeight="500"
                        fill="#000"
                        letterSpacing="-0.01em"
                      >
                        Welcome to AllOnce.
                      </text>
                    </g>
                    <g transform="translate(220,280)">
                      <rect
                        width="540"
                        height="58"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <text
                        x="24"
                        y="36"
                        fontFamily="Inter"
                        fontSize="15"
                        fontWeight="500"
                        fill="#000"
                        letterSpacing="-0.01em"
                      >
                        Tell me about your business in one paragraph.
                      </text>
                    </g>
                    {/* User bubble (right-aligned, slides in from right when typing completes) */}
                    <g
                      id="wf-s2-userbubble"
                      data-fx="slide-left"
                      data-fx-delay="0.58"
                      transform="translate(580,380)"
                    >
                      <rect width="500" height="58" rx="20" fill="#000" />
                      <text
                        x="24"
                        y="36"
                        fontFamily="Inter"
                        fontSize="15"
                        fontWeight="500"
                        fill="rgba(255,255,255,0.92)"
                        letterSpacing="-0.01em"
                      >
                        I run a coffee roaster. 200 customers.
                      </text>
                    </g>
                    {/* Delivered timestamp */}
                    <g data-fx="fade" data-fx-delay="0.78">
                      <text
                        x="1080"
                        y="462"
                        textAnchor="end"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="0.04em"
                      >
                        Delivered · Just now
                      </text>
                    </g>
                    {/* Input box (persistent — typing happens inside) */}
                    <g transform="translate(200,560)">
                      <rect
                        width="880"
                        height="64"
                        rx="28"
                        fill="#ffffff"
                        stroke="rgba(0,0,0,0.12)"
                        strokeWidth="1"
                      />
                      <text
                        id="wf-typed"
                        x="32"
                        y="40"
                        fontFamily="Inter"
                        fontSize="15"
                        fontWeight="500"
                        fill="#000"
                        letterSpacing="-0.01em"
                      ></text>
                      <rect
                        id="wf-caret"
                        x="36"
                        y="22"
                        width="2"
                        height="22"
                        fill="#000"
                      />
                      <circle cx="836" cy="32" r="20" fill="#000" />
                      <text
                        x="836"
                        y="38"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="18"
                        fontWeight="700"
                        fill="#fff"
                      >
                        ↑
                      </text>
                    </g>
                    <text
                      x="640"
                      y="735"
                      textAnchor="middle"
                      fontFamily="Inter"
                      fontSize="13"
                      fontWeight="500"
                      fill="rgba(255,255,255,0.85)"
                    >
                      You type. AllOnce reads.
                    </text>
                  </g>

                  {/* ───────── Scene 03 — Spawn (workspace assembling) ───────── */}
                  <g className="wf-scene" id="wf-s3" opacity="0">
                    {/* Header: mark + processing label */}
                    <g
                      data-fx="fade"
                      data-fx-delay="0.02"
                      transform="translate(640,120)"
                      textAnchor="middle"
                    >
                      <g transform="translate(-118,-4)" fill="#000">
                        <rect x="-9" y="-10" width="3" height="20" />
                        <rect x="-1.5" y="-14" width="3" height="28" />
                        <rect x="6" y="-7" width="3" height="14" />
                      </g>
                      <text
                        x="-98"
                        y="6"
                        fontFamily="Inter"
                        fontSize="22"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.4"
                        textAnchor="start"
                      >
                        Spawning workspace
                        <tspan fontSize="22" fill="rgba(0,0,0,0.40)">
                          …
                        </tspan>
                      </text>
                    </g>

                    {/* Module grid 3 × 2 — modules slide up, staggered */}
                    <g
                      data-fx="slide-up"
                      data-fx-delay="0.12"
                      transform="translate(160,210)"
                    >
                      <rect
                        width="280"
                        height="120"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <circle cx="40" cy="36" r="14" fill="#FF7A59" />
                      <text
                        x="40"
                        y="40"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="12"
                        fontWeight="700"
                        fill="#fff"
                        letterSpacing="-0.4"
                      >
                        H
                      </text>
                      <text
                        x="64"
                        y="42"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.2"
                      >
                        Customers
                      </text>
                      <text
                        x="22"
                        y="86"
                        fontFamily="Inter"
                        fontSize="30"
                        fontWeight="700"
                        fill="#000"
                        letterSpacing="-0.6"
                      >
                        200
                      </text>
                      <text
                        x="22"
                        y="104"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="0.02em"
                      >
                        imported · HubSpot
                      </text>
                    </g>
                    <g
                      data-fx="slide-up"
                      data-fx-delay="0.20"
                      transform="translate(500,210)"
                    >
                      <rect
                        width="280"
                        height="120"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <circle cx="40" cy="36" r="14" fill="#EA4335" />
                      <text
                        x="40"
                        y="40"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="12"
                        fontWeight="700"
                        fill="#fff"
                        letterSpacing="-0.4"
                      >
                        M
                      </text>
                      <text
                        x="64"
                        y="42"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.2"
                      >
                        Inbox
                      </text>
                      <text
                        x="22"
                        y="86"
                        fontFamily="Inter"
                        fontSize="30"
                        fontWeight="700"
                        fill="#000"
                        letterSpacing="-0.6"
                      >
                        12
                      </text>
                      <text
                        x="22"
                        y="104"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="0.02em"
                      >
                        unread · Gmail
                      </text>
                    </g>
                    <g
                      data-fx="slide-up"
                      data-fx-delay="0.28"
                      transform="translate(840,210)"
                    >
                      <rect
                        width="280"
                        height="120"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <circle cx="40" cy="36" r="14" fill="#2CA01C" />
                      <text
                        x="40"
                        y="40"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="10"
                        fontWeight="700"
                        fill="#fff"
                        letterSpacing="-0.4"
                      >
                        qb
                      </text>
                      <text
                        x="64"
                        y="42"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.2"
                      >
                        Books
                      </text>
                      <text
                        x="22"
                        y="86"
                        fontFamily="Inter"
                        fontSize="30"
                        fontWeight="700"
                        fill="#000"
                        letterSpacing="-0.6"
                      >
                        $48k
                      </text>
                      <text
                        x="22"
                        y="104"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="0.02em"
                      >
                        monthly · QuickBooks
                      </text>
                    </g>
                    <g
                      data-fx="slide-up"
                      data-fx-delay="0.36"
                      transform="translate(160,360)"
                    >
                      <rect
                        width="280"
                        height="120"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <circle cx="40" cy="36" r="14" fill="#5E6AD2" />
                      <text
                        x="40"
                        y="40"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="12"
                        fontWeight="700"
                        fill="#fff"
                        letterSpacing="-0.4"
                      >
                        L
                      </text>
                      <text
                        x="64"
                        y="42"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.2"
                      >
                        Tasks
                      </text>
                      <text
                        x="22"
                        y="86"
                        fontFamily="Inter"
                        fontSize="30"
                        fontWeight="700"
                        fill="#000"
                        letterSpacing="-0.6"
                      >
                        8
                      </text>
                      <text
                        x="22"
                        y="104"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="0.02em"
                      >
                        cycles · Linear
                      </text>
                    </g>
                    <g
                      data-fx="slide-up"
                      data-fx-delay="0.44"
                      transform="translate(500,360)"
                    >
                      <rect
                        width="280"
                        height="120"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <circle cx="40" cy="36" r="14" fill="#635BFF" />
                      <text
                        x="40"
                        y="40"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="12"
                        fontWeight="700"
                        fill="#fff"
                        letterSpacing="-0.4"
                      >
                        S
                      </text>
                      <text
                        x="64"
                        y="42"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.2"
                      >
                        Sales
                      </text>
                      <text
                        x="22"
                        y="86"
                        fontFamily="Inter"
                        fontSize="30"
                        fontWeight="700"
                        fill="#000"
                        letterSpacing="-0.6"
                      >
                        $23k
                      </text>
                      <text
                        x="22"
                        y="104"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="0.02em"
                      >
                        MRR · Stripe
                      </text>
                    </g>
                    <g
                      data-fx="slide-up"
                      data-fx-delay="0.52"
                      transform="translate(840,360)"
                    >
                      <rect
                        width="280"
                        height="120"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <circle cx="40" cy="36" r="14" fill="#000" />
                      <g fill="#fff">
                        <rect x="35" y="32" width="2" height="8" />
                        <rect x="39" y="30" width="2" height="12" />
                        <rect x="43" y="33" width="2" height="6" />
                      </g>
                      <text
                        x="64"
                        y="42"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.2"
                      >
                        Spaces
                      </text>
                      <text
                        x="22"
                        y="86"
                        fontFamily="Inter"
                        fontSize="30"
                        fontWeight="700"
                        fill="#000"
                        letterSpacing="-0.6"
                      >
                        3
                      </text>
                      <text
                        x="22"
                        y="104"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="0.02em"
                      >
                        workspaces · AllOnce
                      </text>
                    </g>

                    {/* Ready pill */}
                    <g
                      data-fx="fade"
                      data-fx-delay="0.65"
                      transform="translate(640,535)"
                      textAnchor="middle"
                    >
                      <rect
                        x="-105"
                        y="-22"
                        width="210"
                        height="44"
                        rx="20"
                        fill="#000"
                      />
                      <circle cx="-78" cy="0" r="4" fill="#28C840">
                        <animate
                          attributeName="opacity"
                          values="0.4;1;0.4"
                          dur="1.4s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <text
                        x="6"
                        y="5"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="13"
                        fontWeight="600"
                        fill="#fff"
                        letterSpacing="-0.2"
                      >
                        Workspace ready
                      </text>
                    </g>

                    <text
                      x="640"
                      y="735"
                      textAnchor="middle"
                      fontFamily="Inter"
                      fontSize="13"
                      fontWeight="500"
                      fill="rgba(255,255,255,0.85)"
                    >
                      AllOnce reads the brief and spawns a workspace.
                    </text>
                  </g>

                  {/* ───────── Scene 04 — Bridges (REDESIGNED: connection list) ───────── */}
                  <g className="wf-scene" id="wf-s4" opacity="0">
                    <g data-fx="fade" data-fx-delay="0.02">
                      <text
                        x="640"
                        y="100"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="600"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="2"
                      >
                        BRIDGES · CONNECTING TOOLS
                      </text>
                    </g>
                    {/* Hub stays at the SAME (640,200) position from Scene 03 — visual continuity */}
                    <g transform="translate(640,200)">
                      <circle r="36" fill="#000" />
                      <g fill="#fff">
                        <rect x="-13" y="-9" width="4" height="18" />
                        <rect x="-2" y="-15" width="4" height="30" />
                        <rect x="9" y="-7" width="4" height="14" />
                      </g>
                    </g>
                    {/* Vertical connection list, each row slides in from the right */}
                    <g transform="translate(340,278)">
                      <g
                        className="wf-tool"
                        data-i="0"
                        transform="translate(700,0)"
                      >
                        <rect
                          width="600"
                          height="46"
                          rx="14"
                          fill="rgba(255,255,255,0.45)"
                        />
                        <circle cx="24" cy="23" r="12" fill="#635BFF" />
                        <text
                          x="24"
                          y="27"
                          textAnchor="middle"
                          fontFamily="Inter"
                          fontSize="12"
                          fontWeight="700"
                          fill="#fff"
                          letterSpacing="-0.4"
                        >
                          S
                        </text>
                        <text
                          x="50"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="600"
                          fill="#000"
                        >
                          Stripe
                        </text>
                        <text
                          x="194"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="500"
                          fill="rgba(0,0,0,0.55)"
                        >
                          payments · subscriptions
                        </text>
                        <text
                          x="576"
                          y="28"
                          textAnchor="end"
                          fontFamily="Inter"
                          fontSize="12"
                          fill="#000"
                          fontWeight="500"
                        >
                          Connected ✓
                        </text>
                      </g>
                      <g
                        className="wf-tool"
                        data-i="1"
                        transform="translate(700,52)"
                      >
                        <rect
                          width="600"
                          height="46"
                          rx="14"
                          fill="rgba(255,255,255,0.45)"
                        />
                        <circle cx="24" cy="23" r="12" fill="#EA4335" />
                        <text
                          x="24"
                          y="27"
                          textAnchor="middle"
                          fontFamily="Inter"
                          fontSize="12"
                          fontWeight="700"
                          fill="#fff"
                          letterSpacing="-0.4"
                        >
                          M
                        </text>
                        <text
                          x="50"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="600"
                          fill="#000"
                        >
                          Gmail
                        </text>
                        <text
                          x="194"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="500"
                          fill="rgba(0,0,0,0.55)"
                        >
                          inbox · threads · drafts
                        </text>
                        <text
                          x="576"
                          y="28"
                          textAnchor="end"
                          fontFamily="Inter"
                          fontSize="12"
                          fill="#000"
                          fontWeight="500"
                        >
                          Connected ✓
                        </text>
                      </g>
                      <g
                        className="wf-tool"
                        data-i="2"
                        transform="translate(700,104)"
                      >
                        <rect
                          width="600"
                          height="46"
                          rx="14"
                          fill="rgba(255,255,255,0.45)"
                        />
                        <circle cx="24" cy="23" r="12" fill="#611F69" />
                        <text
                          x="24"
                          y="27"
                          textAnchor="middle"
                          fontFamily="Inter"
                          fontSize="12"
                          fontWeight="700"
                          fill="#fff"
                          letterSpacing="-0.4"
                        >
                          #
                        </text>
                        <text
                          x="50"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="600"
                          fill="#000"
                        >
                          Slack
                        </text>
                        <text
                          x="194"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="500"
                          fill="rgba(0,0,0,0.55)"
                        >
                          channels · DMs · alerts
                        </text>
                        <text
                          x="576"
                          y="28"
                          textAnchor="end"
                          fontFamily="Inter"
                          fontSize="12"
                          fill="#000"
                          fontWeight="500"
                        >
                          Connected ✓
                        </text>
                      </g>
                      <g
                        className="wf-tool"
                        data-i="3"
                        transform="translate(700,156)"
                      >
                        <rect
                          width="600"
                          height="46"
                          rx="14"
                          fill="rgba(255,255,255,0.45)"
                        />
                        <circle cx="24" cy="23" r="12" fill="#2CA01C" />
                        <text
                          x="24"
                          y="27"
                          textAnchor="middle"
                          fontFamily="Inter"
                          fontSize="10"
                          fontWeight="700"
                          fill="#fff"
                          letterSpacing="-0.4"
                        >
                          qb
                        </text>
                        <text
                          x="50"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="600"
                          fill="#000"
                        >
                          QuickBooks
                        </text>
                        <text
                          x="194"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="500"
                          fill="rgba(0,0,0,0.55)"
                        >
                          books · taxes · payroll
                        </text>
                        <text
                          x="576"
                          y="28"
                          textAnchor="end"
                          fontFamily="Inter"
                          fontSize="12"
                          fill="#000"
                          fontWeight="500"
                        >
                          Connected ✓
                        </text>
                      </g>
                      <g
                        className="wf-tool"
                        data-i="4"
                        transform="translate(700,208)"
                      >
                        <rect
                          width="600"
                          height="46"
                          rx="14"
                          fill="rgba(255,255,255,0.45)"
                        />
                        <circle cx="24" cy="23" r="12" fill="#000000" />
                        <text
                          x="24"
                          y="27"
                          textAnchor="middle"
                          fontFamily="Inter"
                          fontSize="12"
                          fontWeight="700"
                          fill="#fff"
                          letterSpacing="-0.4"
                        >
                          N
                        </text>
                        <text
                          x="50"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="600"
                          fill="#000"
                        >
                          Notion
                        </text>
                        <text
                          x="194"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="500"
                          fill="rgba(0,0,0,0.55)"
                        >
                          docs · wikis · sprints
                        </text>
                        <text
                          x="576"
                          y="28"
                          textAnchor="end"
                          fontFamily="Inter"
                          fontSize="12"
                          fill="#000"
                          fontWeight="500"
                        >
                          Connected ✓
                        </text>
                      </g>
                      <g
                        className="wf-tool"
                        data-i="5"
                        transform="translate(700,260)"
                      >
                        <rect
                          width="600"
                          height="46"
                          rx="14"
                          fill="rgba(255,255,255,0.45)"
                        />
                        <circle cx="24" cy="23" r="12" fill="#4353FF" />
                        <text
                          x="24"
                          y="27"
                          textAnchor="middle"
                          fontFamily="Inter"
                          fontSize="12"
                          fontWeight="700"
                          fill="#fff"
                          letterSpacing="-0.4"
                        >
                          W
                        </text>
                        <text
                          x="50"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="600"
                          fill="#000"
                        >
                          Webflow
                        </text>
                        <text
                          x="194"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="500"
                          fill="rgba(0,0,0,0.55)"
                        >
                          site · pages · CMS
                        </text>
                        <text
                          x="576"
                          y="28"
                          textAnchor="end"
                          fontFamily="Inter"
                          fontSize="12"
                          fill="#000"
                          fontWeight="500"
                        >
                          Connected ✓
                        </text>
                      </g>
                      <g
                        className="wf-tool"
                        data-i="6"
                        transform="translate(700,312)"
                      >
                        <rect
                          width="600"
                          height="46"
                          rx="14"
                          fill="rgba(255,255,255,0.45)"
                        />
                        <circle cx="24" cy="23" r="12" fill="#5E6AD2" />
                        <text
                          x="24"
                          y="27"
                          textAnchor="middle"
                          fontFamily="Inter"
                          fontSize="12"
                          fontWeight="700"
                          fill="#fff"
                          letterSpacing="-0.4"
                        >
                          L
                        </text>
                        <text
                          x="50"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="600"
                          fill="#000"
                        >
                          Linear
                        </text>
                        <text
                          x="194"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="500"
                          fill="rgba(0,0,0,0.55)"
                        >
                          issues · cycles · roadmap
                        </text>
                        <text
                          x="576"
                          y="28"
                          textAnchor="end"
                          fontFamily="Inter"
                          fontSize="12"
                          fill="#000"
                          fontWeight="500"
                        >
                          Connected ✓
                        </text>
                      </g>
                      <g
                        className="wf-tool"
                        data-i="7"
                        transform="translate(700,364)"
                      >
                        <rect
                          width="600"
                          height="46"
                          rx="14"
                          fill="rgba(255,255,255,0.45)"
                        />
                        <circle cx="24" cy="23" r="12" fill="#FF7A59" />
                        <text
                          x="24"
                          y="27"
                          textAnchor="middle"
                          fontFamily="Inter"
                          fontSize="12"
                          fontWeight="700"
                          fill="#fff"
                          letterSpacing="-0.4"
                        >
                          H
                        </text>
                        <text
                          x="50"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="600"
                          fill="#000"
                        >
                          HubSpot
                        </text>
                        <text
                          x="194"
                          y="28"
                          fontFamily="Inter"
                          fontSize="13"
                          fontWeight="500"
                          fill="rgba(0,0,0,0.55)"
                        >
                          CRM · deals · pipelines
                        </text>
                        <text
                          x="576"
                          y="28"
                          textAnchor="end"
                          fontFamily="Inter"
                          fontSize="12"
                          fill="#000"
                          fontWeight="500"
                        >
                          Connected ✓
                        </text>
                      </g>
                    </g>
                    <text
                      x="640"
                      y="735"
                      textAnchor="middle"
                      fontFamily="Inter"
                      fontSize="13"
                      fontWeight="500"
                      fill="rgba(255,255,255,0.85)"
                    >
                      Every tool you already pay for, wired in.
                    </text>
                  </g>

                  {/* ───────── Scene 05 — Brandbook (autonomous asset generation) ───────── */}
                  <g className="wf-scene" id="wf-s5b" opacity="0">
                    {/* Avatar header */}
                    <g
                      data-fx="pop"
                      data-fx-delay="0.02"
                      transform="translate(640,80)"
                      textAnchor="middle"
                    >
                      <circle cy="0" r="22" fill="#000" />
                      <g fill="#fff">
                        <rect x="-9" y="-6" width="3" height="12" />
                        <rect x="-1.5" y="-10" width="3" height="20" />
                        <rect x="6" y="-4" width="3" height="8" />
                      </g>
                      <text
                        y="44"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.2"
                      >
                        AllOnce
                      </text>
                      <text
                        y="64"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.45)"
                        letterSpacing="0.06em"
                      >
                        working autonomously
                      </text>
                    </g>

                    {/* User bubble (right): the prompt */}
                    <g
                      data-fx="slide-left"
                      data-fx-delay="0.10"
                      transform="translate(800,180)"
                    >
                      <rect width="280" height="50" rx="20" fill="#000" />
                      <text
                        x="20"
                        y="32"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="500"
                        fill="rgba(255,255,255,0.92)"
                        letterSpacing="-0.01em"
                      >
                        Create a brand book.
                      </text>
                    </g>

                    {/* Bot reply (left): caption + image card */}
                    <g
                      data-fx="slide-right"
                      data-fx-delay="0.32"
                      transform="translate(200,256)"
                    >
                      <rect
                        width="600"
                        height="50"
                        rx="20"
                        fill="rgba(255,255,255,0.6)"
                      />
                      <text
                        x="20"
                        y="32"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="500"
                        fill="#000"
                        letterSpacing="-0.01em"
                      >
                        Here&#39;s a brand book for your company.
                      </text>
                    </g>

                    {/* Image preview card (left, large) */}
                    <g
                      data-fx="slide-up"
                      data-fx-delay="0.46"
                      transform="translate(200,330)"
                    >
                      <rect width="660" height="240" rx="20" fill="#0A0A0A" />
                      <image
                        href="/images/brandbook-sample.jpg?v=2"
                        x="14"
                        y="14"
                        width="632"
                        height="212"
                        preserveAspectRatio="xMidYMid slice"
                      />
                      <rect
                        x="14"
                        y="14"
                        width="632"
                        height="212"
                        fill="none"
                        stroke="rgba(255,255,255,0.10)"
                        strokeWidth="1"
                      />
                    </g>

                    {/* Meta row under image */}
                    <g
                      data-fx="fade"
                      data-fx-delay="0.60"
                      transform="translate(200,588)"
                    >
                      <text
                        x="0"
                        y="0"
                        fontFamily="Inter"
                        fontSize="12"
                        fontWeight="600"
                        fill="rgba(0,0,0,0.65)"
                        letterSpacing="0.06em"
                      >
                        BRAND-GUIDELINES.PDF
                      </text>
                      <text
                        x="660"
                        y="0"
                        textAnchor="end"
                        fontFamily="Inter"
                        fontSize="12"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.50)"
                      >
                        32 pages · ready to download
                      </text>
                    </g>

                    {/* Status pill */}
                    <g
                      data-fx="fade"
                      data-fx-delay="0.72"
                      transform="translate(640,640)"
                      textAnchor="middle"
                    >
                      <rect
                        x="-130"
                        y="-22"
                        width="260"
                        height="44"
                        rx="20"
                        fill="#000"
                      />
                      <circle cx="-104" cy="0" r="4" fill="#28C840">
                        <animate
                          attributeName="opacity"
                          values="0.4;1;0.4"
                          dur="1.4s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <text
                        x="6"
                        y="5"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="13"
                        fontWeight="600"
                        fill="#fff"
                        letterSpacing="-0.2"
                      >
                        Brand assets generated
                      </text>
                    </g>

                    <text
                      x="640"
                      y="735"
                      textAnchor="middle"
                      fontFamily="Inter"
                      fontSize="13"
                      fontWeight="500"
                      fill="rgba(255,255,255,0.85)"
                    >
                      Run a prompt. AllOnce makes the assets.
                    </text>
                  </g>

                  {/* ───────── Scene 05 — Matrix ───────── */}
                  <g className="wf-scene" id="wf-s5" opacity="0">
                    <g
                      data-fx="slide-up"
                      data-fx-delay="0.05"
                      transform="translate(180,140)"
                    >
                      <rect
                        width="920"
                        height="500"
                        rx="28"
                        fill="rgba(255,255,255,0.45)"
                      />
                      <text
                        x="36"
                        y="46"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="600"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="2"
                      >
                        YOUR WORKSPACE — TODAY
                      </text>
                      <text
                        x="36"
                        y="78"
                        fontFamily="Inter"
                        fontSize="20"
                        fontWeight="600"
                        fill="#000"
                        letterSpacing="-0.4"
                      >
                        Everything you ran across fourteen tabs.
                      </text>
                      <g fontFamily="Inter">
                        <g transform="translate(36,120)">
                          <rect
                            width="270"
                            height="160"
                            rx="18"
                            fill="rgba(255,255,255,0.6)"
                          />
                          <text
                            x="22"
                            y="38"
                            fontSize="11"
                            fontWeight="600"
                            fill="rgba(0,0,0,0.55)"
                            letterSpacing="2"
                          >
                            MRR
                          </text>
                          <text
                            x="22"
                            y="92"
                            fontSize="40"
                            fontWeight="600"
                            fill="#000"
                            letterSpacing="-1.5"
                            data-tick="48200"
                            data-prefix="$"
                            data-digits="0"
                          >
                            $0
                          </text>
                          <text
                            x="22"
                            y="128"
                            fontSize="13"
                            fill="rgba(0,0,0,0.55)"
                          >
                            ▲ 12.4% mo/mo
                          </text>
                        </g>
                        <g transform="translate(326,120)">
                          <rect
                            width="270"
                            height="160"
                            rx="18"
                            fill="rgba(255,255,255,0.6)"
                          />
                          <text
                            x="22"
                            y="38"
                            fontSize="11"
                            fontWeight="600"
                            fill="rgba(0,0,0,0.55)"
                            letterSpacing="2"
                          >
                            CUSTOMERS
                          </text>
                          <text
                            x="22"
                            y="92"
                            fontSize="40"
                            fontWeight="600"
                            fill="#000"
                            letterSpacing="-1.5"
                            data-tick="1284"
                            data-digits="0"
                          >
                            0
                          </text>
                          <text
                            x="22"
                            y="128"
                            fontSize="13"
                            fill="rgba(0,0,0,0.55)"
                          >
                            ▲ 87 this week
                          </text>
                        </g>
                        <g transform="translate(616,120)">
                          <rect
                            width="270"
                            height="160"
                            rx="18"
                            fill="rgba(255,255,255,0.6)"
                          />
                          <text
                            x="22"
                            y="38"
                            fontSize="11"
                            fontWeight="600"
                            fill="rgba(0,0,0,0.55)"
                            letterSpacing="2"
                          >
                            RUNWAY
                          </text>
                          <text
                            x="22"
                            y="92"
                            fontSize="40"
                            fontWeight="600"
                            fill="#000"
                            letterSpacing="-1.5"
                            data-tick="14"
                            data-suffix=" mo"
                            data-digits="0"
                          >
                            0 mo
                          </text>
                          <text
                            x="22"
                            y="128"
                            fontSize="13"
                            fill="rgba(0,0,0,0.55)"
                          >
                            stable
                          </text>
                        </g>
                        <g transform="translate(36,300)">
                          <rect
                            width="270"
                            height="160"
                            rx="18"
                            fill="rgba(255,255,255,0.6)"
                          />
                          <text
                            x="22"
                            y="38"
                            fontSize="11"
                            fontWeight="600"
                            fill="rgba(0,0,0,0.55)"
                            letterSpacing="2"
                          >
                            PIPELINE
                          </text>
                          <text
                            x="22"
                            y="92"
                            fontSize="40"
                            fontWeight="600"
                            fill="#000"
                            letterSpacing="-1.5"
                            data-tick="96400"
                            data-prefix="$"
                            data-digits="0"
                          >
                            $0
                          </text>
                          <polyline
                            points="22,142 60,130 100,134 140,118 180,122 220,108 248,98"
                            fill="none"
                            stroke="#000"
                            strokeWidth="1.5"
                          />
                        </g>
                        <g transform="translate(326,300)">
                          <rect
                            width="270"
                            height="160"
                            rx="18"
                            fill="rgba(255,255,255,0.6)"
                          />
                          <text
                            x="22"
                            y="38"
                            fontSize="11"
                            fontWeight="600"
                            fill="rgba(0,0,0,0.55)"
                            letterSpacing="2"
                          >
                            TASKS DUE
                          </text>
                          <text
                            x="22"
                            y="92"
                            fontSize="40"
                            fontWeight="600"
                            fill="#000"
                            letterSpacing="-1.5"
                            data-tick="9"
                            data-digits="0"
                          >
                            0
                          </text>
                          <text
                            x="22"
                            y="128"
                            fontSize="13"
                            fill="rgba(0,0,0,0.55)"
                          >
                            3 overdue
                          </text>
                        </g>
                        <g transform="translate(616,300)">
                          <rect
                            width="270"
                            height="160"
                            rx="18"
                            fill="rgba(255,255,255,0.6)"
                          />
                          <text
                            x="22"
                            y="38"
                            fontSize="11"
                            fontWeight="600"
                            fill="rgba(0,0,0,0.55)"
                            letterSpacing="2"
                          >
                            CASH
                          </text>
                          <text
                            x="22"
                            y="92"
                            fontSize="40"
                            fontWeight="600"
                            fill="#000"
                            letterSpacing="-1.5"
                            data-tick="312000"
                            data-prefix="$"
                            data-digits="0"
                          >
                            $0
                          </text>
                          <text
                            x="22"
                            y="128"
                            fontSize="13"
                            fill="rgba(0,0,0,0.55)"
                          >
                            2 accounts
                          </text>
                        </g>
                      </g>
                    </g>
                    <text
                      x="640"
                      y="735"
                      textAnchor="middle"
                      fontFamily="Inter"
                      fontSize="13"
                      fontWeight="500"
                      fill="rgba(255,255,255,0.85)"
                    >
                      Every metric, in one unblinking view.
                    </text>
                  </g>

                  {/* ───────── Scene 06 — Decisions ───────── */}
                  <g className="wf-scene" id="wf-s6" opacity="0">
                    <g data-fx="fade" data-fx-delay="0.02">
                      <text
                        x="640"
                        y="120"
                        textAnchor="middle"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="600"
                        fill="rgba(0,0,0,0.55)"
                        letterSpacing="2"
                      >
                        3 NEW · ALLONCE
                      </text>
                    </g>
                    <g
                      transform="translate(340,180)"
                      className="wf-notif"
                      data-i="0"
                    >
                      <rect
                        width="600"
                        height="78"
                        rx="18"
                        fill="rgba(255,255,255,0.45)"
                      />
                      <circle cx="40" cy="39" r="14" fill="#635BFF" />
                      <text
                        x="40"
                        y="44"
                        fontFamily="Inter"
                        fontSize="13"
                        fontWeight="700"
                        fill="#fff"
                        textAnchor="middle"
                        letterSpacing="-0.4"
                      >
                        S
                      </text>
                      <text
                        x="76"
                        y="34"
                        fontFamily="Inter"
                        fontSize="13"
                        fontWeight="600"
                        fill="#000"
                      >
                        Stripe
                      </text>
                      <text
                        x="76"
                        y="56"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="500"
                        fill="#000"
                        letterSpacing="-0.01em"
                      >
                        New customer · coffee@acme.com · $48 / mo
                      </text>
                      <text
                        x="576"
                        y="34"
                        textAnchor="end"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.5)"
                      >
                        just now
                      </text>
                    </g>
                    <g
                      transform="translate(340,290)"
                      className="wf-notif"
                      data-i="1"
                    >
                      <rect
                        width="600"
                        height="78"
                        rx="18"
                        fill="rgba(255,255,255,0.45)"
                      />
                      <circle cx="40" cy="39" r="14" fill="#EA4335" />
                      <text
                        x="40"
                        y="44"
                        fontFamily="Inter"
                        fontSize="13"
                        fontWeight="700"
                        fill="#fff"
                        textAnchor="middle"
                        letterSpacing="-0.4"
                      >
                        M
                      </text>
                      <text
                        x="76"
                        y="34"
                        fontFamily="Inter"
                        fontSize="13"
                        fontWeight="600"
                        fill="#000"
                      >
                        Gmail
                      </text>
                      <text
                        x="76"
                        y="56"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="500"
                        fill="#000"
                        letterSpacing="-0.01em"
                      >
                        Reply: "send the proposal" — closing tomorrow
                      </text>
                      <text
                        x="576"
                        y="34"
                        textAnchor="end"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.5)"
                      >
                        2m
                      </text>
                    </g>
                    <g
                      transform="translate(340,400)"
                      className="wf-notif"
                      data-i="2"
                    >
                      <rect
                        width="600"
                        height="78"
                        rx="18"
                        fill="rgba(255,255,255,0.45)"
                      />
                      <circle cx="40" cy="39" r="14" fill="#0A0A0A" />
                      <text
                        x="40"
                        y="44"
                        fontFamily="Inter"
                        fontSize="13"
                        fontWeight="700"
                        fill="#fff"
                        textAnchor="middle"
                        letterSpacing="-0.4"
                      >
                        !
                      </text>
                      <text
                        x="76"
                        y="34"
                        fontFamily="Inter"
                        fontSize="13"
                        fontWeight="600"
                        fill="#000"
                      >
                        Runway
                      </text>
                      <text
                        x="76"
                        y="56"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="500"
                        fill="#000"
                        letterSpacing="-0.01em"
                      >
                        Cash extended to 16 months · update saved
                      </text>
                      <text
                        x="576"
                        y="34"
                        textAnchor="end"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(0,0,0,0.5)"
                      >
                        5m
                      </text>
                    </g>
                    <g
                      transform="translate(340,510)"
                      className="wf-notif"
                      data-i="3"
                    >
                      <rect width="600" height="78" rx="18" fill="#000" />
                      <circle cx="40" cy="39" r="14" fill="#000" />
                      <g fill="#fff">
                        <rect x="35" y="35" width="2" height="8" />
                        <rect x="39" y="33" width="2" height="12" />
                        <rect x="43" y="36" width="2" height="6" />
                      </g>
                      <text
                        x="76"
                        y="34"
                        fontFamily="Inter"
                        fontSize="13"
                        fontWeight="600"
                        fill="#ffffff"
                      >
                        AllOnce
                      </text>
                      <text
                        x="76"
                        y="56"
                        fontFamily="Inter"
                        fontSize="14"
                        fontWeight="500"
                        fill="#ffffff"
                        letterSpacing="-0.01em"
                      >
                        3 things settled while you slept. Want a summary?
                      </text>
                      <text
                        x="576"
                        y="34"
                        textAnchor="end"
                        fontFamily="Inter"
                        fontSize="11"
                        fontWeight="500"
                        fill="rgba(255,255,255,0.45)"
                      >
                        now
                      </text>
                    </g>
                    <text
                      x="640"
                      y="735"
                      textAnchor="middle"
                      fontFamily="Inter"
                      fontSize="13"
                      fontWeight="500"
                      fill="rgba(255,255,255,0.85)"
                    >
                      Decisions arrive. The workspace handles them.
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          </section>
          <section
            className="ig-section"
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "1px 900px",
            }}
          >
            <div className="ig-wordmark-block">
              <div className="ig-wordmark">
                <img
                  src="/images/logo.svg"
                  alt="AllOnce"
                  className="ig-wordmark-svg"
                />
              </div>
              <div className="ig-wordmark-meta">
                <span>Run your business — all at once</span>
                <span>Allone Labs · 2026 —</span>
              </div>
            </div>

            <div className="ig-marquee" aria-hidden="true">
              <div className="ig-marquee-track">
                <span className="ig-tag">Spawn</span>
                <span className="ig-dot"></span>
                <span className="ig-tag ig-tag--ghost">Evolve</span>
                <span className="ig-dot"></span>
                <span className="ig-tag">Orchestrate</span>
                <span className="ig-dot"></span>
                <span className="ig-tag ig-tag--ghost">Matrix</span>
                <span className="ig-dot"></span>
                <span className="ig-tag">Bridges</span>
                <span className="ig-dot"></span>
                <span className="ig-tag ig-tag--ghost">
                  Run your business all at once
                </span>
                <span className="ig-dot"></span>
                {/* duplicate for seamless loop */}
                <span className="ig-tag">Spawn</span>
                <span className="ig-dot"></span>
                <span className="ig-tag ig-tag--ghost">Evolve</span>
                <span className="ig-dot"></span>
                <span className="ig-tag">Orchestrate</span>
                <span className="ig-dot"></span>
                <span className="ig-tag ig-tag--ghost">Matrix</span>
                <span className="ig-dot"></span>
                <span className="ig-tag">Bridges</span>
                <span className="ig-dot"></span>
                <span className="ig-tag ig-tag--ghost">
                  Run your business all at once
                </span>
                <span className="ig-dot"></span>
              </div>
            </div>
          </section>

          <section
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "1px 900px",
            }}
          >
            <section className="overflow-hidden">
              <div
                className="grid grid-cols-12 max-sm:grid-cols-4 sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 items-[last_baseline]"
                style={{ opacity: "1", transform: "none" }}
              >
                <span className="col-span-1 max-sm:hidden sm:max-lg:hidden flex flex-col text-left self-end [&>span]:block block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none lg:max-dt:text-[clamp(9px,0.8vw+0.8px,11px)] dt:text-sm">
                  <span>Types of</span>
                  <span>Activities</span>
                </span>
                <h2 className="col-[3/6] max-sm:col-[1/5] sm:col-[1/5] lg:col-[3/6] font-medium text-[clamp(46px,3.462vw-2.46px,64px)] leading-[80%] tracking-[-0.06em] text-[#c5c5c5] max-sm:text-[clamp(28px,8vw,36px)] lg:max-dt:text-[clamp(32px,3.733vw-6.22px,46px)] dt:text-[clamp(46px,3.462vw-2.46px,64px)]">
                  What we do
                </h2>
              </div>
              <div className="grid grid-cols-12 max-sm:grid-cols-4 sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 max-sm:mt-6 mt-[50px] items-start">
                <div className="col-[3/-1] max-sm:col-[1/-1] sm:col-[1/-1] lg:col-[3/-1] overflow-hidden">
                  <div
                    className="flex gap-5 transition-transform duration-500 ease-in-out select-none will-change-transform cursor-grab active:cursor-grabbing"
                    style={{
                      transform: "translateX(0px)",
                      touchAction: "pan-y",
                    }}
                  >
                    <div
                      className="shrink-0 overflow-hidden"
                      style={{
                        width: "455px",
                        opacity: "1",
                        transform: "none",
                      }}
                    >
                      <div
                        className="group rounded-none flex flex-col items-center relative overflow-hidden w-full h-[clamp(390px,28.846vw-13.85px,540px)]  max-sm:h-[580px] max-sm:min-h-[280px] max-lg:h-auto max-lg:aspect-[3/4]  lg:max-dt:h-[clamp(374px,39.467vw-30.2px,522px)]"
                        role="button"
                        tabIndex={0}
                        aria-label="Open Evolve details"
                      >
                        <picture className="absolute inset-0 w-full h-full -z-1 transition-transform duration-[0.6s] ease-in-out group-hover:scale-[1.03]">
                          <img
                            src="/images/card-evolve.svg"
                            alt=""
                            className="w-full h-full object-cover"
                            draggable="false"
                          />
                        </picture>
                        <img
                          alt=""
                          draggable="false"
                          loading="eager"
                          width="64"
                          height="64"
                          decoding="async"
                          data-nimg="1"
                          className="mt-[clamp(43px,3.269vw-2.77px,60px)] relative z-1 select-none pointer-events-none w-auto h-auto max-w-[4rem]"
                          style={{ color: "transparent" }}
                          src="/images/img-8.svg"
                        />
                        <h3 className="mt-[clamp(22px,1.538vw-1.54px,30px)] font-medium text-[clamp(29px,2.115vw-0.61px,40px)] leading-[100%] tracking-[-0.06em] text-white relative z-1 pointer-events-none">
                          Evolve
                        </h3>
                      </div>
                    </div>
                    <div
                      className="shrink-0 overflow-hidden"
                      style={{
                        width: "455px",
                        opacity: "1",
                        transform: "none",
                      }}
                    >
                      <div
                        className="group rounded-none flex flex-col items-center relative overflow-hidden w-full h-[clamp(390px,28.846vw-13.85px,540px)]  max-sm:h-[580px] max-sm:min-h-[280px] max-lg:h-auto max-lg:aspect-[3/4]  lg:max-dt:h-[clamp(374px,39.467vw-30.2px,522px)]"
                        role="button"
                        tabIndex={0}
                        aria-label="Open Orchestrate details"
                      >
                        <picture className="absolute inset-0 w-full h-full -z-1 transition-transform duration-[0.6s] ease-in-out group-hover:scale-[1.03]">
                          <img
                            src="/images/card-orchestrate.svg"
                            alt=""
                            className="w-full h-full object-cover"
                            draggable="false"
                          />
                        </picture>
                        <img
                          alt=""
                          draggable="false"
                          loading="eager"
                          width="64"
                          height="64"
                          decoding="async"
                          data-nimg="1"
                          className="mt-[clamp(43px,3.269vw-2.77px,60px)] relative z-1 select-none pointer-events-none w-auto h-auto max-w-[4rem]"
                          style={{ color: "transparent" }}
                          src="/images/img-8.svg"
                        />
                        <h3 className="mt-[clamp(22px,1.538vw-1.54px,30px)] font-medium text-[clamp(29px,2.115vw-0.61px,40px)] leading-[100%] tracking-[-0.06em] text-white relative z-1 pointer-events-none">
                          Orchestrate
                        </h3>
                      </div>
                    </div>
                    <div
                      className="shrink-0 overflow-hidden"
                      style={{
                        width: "455px",
                        opacity: "1",
                        transform: "none",
                      }}
                    >
                      <div
                        className="group rounded-none flex flex-col items-center relative overflow-hidden w-full h-[clamp(390px,28.846vw-13.85px,540px)]  max-sm:h-[580px] max-sm:min-h-[280px] max-lg:h-auto max-lg:aspect-[3/4]  lg:max-dt:h-[clamp(374px,39.467vw-30.2px,522px)]"
                        role="button"
                        tabIndex={0}
                        aria-label="Open Spawn details"
                      >
                        <picture className="absolute inset-0 w-full h-full -z-1 transition-transform duration-[0.6s] ease-in-out group-hover:scale-[1.03]">
                          <img
                            src="/images/card-spawn.svg"
                            alt=""
                            className="w-full h-full object-cover"
                            draggable="false"
                          />
                        </picture>
                        <img
                          alt=""
                          draggable="false"
                          loading="eager"
                          width="64"
                          height="64"
                          decoding="async"
                          data-nimg="1"
                          className="mt-[clamp(43px,3.269vw-2.77px,60px)] relative z-1 select-none pointer-events-none w-auto h-auto max-w-[4rem]"
                          style={{ color: "transparent" }}
                          src="/images/img-8.svg"
                          data-xray-broken-svg="/images/img-60.svg"
                        />
                        <h3 className="mt-[clamp(22px,1.538vw-1.54px,30px)] font-medium text-[clamp(29px,2.115vw-0.61px,40px)] leading-[100%] tracking-[-0.06em] text-white relative z-1 pointer-events-none">
                          Spawn
                        </h3>
                      </div>
                    </div>
                    <div
                      className="shrink-0 overflow-hidden"
                      style={{
                        width: "455px",
                        opacity: "1",
                        transform: "none",
                      }}
                    >
                      <div
                        className="group rounded-none flex flex-col items-center relative overflow-hidden w-full h-[clamp(390px,28.846vw-13.85px,540px)]  max-sm:h-[580px] max-sm:min-h-[280px] max-lg:h-auto max-lg:aspect-[3/4]  lg:max-dt:h-[clamp(374px,39.467vw-30.2px,522px)]"
                        role="button"
                        tabIndex={0}
                        aria-label="Open Bridges details"
                      >
                        <picture className="absolute inset-0 w-full h-full -z-1 transition-transform duration-[0.6s] ease-in-out group-hover:scale-[1.03]">
                          <img
                            src="/images/card-bridges.svg"
                            alt=""
                            className="w-full h-full object-cover"
                            draggable="false"
                          />
                        </picture>
                        <img
                          alt=""
                          draggable="false"
                          loading="eager"
                          width="64"
                          height="64"
                          decoding="async"
                          data-nimg="1"
                          className="mt-[clamp(43px,3.269vw-2.77px,60px)] relative z-1 select-none pointer-events-none w-auto h-auto max-w-[4rem]"
                          style={{ color: "transparent" }}
                          src="/images/img-8.svg"
                          data-xray-broken-svg="/images/img-60.svg"
                        />
                        <h3 className="mt-[clamp(22px,1.538vw-1.54px,30px)] font-medium text-[clamp(29px,2.115vw-0.61px,40px)] leading-[100%] tracking-[-0.06em] text-white relative z-1 pointer-events-none">
                          Bridges
                        </h3>
                      </div>
                    </div>
                    <div
                      className="shrink-0 overflow-hidden"
                      style={{
                        width: "455px",
                        opacity: "1",
                        transform: "none",
                      }}
                    >
                      <div
                        className="group rounded-none flex flex-col items-center relative overflow-hidden w-full h-[clamp(390px,28.846vw-13.85px,540px)]  max-sm:h-[580px] max-sm:min-h-[280px] max-lg:h-auto max-lg:aspect-[3/4]  lg:max-dt:h-[clamp(374px,39.467vw-30.2px,522px)]"
                        role="button"
                        tabIndex={0}
                        aria-label="Open Matrix details"
                      >
                        <picture className="absolute inset-0 w-full h-full -z-1 transition-transform duration-[0.6s] ease-in-out group-hover:scale-[1.03]">
                          <img
                            src="/images/card-matrix.svg"
                            alt=""
                            className="w-full h-full object-cover"
                            draggable="false"
                          />
                        </picture>
                        <img
                          alt=""
                          draggable="false"
                          loading="eager"
                          width="64"
                          height="64"
                          decoding="async"
                          data-nimg="1"
                          className="mt-[clamp(43px,3.269vw-2.77px,60px)] relative z-1 select-none pointer-events-none w-auto h-auto max-w-[4rem]"
                          style={{ color: "transparent" }}
                          src="/images/img-8.svg"
                          data-xray-broken-svg="/images/img-60.svg"
                        />
                        <h3 className="mt-[clamp(22px,1.538vw-1.54px,30px)] font-medium text-[clamp(29px,2.115vw-0.61px,40px)] leading-[100%] tracking-[-0.06em] text-white relative z-1 pointer-events-none">
                          Matrix
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-12 max-sm:grid-cols-4 sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 max-sm:mt-8 mt-[70px] items-start">
                <div className="col-span-4 max-sm:col-span-2 sm:col-[1/2] lg:col-[3/5] flex gap-2">
                  <button
                    type="button"
                    aria-label="Previous slide"
                    className="group w-[clamp(60px,12vw,86px)] max-sm:w-[60px] lg:w-[86px] h-14 rounded-full bg-[rgba(197,197,197,0.15)] border-none outline-none cursor-pointer flex justify-center items-center relative overflow-hidden transition-all duration-300 z-1 hover:animate-[rotate_0.7s_ease-in-out_both] [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:pointer-events-none [&>span]:group-hover:animate-[storm_0.7s_ease-in-out_both] [&>span]:group-hover:[animation-delay:0.06s]"
                  >
                    <span>
                      <img
                        alt="Previous"
                        loading="eager"
                        width="32"
                        height="32"
                        decoding="async"
                        data-nimg="1"
                        className="block z-2 transition-[filter] duration-300 w-6 h-6 lg:w-8 lg:h-8"
                        style={{ color: "transparent" }}
                        src="/images/img-13.svg"
                      />
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Next slide"
                    className="group w-[clamp(60px,12vw,86px)] max-sm:w-[60px] lg:w-[86px] h-14 rounded-full bg-[rgba(197,197,197,0.15)] border-none outline-none cursor-pointer flex justify-center items-center relative overflow-hidden transition-all duration-300 z-1 hover:animate-[rotate_0.7s_ease-in-out_both] [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:pointer-events-none [&>span]:group-hover:animate-[storm_0.7s_ease-in-out_both] [&>span]:group-hover:[animation-delay:0.06s]"
                  >
                    <span>
                      <img
                        alt="Next"
                        loading="eager"
                        width="32"
                        height="32"
                        decoding="async"
                        data-nimg="1"
                        className="block z-2 transition-[filter] duration-300 w-6 h-6 lg:w-8 lg:h-8"
                        style={{ color: "transparent" }}
                        src="/images/img-14.svg"
                      />
                    </span>
                  </button>
                </div>
                <div className="col-[2/5] md:col-[3/5] lg:col-[6/11] xl:col-[6/9] max-sm:row-start-2">
                  <p className="font-medium text-xl leading-[100%] tracking-[-0.03em] text-[#c5c5c5] opacity-70 max-sm:text-base">
                    <span className="inline-block  w-[35%] lg:w-[25%] xl:w-[35%] "></span>
                    Operators don’t need another tool. They need a destination
                    at the end of the morning commute.
                  </p>
                  <p className="mt-[30px] max-sm:mt-4  ml-[35%]  lg:ml-[25%]  xl:ml-[35%]  max-sm:ml-0  font-medium text-sm leading-[120%] tracking-[-0.03em] text-[rgba(197,197,197,0.4)]">
                    AllOnce is the screen where every customer, every dollar,
                    every team member, and every decision lives — in one window,
                    generated specifically for the business it serves.
                  </p>
                </div>
              </div>
            </section>
          </section>
          <section
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "1px 200px",
            }}
          >
            <section className="py-5">
              <div
                className="flex items-center gap-2.5"
                style={{ opacity: "1", transform: "none" }}
              >
                <img
                  alt="X"
                  loading="eager"
                  width="24"
                  height="24"
                  decoding="async"
                  data-nimg="1"
                  className="shrink-0 block"
                  style={{ color: "transparent" }}
                  src="/images/img-6.svg"
                />
                <div className="flex-1 relative h-[200px] cursor-pointer">
                  <svg
                    viewBox="0 0 100 200"
                    preserveAspectRatio="none"
                    className="w-full h-[200px] absolute top-0 left-0"
                  >
                    <path
                      d="M 0 100 Q 50 100 100 100"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="2"
                      fill="none"
                    ></path>
                  </svg>
                </div>
              </div>
            </section>
          </section>
          <section
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "1px 900px",
            }}
          >
            <section className="relative">
              <div className="grid grid-cols-12 max-sm:grid-cols-1 sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 items-start">
                <div
                  className="col-span-1 max-sm:hidden sm:max-lg:hidden flex flex-col text-left [&>span]:block block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none lg:max-dt:text-[clamp(9px,0.8vw+0.8px,11px)] dt:text-sm"
                  style={{ opacity: "1", transform: "none" }}
                >
                  <span>About</span>
                  <span>AllOnce</span>
                </div>
                <div className="col-[3/5] max-sm:col-span-1 sm:col-[1/3] lg:col-[3/5]">
                  <div className="" style={{ opacity: "1", transform: "none" }}>
                    <div
                      className="glitch-wrapper "
                      style={{ position: "relative" }}
                    >
                      <div style={{ position: "relative", zIndex: "1" }}>
                        <img
                          alt="AllOnce"
                          loading="eager"
                          width="195"
                          height="54"
                          decoding="async"
                          data-nimg="1"
                          className="block w-[296px] h-[82px] max-sm:w-[180px] max-sm:h-[50px] sm:w-[200px] sm:h-[55px] lg:w-[200px] lg:h-[55px]"
                          style={{ color: "transparent" }}
                          src="/images/img-0.svg"
                        />
                      </div>
                    </div>
                  </div>
                  <p
                    className="mt-[30px] max-sm:mt-4 max-sm:text-sm sm:mt-[20px] lg:mt-[20px] font-medium text-base leading-[120%] tracking-[-0.03em] text-[rgba(197,197,197,0.4)] lg:max-dt:text-[clamp(14px,0.8vw+0.8px,18px)] sm:max-dt:text-[clamp(14px,2.133vw-3.84px,16px)] dt:text-sm"
                    style={{ opacity: "1", transform: "none" }}
                  >
                    Quietly inevitable. <br />
                    Crafted, editorial, lively. <br />
                    Made for operators.
                  </p>
                </div>
                <div className="col-[11/12] max-sm:col-start-4 max-sm:col-span-1 max-sm:mt-4 flex flex-col">
                  <div
                    className="text-left [&>span]:block block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none text-[clamp(11px, 0.8vw + 0.8px, 11px)] lg:max-dt:text-[clamp(9px,0.8vw+0.8px,11px)] dt:text-sm"
                    style={{ opacity: "1", transform: "none" }}
                  >
                    <span>Compiling operator</span>
                    <span>workspaces</span>
                  </div>
                  <div
                    className="text-right [&>span]:block block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none text-[clamp(11px, 0.8vw + 0.8px, 11px)] lg:max-dt:text-[clamp(9px,0.8vw+0.8px,11px)] dt:text-sm"
                    style={{ opacity: "1", transform: "none" }}
                  >
                    <span>since —</span>
                    <span>2024</span>
                  </div>
                </div>
              </div>
              <div
                className=""
                style={{
                  perspective: "800px",
                  marginTop: "-100px",
                  opacity: "1",
                  transform: "none",
                }}
              >
                <div
                  className="flex justify-center items-center relative max-sm:scale-[0.8] sm:scale-100 max-sm:-my-20"
                  style={{
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                    transform: "none",
                  }}
                >
                  <div
                    style={{
                      width: "482px",
                      height: "600px",
                      visibility: "hidden",
                    }}
                  ></div>
                  <img
                    src="/images/img-15.svg"
                    alt=""
                    className="blur-[30px]"
                    style={{
                      position: "absolute",
                      inset: "0px",
                      margin: "auto",
                      display: "block",
                      zIndex: "auto",
                      transform: "none",
                    }}
                  />
                  <img
                    src="/images/img-15.svg"
                    alt=""
                    style={{
                      position: "absolute",
                      inset: "0px",
                      margin: "auto",
                      display: "block",
                      zIndex: "auto",
                      transform: "none",
                    }}
                  />
                  <img
                    src="/images/img-16.svg"
                    alt=""
                    style={{
                      position: "absolute",
                      inset: "0px",
                      margin: "auto",
                      display: "block",
                      zIndex: "auto",
                      transform: "none",
                    }}
                  />
                  <img
                    src="/images/img-17.svg"
                    alt=""
                    style={{
                      position: "absolute",
                      inset: "0px",
                      margin: "auto",
                      display: "block",
                      zIndex: "auto",
                      transform: "none",
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 max-sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 max-sm:mt-10">
                <p
                  className="col-span-4 max-sm:col-start-2 max-sm:col-span-3 sm:col-[2/5] lg:col-[8/12] font-medium text-[clamp(26px,1.923vw-0.92px,36px)] leading-[100%] tracking-[-0.03em] text-[#c5c5c5] max-sm:text-[clamp(18px,5vw,22px)] lg:max-dt:text-[clamp(18px,2.133vw-3.84px,26px)] dt:text-[clamp(26px,1.923vw-0.92px,36px)]"
                  style={{ opacity: "1", transform: "none" }}
                >
                  <span className="max-sm:pl-[calc((100%+12px)/3)] pl-[calc((100%+20px)/4)] sm:pl-[calc((100%+20px)/3)] lg:pl-[calc((100%+20px)/4)]">
                    Production-grade operator surface
                  </span>{" "}
                  for SMBs who want one window instead of fourteen tabs
                </p>
                <p
                  className="col-span-4 max-sm:col-start-2 max-sm:col-span-3 sm:col-[3/5] lg:col-[9/12] mt-[30px] max-sm:mt-4 max-sm:text-sm sm:mt-[10px] font-medium text-base leading-[120%] tracking-[-0.03em] text-[rgba(197,197,197,0.4)] text-[clamp(16px, 0.8vw + 0.8px, 16px)] lg:max-dt:text-[clamp(12px,0.8vw+0.8px,11px)] dt:text-md"
                  style={{ opacity: "1", transform: "none" }}
                >
                  Built by Allone Labs. AllOnce gives operators one window; the
                  spawn engine builds the business behind it. One product, one
                  thesis: running a real business should feel like flying, not
                  paperwork.
                </p>
              </div>
            </section>
          </section>
          <section
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "1px 200px",
            }}
          >
            <section className="py-5">
              <div
                className="flex items-center gap-2.5"
                style={{ opacity: "1", transform: "none" }}
              >
                <img
                  alt="X"
                  loading="eager"
                  width="24"
                  height="24"
                  decoding="async"
                  data-nimg="1"
                  className="shrink-0 block"
                  style={{ color: "transparent" }}
                  src="/images/img-6.svg"
                />
                <div className="flex-1 relative h-[200px] cursor-pointer">
                  <svg
                    viewBox="0 0 100 200"
                    preserveAspectRatio="none"
                    className="w-full h-[200px] absolute top-0 left-0"
                  >
                    <path
                      d="M 0 100 Q 50 100 100 100"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="2"
                      fill="none"
                    ></path>
                  </svg>
                </div>
              </div>
            </section>
          </section>
          <section
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "1px 1200px",
            }}
          >
            <footer className="pb-10">
              <div className="grid grid-cols-12 max-sm:grid-cols-4 sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 items-center">
                <div
                  className="col-span-1"
                  style={{ opacity: "1", transform: "none" }}
                >
                  <div
                    className=""
                    style={{ position: "relative", transform: "none" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <img
                        alt=""
                        loading="eager"
                        width="32"
                        height="32"
                        decoding="async"
                        data-nimg="1"
                        className="opacity-60"
                        style={{ color: "transparent" }}
                        src="/images/img-18.svg"
                      />
                      <span className="block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none lg:max-dt:text-[clamp(9px,0.8vw+0.8px,11px)] dt:text-sm text-left [&>span]:block">
                        <span>EST.</span>
                        <span>2024</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className="col-[4/5] sm:col-[3/4] lg:col-[4/5]"
                  style={{ opacity: "1", transform: "none" }}
                >
                  <div
                    className=""
                    style={{ position: "relative", transform: "none" }}
                  >
                    <button
                      type="button"
                      aria-label="Scroll to top"
                      className="flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-inherit transition-opacity duration-300 hover:opacity-70"
                    >
                      <img
                        alt=""
                        loading="eager"
                        width="32"
                        height="32"
                        decoding="async"
                        data-nimg="1"
                        style={{ color: "transparent" }}
                        src="/images/img-19.svg"
                      />
                      <span className="block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none lg:max-dt:text-[clamp(9px,0.8vw+0.8px,11px)] dt:text-sm text-left !text-[#c5c5c5] [&>span]:block">
                        <span>GO</span>
                        <span>TOP</span>
                      </span>
                    </button>
                  </div>
                </div>
                <div
                  className="col-[10/13] sm:col-[4/5] lg:col-[10/13] lg:max-dt:col-[9/13] max-sm:hidden"
                  style={{ opacity: "1", transform: "none" }}
                >
                  <div
                    className=""
                    style={{ position: "relative", transform: "none" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <img
                        alt=""
                        loading="eager"
                        width="32"
                        height="32"
                        decoding="async"
                        data-nimg="1"
                        className="opacity-60"
                        style={{ color: "transparent" }}
                        src="/images/img-20.svg"
                      />
                      <span className="block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none lg:max-dt:text-[clamp(9px,0.8vw+0.8px,11px)] dt:text-sm text-left [&>span]:block">
                        <span>2026 ©</span>
                        <span>Copyright</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-12 max-sm:grid-cols-4 sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 max-sm:mt-6 mt-10">
                <div
                  className="col-[2/4] sm:col-[1/3] lg:col-[2/4] block w-[219px] max-sm:w-[180px] h-[38px]"
                  style={{ opacity: "1", transform: "none" }}
                >
                  <div
                    className="glitch-wrapper "
                    style={{ position: "relative" }}
                  >
                    <div style={{ position: "relative", zIndex: "1" }}>
                      <a href="/index.html">
                        <img
                          alt="AllOnce"
                          loading="eager"
                          width="720"
                          height="720"
                          decoding="async"
                          data-nimg="1"
                          className="w-full h-full"
                          style={{ color: "transparent", objectFit: "contain" }}
                          src="/images/logo.svg"
                        />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-12 max-sm:grid-cols-4 sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 mt-8"></div>
              <div
                className="mt-[60px] max-sm:mt-8 w-full h-[320px] max-sm:h-[200px] lg:max-dt:h-[clamp(220px,22.333vw-33.1px,440px)] relative overflow-hidden"
                style={{ opacity: "1", transform: "none" }}
              >
                <div className="w-full h-full">
                  <svg
                    id="contact-wave-svg"
                    viewBox="0 0 100 500"
                    preserveAspectRatio="none"
                    className="w-full h-full block"
                  >
                    <defs>
                      <linearGradient
                        id="footer-stripe-gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="rgba(0,0,255,0.25)"></stop>
                        <stop
                          offset="12%"
                          stopColor="rgba(0,0,255,0.65)"
                        ></stop>
                        <stop offset="32%" stopColor="rgba(0,0,255,1)"></stop>
                        <stop
                          offset="50%"
                          stopColor="rgba(120,140,255,1)"
                        ></stop>
                        <stop offset="69%" stopColor="rgba(0,0,255,1)"></stop>
                        <stop
                          offset="88%"
                          stopColor="rgba(0,0,255,0.65)"
                        ></stop>
                        <stop
                          offset="100%"
                          stopColor="rgba(0,0,255,0.25)"
                        ></stop>
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,250 L 1,250 L 2,250 L 3,250 L 4,250 L 5,250 L 6,250 L 7,250 L 8,250 L 9,250 L 10,250 L 11,250 L 12,250 L 13,250 L 14,250 L 15,250 L 16,250 L 17,250 L 18,250 L 19,250 L 20,250 L 21,250 L 22,250 L 23,250 L 24,250 L 25,250 L 26,253.09060309469174 L 27,256.22603023445384 L 28,259.3568338602788 L 29,262.433639328736 L 30,265.4079235795933 L 31,268.2327803734634 L 32,270.8636600312194 L 33,273.25907200904703 L 34,275.3812392291064 L 35,277.1966938466157 L 36,278.67680505775684 L 37,279.79823062455455 L 38,280.54328499591355 L 39,280.90021821932316 L 40,280.86340124462873 L 41,280.4334146975147 L 42,279.61703972269055 L 43,278.4271510411885 L 44,276.88251390831994 L 45,275.00748817439217 L 46,272.8316441153153 L 47,270.38929609168787 L 48,267.7189613908292 L 49,264.86275278615307 L 50,261.8657143935716 L 51,258.77511129887966 L 52,255.63968415911813 L 53,252.508880533293 L 54,249.4320750648357 L 55,246.45779081397822 L 56,243.6329340201086 L 57,241.00205436235248 L 58,238.60664238452466 L 59,236.48447516446524 L 60,234.66902054695638 L 61,233.18890933581505 L 62,232.06748376901714 L 63,231.32242939765823 L 64,230.96549617424853 L 65,231.00231314894313 L 66,231.432299696057 L 67,232.24867467088097 L 68,233.43856335238334 L 69,234.9832004852519 L 70,236.8582262191795 L 71,239.03407027825622 L 72,241.47641830188414 L 73,244.14675300274266 L 74,247.00296160741865 L 75,250 L 76,250 L 77,250 L 78,250 L 79,250 L 80,250 L 81,250 L 82,250 L 83,250 L 84,250 L 85,250 L 86,250 L 87,250 L 88,250 L 89,250 L 90,250 L 91,250 L 92,250 L 93,250 L 94,250 L 95,250 L 96,250 L 97,250 L 98,250 L 99,250 L 100,250"
                      fill="none"
                      stroke="url(#footer-stripe-gradient)"
                      strokeWidth="2"
                      style={{ vectorEffect: "non-scaling-stroke" }}
                      opacity="1"
                    ></path>
                    <path
                      d="M 0,250 L 1,250 L 2,250 L 3,250 L 4,250 L 5,250 L 6,250 L 7,250 L 8,250 L 9,250 L 10,250 L 11,250 L 12,250 L 13,250 L 14,250 L 15,250 L 16,250 L 17,250 L 18,250 L 19,250 L 20,250 L 21,250 L 22,250 L 23,250 L 24,250 L 25,250 L 26,253.00230430219682 L 27,255.46609395563453 L 28,257.3421168450686 L 29,258.59187401151286 L 30,259.18832153140943 L 31,259.11636366783534 L 32,258.3731283079313 L 33,256.9680196677192 L 34,254.92254730394333 L 35,252.269934548494 L 36,249.05451350017148 L 37,245.33091759770977 L 38,241.16308648627955 L 39,236.6231013099463 L 40,231.78987165235762 L 41,226.74769805112166 L 42,221.58473627848295 L 43,216.3913913708789 L 44,211.2586706699896 L 45,206.2765258847524 L 46,201.53221438389198 L 47,197.10870957806978 L 48,193.08318935633696 L 49,189.52563011928575 L 50,186.49753202724736 L 51,184.05079869094953 L 52,182.2267917179639 L 53,181.05557734217376 L 54,180.55537886352124 L 55,180.73224487520355 L 56,181.5799393235697 L 57,183.08005540393873 L 58,185.20235121699483 L 59,187.90530106969044 L 60,191.13685237528782 L 61,194.8353743609187 L 62,198.93078129608216 L 63,203.34580977553273 L 64,207.99742678295152 L 65,212.79834287882787 L 66,217.65860294047926 L 67,222.48722546906458 L 68,227.19386059348014 L 69,231.69043656036885 L 70,235.89276470925242 L 71,239.72207368825707 L 72,243.10644495522192 L 73,245.9821234076657 L 74,248.2946792603995 L 75,250 L 76,250 L 77,250 L 78,250 L 79,250 L 80,250 L 81,250 L 82,250 L 83,250 L 84,250 L 85,250 L 86,250 L 87,250 L 88,250 L 89,250 L 90,250 L 91,250 L 92,250 L 93,250 L 94,250 L 95,250 L 96,250 L 97,250 L 98,250 L 99,250 L 100,250"
                      fill="none"
                      stroke="url(#footer-stripe-gradient)"
                      strokeWidth="2"
                      style={{ vectorEffect: "non-scaling-stroke" }}
                      opacity="1"
                    ></path>
                    <path
                      d="M 0,250 L 1,250 L 2,250 L 3,250 L 4,250 L 5,250 L 6,250 L 7,250 L 8,250 L 9,250 L 10,250 L 11,250 L 12,250 L 13,250 L 14,250 L 15,250 L 16,250 L 17,250 L 18,250 L 19,250 L 20,250 L 21,250 L 22,250 L 23,250 L 24,250 L 25,250 L 26,247.9332625689422 L 27,244.94450106786388 L 28,241.10142072316106 L 29,236.4898783798908 L 30,231.2120905402252 L 31,225.38450021922912 L 32,219.1353470900139 L 33,212.60199157611328 L 34,205.92804867862327 L 35,199.2603912922858 L 36,192.74608548561417 L 37,186.52932163858506 L 38,180.74840541782893 L 39,175.53287132181333 L 40,171.0007789732418 L 41,167.25624852606148 L 42,164.38728656950724 L 43,162.4639478554344 L 44,161.53687117406946 L 45,161.6362199031849 L 46,162.7710493192098 L 47,164.92911386179094 L 48,168.07711837131245 L 49,172.1614080630741 L 50,177.1090828551866 L 51,182.829512820452 L 52,189.2162231699952 L 53,196.14910947252827 L 54,203.49693692851173 L 55,211.12007159656395 L 56,218.87338663385185 L 57,226.6092829635584 L 58,234.18076139700983 L 59,241.4444821653624 L 60,248.26374807825945 L 61,254.51134911910776 L 62,260.07220917537876 L 63,264.845779727434 L 64,268.74813059471046 L 65,271.7136941538452 L 66,273.6966266676528 L 67,274.67175834628745 L 68,274.63511233595653 L 69,273.6039818174745 L 70,271.61656360938724 L 71,268.7311559163089 L 72,265.0249369497353 L 73,260.5923498864795 L 74,255.5431278368885 L 75,250 L 76,250 L 77,250 L 78,250 L 79,250 L 80,250 L 81,250 L 82,250 L 83,250 L 84,250 L 85,250 L 86,250 L 87,250 L 88,250 L 89,250 L 90,250 L 91,250 L 92,250 L 93,250 L 94,250 L 95,250 L 96,250 L 97,250 L 98,250 L 99,250 L 100,250"
                      fill="none"
                      stroke="url(#footer-stripe-gradient)"
                      strokeWidth="2"
                      style={{ vectorEffect: "non-scaling-stroke" }}
                      opacity="1"
                    ></path>
                    <path
                      d="M 0,250 L 1,250 L 2,250 L 3,250 L 4,250 L 5,250 L 6,250 L 7,250 L 8,250 L 9,250 L 10,250 L 11,250 L 12,250 L 13,250 L 14,250 L 15,250 L 16,250 L 17,250 L 18,250 L 19,250 L 20,250 L 21,250 L 22,250 L 23,250 L 24,250 L 25,250 L 26,243.94953450771646 L 27,237.76942459348334 L 28,231.63664064784345 L 29,225.7272271889618 L 30,220.21211459781796 L 31,215.253051668786 L 32,210.9987551913565 L 33,207.5813676460283 L 34,205.11330681052073 L 35,203.68458180377888 L 36,203.3606390639495 L 37,204.18078922352223 L 38,206.15725210651703 L 39,209.2748424539195 L 40,213.4913038302002 L 41,218.7382828341564 L 42,224.9229205939326 L 43,231.9300239271606 L 44,239.6247648378707 L 45,247.8558445265156 L 46,256.4590471034804 L 47,265.2610989797924 L 48,274.08374267928093 L 49,282.7479287451445 L 50,291.0780266207982 L 51,298.90595493588677 L 52,306.07513353425554 L 53,312.44416379624334 L 54,317.8901502333497 L 55,322.31158481699663 L 56,325.6307258442722 L 57,327.7954150975381 L 58,328.7802903389138 L 59,328.58736448079287 L 60,327.2459577514121 L 61,324.8119844759438 L 62,321.3666113566711 L 63,317.0143189995995 L 64,311.88041254779176 L 65,306.1080403100498 L 66,299.85479090915015 L 67,293.28894944151864 L 68,286.58550120423354 L 69,279.92197751489715 L 70,273.4742418839926 L 71,267.41231620957603 L 72,261.8963457171416 L 73,257.0727980856933 L 74,253.07098666202688 L 75,250 L 76,250 L 77,250 L 78,250 L 79,250 L 80,250 L 81,250 L 82,250 L 83,250 L 84,250 L 85,250 L 86,250 L 87,250 L 88,250 L 89,250 L 90,250 L 91,250 L 92,250 L 93,250 L 94,250 L 95,250 L 96,250 L 97,250 L 98,250 L 99,250 L 100,250"
                      fill="none"
                      stroke="url(#footer-stripe-gradient)"
                      strokeWidth="2"
                      style={{ vectorEffect: "non-scaling-stroke" }}
                      opacity="1"
                    ></path>
                    <path
                      d="M 0,250 L 1,250 L 2,250 L 3,250 L 4,250 L 5,250 L 6,250 L 7,250 L 8,250 L 9,250 L 10,250 L 11,250 L 12,250 L 13,250 L 14,250 L 15,250 L 16,250 L 17,250 L 18,250 L 19,250 L 20,250 L 21,250 L 22,250 L 23,250 L 24,250 L 25,250 L 26,246.97484961654726 L 27,244.69864288671045 L 28,243.25603234566375 L 29,242.7084894538251 L 30,243.09263496202703 L 31,244.41923244901312 L 32,246.6728718759582 L 33,249.81235162675904 L 34,253.77174890128913 L 35,258.4621499970606 L 36,263.7739944408434 L 37,269.57997058380295 L 38,275.7383855869017 L 39,282.096920088742 L 40,288.4966676022245 L 41,294.7763511020573 L 42,300.776604544395 L 43,306.34420532825715 L 44,311.3361450121307 L 45,315.623429903499 L 46,319.0945103293556 L 47,321.6582472806608 L 48,323.24633743986453 L 49,323.8151320202056 L 50,323.3468009844522 L 51,321.8498116393928 L 52,319.3587088565874 L 53,315.9332027636039 L 54,311.656588188056 L 55,306.63353792829724 L 56,300.9873285957998 L 57,294.8565728812226 L 58,288.3915452365757 L 59,281.7501987899489 L 60,275.0939795286181 L 61,268.58354918227496 L 62,262.37453066681564 L 63,256.61338934599496 L 64,251.4335597493693 L 65,246.9519208465899 L 66,243.26571369452137 L 67,240.44998349189373 L 68,238.5556141101395 L 69,237.6080073904589 L 70,237.60644232629815 L 71,238.524131144424 L 72,240.30897073885035 L 73,242.8849693941768 L 74,246.1543107515132 L 75,250 L 76,250 L 77,250 L 78,250 L 79,250 L 80,250 L 81,250 L 82,250 L 83,250 L 84,250 L 85,250 L 86,250 L 87,250 L 88,250 L 89,250 L 90,250 L 91,250 L 92,250 L 93,250 L 94,250 L 95,250 L 96,250 L 97,250 L 98,250 L 99,250 L 100,250"
                      fill="none"
                      stroke="url(#footer-stripe-gradient)"
                      strokeWidth="2"
                      style={{ vectorEffect: "non-scaling-stroke" }}
                      opacity="1"
                    ></path>
                    <path
                      d="M 0,250 L 1,250 L 2,250 L 3,250 L 4,250 L 5,250 L 6,250 L 7,250 L 8,250 L 9,250 L 10,250 L 11,250 L 12,250 L 13,250 L 14,250 L 15,250 L 16,250 L 17,250 L 18,250 L 19,250 L 20,250 L 21,250 L 22,250 L 23,250 L 24,250 L 25,250 L 26,251.03533288952272 L 27,252.70329931531168 L 28,254.9447299305876 L 29,257.6819248705817 L 30,260.82099206439096 L 31,264.2546709423526 L 32,267.8655573841261 L 33,271.52963379627744 L 34,275.1199991142454 L 35,278.5106875629593 L 36,281.5804623606289 L 37,284.21647129023415 L 38,286.3176551710105 L 39,287.7978076154162 L 40,288.5881948367078 L 41,288.63965736923814 L 42,287.92413098788705 L 43,286.4355414052977 L 44,284.1900459708422 L 45,281.225615038203 L 46,277.60096533012666 L 47,273.3938769236987 L 48,268.69894383283423 L 49,263.62482502995846 L 50,258.29107762382915 L 51,252.82466635211549 L 52,247.35625318518862 L 53,242.01637738456716 L 54,236.93163962060444 L 55,232.22100363224004 L 56,227.99232541050807 L 57,224.339213111354 L 58,221.3383110539089 L 59,219.047088531053 L 60,217.5021991259854 L 61,216.71845923930397 L 62,216.688476091751 L 63,217.38293612744206 L 64,218.75154507703593 L 65,220.7245915355992 L 66,223.21508734373123 L 67,226.12142088579623 L 68,229.33044414731285 L 69,232.72090145950057 L 70,236.16709768725627 L 71,239.54269649035658 L 72,242.72453541867816 L 73,245.59634410590886 L 74,248.05225471736387 L 75,250 L 76,250 L 77,250 L 78,250 L 79,250 L 80,250 L 81,250 L 82,250 L 83,250 L 84,250 L 85,250 L 86,250 L 87,250 L 88,250 L 89,250 L 90,250 L 91,250 L 92,250 L 93,250 L 94,250 L 95,250 L 96,250 L 97,250 L 98,250 L 99,250 L 100,250"
                      fill="none"
                      stroke="url(#footer-stripe-gradient)"
                      strokeWidth="2"
                      style={{ vectorEffect: "non-scaling-stroke" }}
                      opacity="1"
                    ></path>
                  </svg>
                </div>
              </div>
              <div className="grid grid-cols-12 max-sm:grid-cols-4 sm:grid-cols-4 lg:grid-cols-12 gap-5 max-sm:gap-3 max-sm:mt-8 mt-[60px] sm:mt-[20px] md:mt-[20px] items-start">
                <div
                  className="col-[1/3] row-start-2 sm:col-[1/3] lg:col-[1/3] lg:block sm:hidden max-sm:hidden"
                  style={{ opacity: "1", transform: "none" }}
                >
                  <img
                    alt=""
                    loading="eager"
                    width="30"
                    height="31"
                    decoding="async"
                    data-nimg="1"
                    className="block"
                    style={{ color: "transparent" }}
                    src="/images/img-22.svg"
                  />
                  <p className="block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none lg:max-dt:text-[clamp(9px,0.8vw+0.8px,11px)] dt:text-sm mt-3.5 leading-[140%]">
                    We replace the fourteen-tab commute with one window —
                    assembled specifically for your business.
                  </p>
                </div>
                <div
                  className="col-[4/9] sm:col-[1/5] lg:col-[4/9] sm:row-start-2 max-sm:col-[1/3]"
                  style={{ opacity: "1", transform: "none" }}
                >
                  <div
                    className=""
                    style={{ position: "relative", transform: "none" }}
                  >
                    <a
                      href="/signin/index.html"
                      className="font-medium text-[64px] leading-[100%] tracking-[-0.06em] text-[#c5c5c5] no-underline block max-sm:text-[clamp(36px,8vw,34px)] lg:max-dt:text-[clamp(44px,5.333vw-10.61px,64px)] md:max-dt:text-[clamp(32px,5.333vw-10.61px,54px)] sm:max-lg:text-[clamp(26px,6.25vw,28px)] dt:text-[64px]"
                    >
                      <span className="pl-[calc((100%+20px)/5)] block max-sm:pl-0">
                        Run your business — in one window.
                      </span>
                    </a>
                  </div>
                </div>
                <div className="col-[10/13] sm:col-[3/5] lg:col-[10/13] lg:max-dt:col-[9/13] max-sm:col-[1/5] max-sm:row-start-2 sm:row-start-2 max-sm:mt-10 flex flex-col items-start">
                  <span
                    className="block font-semibold text-sm tracking-[-0.03em] uppercase text-[rgba(197,197,197,0.4)] leading-none lg:max-dt:text-[clamp(9px,0.8vw+0.8px,11px)] dt:text-sm pb-2.5"
                    style={{ opacity: "1", transform: "none" }}
                  >
                    Contacts
                  </span>
                  <div className="" style={{ opacity: "1", transform: "none" }}>
                    <div
                      className=""
                      style={{ position: "relative", transform: "none" }}
                    >
                      <a
                        href="mailto:hi@allonce.com"
                        className="mt-[30px] max-sm:mt-4 max-sm:text-[22px] font-medium text-[38px] leading-[100%] tracking-[-0.06em] text-[#c5c5c5] underline decoration-[7%] underline-offset-[12.5%] hover:opacity-70 lg:max-dt:text-[clamp(26px,3.2vw-6.77px,38px)] sm:max-dt:text-[clamp(22px,3.2vw-6.77px,26px)] dt:text-[38px]"
                      >
                        hi@allonce.com
                      </a>
                    </div>
                  </div>
                  <div className="mt-[30px] flex gap-2">
                    <div
                      className=""
                      style={{ opacity: "1", transform: "none" }}
                    >
                      <a
                        href="#"
                        className="group w-[86px] h-14 rounded-full bg-[rgba(197,197,197,0.15)] border-none outline-none cursor-pointer flex justify-center items-center relative overflow-hidden transition-colors duration-300 z-1 hover:animate-[rotate_0.7s_ease-in-out_both] [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:pointer-events-none [&>span]:group-hover:animate-[storm_0.7s_ease-in-out_both] [&>span]:group-hover:[animation-delay:0.06s]"
                        aria-label="Telegram"
                      >
                        <span>
                          <img
                            alt="Telegram"
                            loading="eager"
                            width="24"
                            height="24"
                            decoding="async"
                            data-nimg="1"
                            className="block z-2 transition-[filter] duration-300"
                            src="/images/img-23.svg"
                            style={{ color: "transparent" }}
                          />
                        </span>
                      </a>
                    </div>
                    <div
                      className=""
                      style={{ opacity: "1", transform: "none" }}
                    >
                      <a
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group w-[86px] h-14 rounded-full bg-[rgba(197,197,197,0.15)] border-none outline-none cursor-pointer flex justify-center items-center relative overflow-hidden transition-colors duration-300 z-1 hover:animate-[rotate_0.7s_ease-in-out_both] [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:pointer-events-none [&>span]:group-hover:animate-[storm_0.7s_ease-in-out_both] [&>span]:group-hover:[animation-delay:0.06s]"
                        aria-label="GitHub"
                      >
                        <span>
                          <img
                            alt="GitHub"
                            loading="eager"
                            width="24"
                            height="24"
                            decoding="async"
                            data-nimg="1"
                            className="block z-2 transition-[filter] duration-300"
                            src="/images/img-24.svg"
                            style={{ color: "transparent" }}
                          />
                        </span>
                      </a>
                    </div>
                    <div
                      className=""
                      style={{ opacity: "1", transform: "none" }}
                    >
                      <a
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group w-[86px] h-14 rounded-full bg-[rgba(197,197,197,0.15)] border-none outline-none cursor-pointer flex justify-center items-center relative overflow-hidden transition-colors duration-300 z-1 hover:animate-[rotate_0.7s_ease-in-out_both] [&>span]:flex [&>span]:items-center [&>span]:justify-center [&>span]:pointer-events-none [&>span]:group-hover:animate-[storm_0.7s_ease-in-out_both] [&>span]:group-hover:[animation-delay:0.06s]"
                        aria-label="Upwork"
                      >
                        <span>
                          <img
                            alt="Upwork"
                            loading="eager"
                            width="24"
                            height="24"
                            decoding="async"
                            data-nimg="1"
                            className="block z-2 transition-[filter] duration-300"
                            src="/images/img-25.svg"
                            style={{ color: "transparent" }}
                          />
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </section>
        </main>
      </div>
      <div
        data-xray-content
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-99999px",
          top: "-99999px",
          width: "9999px",
          height: "auto",
          overflow: "visible",
          opacity: "0.01",
          pointerEvents: "none",
          fontSize: "1px",
          lineHeight: "1",
        }}
      >
        Contacts
        <br />© Allone
        <br />
        Labs
        <br />
        Professional
        <br />
        Backend
        <br />
        WatchShowreel
        <br />
        00:36
        <br />
        Your whole businessall at onceone backend
        <br />
        Your whole business
        <br />
        36
        <br />
        AllOnce Tools
        <br />
        Evolve
        <br />
        Tools
        <br />
        65
        <br />
        BridgesExperience
        <br />
        Bridges
        <br />
        Wired
        <br />
        BestCases
        <br />
        Best
        <br />
        Cases
        <br />
        Our Projects
        <br />
        BBrraanndd FFoorrggee
        <br />
        SSiittee FFoorrggee
        <br />
        LLeeddggeerr SSppaawwnn
        <br />
        AAdd RReeeell
        <br />
        CCRRMM SSppaawwnn
        <br />
        DDeesskk FFoorrggee
        <br />
        AApppp FFoorrggee
        <br />
        We give the next levelfor your business
        <br />
        We give the next level
        <br />
        for your business
        <br />
        Types ofActivities
        <br />
        Types of
        <br />
        Activities
        <br />
        What we do
        <br />
        UUXX//UUII EEvvoollvvee
        <br />
        OOrrcchheessttrraattee
        <br />
        SSppaawwnn
        <br />
        BBrriiddggeess
        <br />
        MMaattrriixx
        <br />
        Operators don’t need another tool. They need a destination at the end of
        the morning commute.
        <br />
        AllOnce is the screen where every customer, every dollar, every team
        member, and every decision lives — in one window, generated specifically
        for the business it serves.
        <br />
        About
        <br />
        Studio
        <br />
        Strong &amp; Unique Spawn and Orchestrate Anything
        <br />
        Compiling high-
        <br />
        quality projects
        <br />
        since —<br />
        2024
        <br />
        Production-grade backend for builders — spawn, orchestrate, evolve a
        whole company in minutes. Same command works on a video, a brand, or a
        business.
        <br />
        Production-grade backend for builders
        <br />
        Built by Allone Labs. AllOnce gives operators one window; the spawn
        engine builds the business behind it. One product, one thesis: running a
        real business should feel like flying, not paperwork.
        <br />
        EST.2026
        <br />
        EST.
        <br />
        GOTOP
        <br />
        TOP
        <br />
        2026 ©Copyright
        <br />
        2026 ©<br />
        Copyright
        <br />
        We replace the fourteen-tab commute with one window — assembled
        specifically for your business.
        <br />
        WWee aarree rreeaaddyyttoo ddiissccuussss yyoouurrpprroojjeecctt
        <br />
        WWee aarree rreeaaddyy
        <br />
        hi@allonce.com
        <br />
        CONTACTS
        <br />© ALLONCE
        <br />
        LABS
        <br />
        ONE
        <br />
        BACKEND
        <br />
        CONTACTS
        <br />© ALLONCE
        <br />
        LABS
        <br />
        ONE
        <br />
        BACKEND
        <br />
        WATCH
        <br />
        SPAWN REEL
        <br />
        00:36
        <br />
        Your whole business
        <br />
        all at once
        <br />
        one backend
        <br />
        36
        <br />
        EVOLVE
        <br />
        TOOLS
        <br />
        65
        <br />
        BRIDGES
        <br />
        WIRED
        <br />
        BEST
        <br />
        CASES
        <br />
        Our Projects
        <br />L<br />L<br />o<br />o<br />g<br />g<br />o<br />o<br />f<br />f
        <br />o<br />o<br />l<br />l<br />i<br />i<br />o<br />o<br /> <br /> 
        <br />M<br />M<br />M<br />M<br />X<br />X<br />X<br />X<br />I<br />I
        <br />I<br />I<br />F<br />F<br />l<br />l<br />i<br />i<br />g<br />g
        <br />h<br />h<br />t<br />t<br />o<br />o<br />u<br />u<br />r<br />r
        <br />Z<br />Z<br />O<br />O<br />H<br />H<br />O<br />O<br />©<br />©
        <br /> <br /> <br />C<br />C<br />l<br />l<br />o<br />o<br />t<br />t
        <br />h<br />h<br />i<br />i<br />n<br />n<br />g<br />g<br />D<br />D
        <br />e<br />e<br />c<br />c<br />k<br />k<br />.<br />.<br />L<br />L
        <br />a<br />a<br />b<br />b<br />H<br />H<br />o<br />o<br />p<br />p
        <br />s<br />s<br />c<br />c<br />o<br />o<br />t<br />t<br />c<br />c
        <br />h<br />h<br />K<br />K<br />o<br />o<br />m<br />m<br />m<br />m
        <br />a<br />a<br />t<br />t<br />h<br />h<br />r<br />r<br />e<br />e
        <br />3<br />3<br />
        <br />
        We give the next level
        <br />
        for your business
        <br />
        AllOnce
        <br />
        Primary
        <br />
        Open showreel
        <br />
        Play
        <br />
        Back Phone
        <br />
        Top Phone
        <br />
        Brand Forge
        <br />X<br />
        Open Evolve details
        <br />
        Open Orchestrate details
        <br />
        Open Spawn details
        <br />
        Open Bridges details
        <br />
        Open Matrix details
        <br />
        Previous slide
        <br />
        Previous
        <br />
        Next slide
        <br />
        Next
        <br />
        Scroll to top
        <br />
        Telegram
        <br />
        GitHub
        <br />
        Upwork
        <br />
        Production-grade backend for builders. Spawn, orchestrate, and evolve a
        whole company in minutes.
        <br />
        AllOnce © One Backend
        <br />
        CONTACTS
        <br />© ALLONCE
        <br />
        LABS
        <br />
        ONE
        <br />
        BACKEND
        <br />
        CONTACTS
        <br />© ALLONCE
        <br />
        LABS
        <br />
        ONE
        <br />
        BACKEND
        <br />
        WATCH
        <br />
        SPAWN REEL
        <br />
        00:36
        <br />
        Your whole business
        <br />
        all at once
        <br />
        one backend
        <br />
        36
        <br />
        EVOLVE
        <br />
        TOOLS
        <br />
        65
        <br />
        BRIDGES
        <br />
        WIRED
        <br />
        BEST
        <br />
        CASES
        <br />
        Our Projects
        <br />L<br />L<br />o<br />o<br />g<br />g<br />o<br />o<br />f<br />f
        <br />o<br />o<br />l<br />l<br />i<br />i<br />o<br />o<br /> <br /> 
        <br />M<br />M<br />M<br />M<br />X<br />X<br />X<br />X<br />I<br />I
        <br />I<br />I<br />F<br />F<br />l<br />l<br />i<br />i<br />g<br />g
        <br />h<br />h<br />t<br />t<br />o<br />o<br />u<br />u<br />r<br />r
        <br />Z<br />Z<br />O<br />O<br />H<br />H<br />O<br />O<br />©<br />©
        <br /> <br /> <br />C<br />C<br />l<br />l<br />o<br />o<br />t<br />t
        <br />h<br />h<br />i<br />i<br />n<br />n<br />g<br />g<br />D<br />D
        <br />e<br />e<br />c<br />c<br />k<br />k<br />.<br />.<br />L<br />L
        <br />a<br />a<br />b<br />b<br />H<br />H<br />o<br />o<br />p<br />p
        <br />s<br />s<br />c<br />c<br />o<br />o<br />t<br />t<br />c<br />c
        <br />h<br />h<br />K<br />K<br />o<br />o<br />m<br />m<br />m<br />m
        <br />a<br />a<br />t<br />t<br />h<br />h<br />r<br />r<br />e<br />e
        <br />3<br />3<br />
        <br />
        We give the next level
        <br />
        for your business
        <br />
        BBrriiddggeess
        <br />
        MMaattrriixx
      </div>

      <Script src="/data/lenis.min.js" strategy="afterInteractive" />
      <Script src="/data/wave-animate.js" strategy="afterInteractive" />
      <Script src="/data/slider.js" strategy="afterInteractive" />
      <Script src="/data/workflow.js?v=4" strategy="afterInteractive" />
      <Script src="/data/dial-tilt.js" strategy="afterInteractive" />
    </div>
  );
}
