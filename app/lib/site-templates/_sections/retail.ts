// Retail / boutique sections.
//
// Aesthetic source: github.com/allonelabs/equivalenza-geo. Polished
// boutique retail: marquee scrolling banners, USP trust strip, featured
// collection carousel, mood/category slider, info-tabs, testimonial
// carousel.
//
// Same RenderContext as other sections — palette/fonts/motion via variants.

import type { RenderContext } from "../schema";
import { esc, renderDecorationsForSection } from "./helpers";

// ── Marquee scrolling text band ─────────────────────────────────────────

export function renderMarquee(ctx: RenderContext, text?: string): string {
  const msg =
    text ?? (ctx.params.taglineSuperline ?? ctx.content.tagline).toUpperCase();
  // Repeat the message 4× so the scroll loops seamlessly.
  const phrase = `${esc(msg)} · `;
  return `<section class="marquee" style="background:var(--ink);color:var(--paper);padding:18px 0;overflow:hidden;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
  <div class="marquee-track" style="display:flex;gap:40px;white-space:nowrap;font-size:13px;font-weight:500;letter-spacing:0.24em;text-transform:uppercase;font-family:var(--font-body);animation:marquee-scroll 28s linear infinite">
    <span>${phrase.repeat(4)}</span>
    <span>${phrase.repeat(4)}</span>
  </div>
</section>
<style>
@keyframes marquee-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion: reduce){.marquee-track{animation:none}}
</style>`;
}

// ── USP slider (trust badges row) ───────────────────────────────────────

export function renderUSPStrip(ctx: RenderContext): string {
  const ns = `usp-${ctx.slug.slice(0, 10)}`;
  const features = ctx.content.features.slice(0, 4);
  const items = features
    .map(
      (f, i) => `
    <div class="${ns}-item" style="text-align:left;padding:36px 28px;background:var(--accent-soft);transition:background .3s ease">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
        <span style="font-family:var(--font-display);font-size:20px;font-weight:300;letter-spacing:-0.02em;color:var(--accent);line-height:1">${esc(ctx.params.featureIcons?.[i] ?? `0${i + 1}`)}</span>
        <span aria-hidden="true" style="flex:1;height:1px;background:var(--line);opacity:0.6"></span>
      </div>
      <div style="font-family:var(--font-body);font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:10px;color:var(--ink)">${esc(f.title)}</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.6">${esc(f.description.slice(0, 100))}</div>
    </div>`,
    )
    .join("");
  return `<section class="usp-strip" style="padding:64px 0 56px;background:var(--accent-soft);border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
  <div class="wrap" style="max-width:1280px;margin:0 auto;padding:0 32px">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:28px">
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-weight:500;font-family:var(--font-body)">${esc(ctx.params.customLabels?.features ?? "What we promise")}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1px;background:var(--line)">${items}</div>
  </div>
</section>`;
}

// ── Featured collection (product carousel-ish) ──────────────────────────

export function renderFeaturedCollection(
  ctx: RenderContext,
  heading: string,
  productsFromPricing = true,
): string {
  const ns = `fc-${ctx.slug.slice(0, 10)}`;
  const items = productsFromPricing
    ? ctx.content.pricing.map((p, i) =>
        productCard(
          ctx,
          p.name,
          p.price,
          p.description,
          i,
          p.highlighted ?? false,
          ns,
        ),
      )
    : ctx.content.features
        .slice(0, 4)
        .map((f, i) =>
          productCard(
            ctx,
            f.title,
            "—",
            f.description.slice(0, 60),
            i,
            false,
            ns,
          ),
        );
  const count = productsFromPricing
    ? ctx.content.pricing.length
    : Math.min(ctx.content.features.length, 4);
  const supportingLine =
    count === 1
      ? "A single piece, considered slowly. Made in small batches in our atelier."
      : `${count} pieces, made in small batches. Each finished by hand before it leaves the studio.`;
  return `<section class="collection-section" style="padding:120px 0">
  <div class="wrap" style="max-width:1280px">
    <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:32px;align-items:end;margin-bottom:52px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
          <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
          <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.features ?? "Collection")}</p>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;margin:0">${esc(heading)}</h2>
      </div>
      <p style="font-size:14px;color:var(--muted);line-height:1.6;max-width:380px;margin:0 0 8px auto;text-align:right;font-family:var(--font-body)">${esc(supportingLine)}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:28px 24px">${items}</div>
  </div>
</section>
<style>
@media (max-width: 720px) {
  .collection-section > .wrap > div:first-child { grid-template-columns: 1fr; align-items: start; }
  .collection-section > .wrap > div:first-child > p { text-align: left; margin: 0; }
}
</style>`;
}

function productCard(
  ctx: RenderContext,
  name: string,
  price: string,
  blurb: string,
  i: number,
  highlighted: boolean,
  ns: string,
): string {
  const angle = 110 + i * 30;
  return `<a href="/pricing" class="${ns}-card" style="display:block;text-decoration:none;color:inherit;transition:transform .3s ease">
    <div style="aspect-ratio:3/4;background:var(--accent-soft);position:relative;overflow:hidden;margin-bottom:20px">
      <div style="position:absolute;inset:0;background:linear-gradient(${angle}deg, var(--accent-soft) 0%, var(--accent) 100%);opacity:.55;transition:opacity .4s ease" class="${ns}-card-bg"></div>
      ${highlighted ? `<div style="position:absolute;top:14px;left:14px;padding:5px 10px;background:var(--accent);color:var(--on-accent);font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;font-family:var(--font-body)">Best seller</div>` : ""}
      <div style="position:absolute;bottom:14px;right:14px;width:36px;height:36px;background:var(--paper);display:flex;align-items:center;justify-content:center;color:var(--ink);opacity:0;transform:translateY(4px);transition:opacity .3s ease, transform .3s ease" class="${ns}-card-cta">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px">
      <h3 style="font-family:var(--font-display);font-size:17px;font-weight:500;letter-spacing:-0.01em;margin:0;line-height:1.2">${esc(name)}</h3>
      <p style="font-family:var(--font-body);font-size:14px;font-weight:600;color:var(--ink);margin:0;letter-spacing:0.01em;white-space:nowrap">${esc(price)}</p>
    </div>
    <p style="font-size:12.5px;color:var(--muted);margin:0;line-height:1.5">${esc(blurb)}</p>
  </a>
  <style>
  .${ns}-card:hover{transform:translateY(-3px)}
  .${ns}-card:hover .${ns}-card-cta{opacity:1;transform:translateY(0)}
  .${ns}-card:hover .${ns}-card-bg{opacity:.72}
  @media (prefers-reduced-motion: reduce){.${ns}-card,.${ns}-card *{transition:none}.${ns}-card:hover{transform:none}}
  </style>`;
}

// ── Mood / category slider (shop by mood) ──────────────────────────────

export function renderMoodSlider(ctx: RenderContext): string {
  const ns = `mood-${ctx.slug.slice(0, 10)}`;
  const items = ctx.content.features
    .map(
      (f, i) => `
    <a href="/features" class="${ns}-card" style="flex:0 0 300px;aspect-ratio:3/4;background:var(--accent-soft);position:relative;overflow:hidden;display:block;text-decoration:none;color:inherit;transition:transform .35s ease">
      <div class="${ns}-card-bg" style="position:absolute;inset:0;background:linear-gradient(${130 + i * 22}deg, var(--accent) 0%, var(--ink) 100%);opacity:.65;transition:opacity .4s ease"></div>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:32px;color:#fff">
        <div style="display:flex;align-items:center;gap:12px">
          <span aria-hidden="true" style="display:inline-block;width:20px;height:1px;background:#fff;opacity:0.6"></span>
          <span style="font-family:var(--font-body);font-size:11px;letter-spacing:0.24em;text-transform:uppercase;opacity:.85">${esc(ctx.params.featureIcons?.[i] ?? `0${i + 1}`)}</span>
        </div>
        <div>
          <h3 style="font-family:var(--font-display);font-size:26px;font-weight:500;letter-spacing:-0.015em;line-height:1.05;margin:0 0 10px">${esc(f.title)}</h3>
          <p style="font-size:13px;color:#fff;opacity:.82;margin:0;line-height:1.5;max-width:240px">${esc(f.description.slice(0, 80))}</p>
        </div>
      </div>
      <div class="${ns}-card-cta" style="position:absolute;top:24px;right:24px;width:36px;height:36px;border:1px solid rgba(255,255,255,0.4);color:#fff;display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(-4px);transition:opacity .3s ease, transform .3s ease, border-color .3s ease">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
      </div>
    </a>`,
    )
    .join("");
  return `<section class="mood-slider" style="padding:120px 0 100px;background:var(--ink);overflow:hidden">
  <div style="max-width:1280px;margin:0 auto;padding:0 32px 44px">
    <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:32px;align-items:end">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
          <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.9"></span>
          <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 70%, transparent);margin:0;font-family:var(--font-body)">By mood</p>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;color:var(--paper);line-height:1.04;margin:0">Find what suits the moment.</h2>
      </div>
      <p style="font-size:14px;color:color-mix(in srgb, var(--paper) 70%, transparent);line-height:1.65;max-width:380px;margin:0 0 8px auto;text-align:right;font-family:var(--font-body)">Six small worlds — a category for each kind of day. Drag, swipe, or scroll.</p>
    </div>
  </div>
  <div class="${ns}-track" style="display:flex;gap:18px;padding:0 32px 8px;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch">${items}</div>
</section>
<style>
.${ns}-track::-webkit-scrollbar{display:none}
.${ns}-card{scroll-snap-align:start}
.${ns}-card:hover{transform:translateY(-4px)}
.${ns}-card:hover .${ns}-card-bg{opacity:.5}
.${ns}-card:hover .${ns}-card-cta{opacity:1;transform:translateY(0);border-color:rgba(255,255,255,0.8)}
@media (prefers-reduced-motion: reduce){
  .${ns}-card,.${ns}-card *{transition:none}
  .${ns}-card:hover{transform:none}
}
@media (max-width: 720px){
  .mood-slider > div:first-child > div { grid-template-columns: 1fr; }
  .mood-slider > div:first-child > div > p { text-align: left; margin: 0; max-width: none; }
}
</style>`;
}

// ── Info tabs (3-up boxed sections, brand pillars) ──────────────────────

export function renderInfoTabs(ctx: RenderContext): string {
  const ns = `it-${ctx.slug.slice(0, 10)}`;
  const items = [
    { label: "Story", body: ctx.content.about.body.split(/\n\n/)[0] ?? "" },
    { label: "Process", body: ctx.content.about.mission },
    { label: "Promise", body: ctx.content.footer.tagline },
  ]
    .map(
      (tab, i) => `
    <div class="${ns}-card" style="padding:56px 44px;border:1px solid var(--line);background:var(--paper);position:relative;transition:transform .3s ease, box-shadow .3s ease">
      <div style="display:flex;align-items:baseline;gap:14px;margin-bottom:24px">
        <div style="font-family:var(--font-display);font-weight:300;font-size:clamp(56px,6vw,88px);letter-spacing:-0.04em;line-height:0.9;color:var(--accent)">0${i + 1}</div>
        <span aria-hidden="true" style="flex:1;height:1px;background:var(--line)"></span>
      </div>
      <h3 style="font-size:12px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;margin:0 0 16px;color:var(--ink);font-family:var(--font-body)">${esc(tab.label)}</h3>
      <p style="font-size:15px;line-height:1.7;color:var(--muted);margin:0">${esc(tab.body)}</p>
    </div>`,
    )
    .join("");
  return `<section class="info-tabs" style="padding:120px 0;background:var(--accent-soft)">
  <div class="wrap" style="max-width:1280px">
    <div style="display:grid;grid-template-columns:1fr;gap:18px;align-items:end;margin-bottom:52px;max-width:680px">
      <div style="display:flex;align-items:center;gap:14px">
        <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
        <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.about ?? "The house")}</p>
      </div>
      <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;margin:0">${esc(ctx.content.about.heading)}</h2>
      <p style="font-size:15px;color:var(--muted);max-width:560px;margin:0;line-height:1.6;font-family:var(--font-body)">Three pillars behind every product we make — the story we carry, the process we honour, the promise we keep.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px">${items}</div>
  </div>
</section>
<style>
.${ns}-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,0.05)}
@media (prefers-reduced-motion: reduce){.${ns}-card{transition:none}.${ns}-card:hover{transform:none}}
</style>`;
}

// ── Newsletter capture (retail-style with disclaimer line) ──────────────

export function renderRetailNewsletter(ctx: RenderContext): string {
  const formId = `rnl-${ctx.slug.slice(0, 10)}`;
  return `<section class="retail-newsletter" style="padding:140px 0;border-top:1px solid var(--line);position:relative">
  <div class="wrap" style="max-width:720px;text-align:center;position:relative">
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:22px">
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-weight:500;font-family:var(--font-body)">The letter</p>
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
    </div>
    <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,56px);letter-spacing:-0.025em;line-height:1.04;margin:0 0 18px">${esc(ctx.content.tagline)}</h2>
    <p style="color:var(--muted);font-size:15px;line-height:1.65;margin:0 auto 36px;max-width:520px">${esc(ctx.content.subhead)}</p>
    <form id="${formId}" data-rnl-form="1" style="display:flex;gap:0;max-width:520px;margin:0 auto;border:1px solid var(--line);background:var(--paper);transition:opacity .25s ease, border-color .25s ease" onsubmit="(function(f,e){e.preventDefault();var i=f.querySelector('input');var s=f.parentElement.querySelector('[data-rnl-status]');i.value='';if(s){s.textContent='On the list — first letter arrives soon.';s.style.color='var(--ink)';}f.style.opacity='0.55';f.style.borderColor='var(--accent)';f.style.pointerEvents='none';})(this,event);return false">
      <input type="email" required placeholder="you@example.com" aria-label="Email address" style="flex:1;padding:18px 22px;border:none;background:transparent;font-family:var(--font-body);font-size:14px;letter-spacing:0.01em;outline:none;color:var(--ink)" />
      <button type="submit" style="padding:18px 30px;background:var(--ink);color:var(--paper);border:none;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;cursor:pointer;font-family:var(--font-body);transition:background .2s ease">Subscribe</button>
    </form>
    <p data-rnl-status style="margin:18px 0 0;font-size:12px;color:var(--muted);letter-spacing:0.04em;min-height:1.4em;transition:color .2s ease">By subscribing you agree to our terms. Unsubscribe anytime — no spam, ever.</p>
  </div>
</section>`;
}
