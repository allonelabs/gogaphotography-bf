// Hotel / hospitality sections.
//
// Aesthetic source: github.com/allonelabs/Afisha-Hotel. Cinematic noir +
// warm cream accents, Cormorant Garamond display, overlay heritage shots,
// suite cards with price-per-night, amenity glyph grid.
//
// Consumes the same RenderContext as other sections — palette/fonts/motion
// drop through the variant system; this file owns hotel-specific layouts.

import type { RenderContext } from "../schema";
import { esc, renderDecorationsForSection } from "./helpers";

// ── Booking band (sticky-ish strip with date pickers) ──────────────────

export function renderBookingBand(ctx: RenderContext): string {
  const ns = `bb-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  return `<section class="booking-band" style="background:var(--ink);color:var(--paper);padding:36px 0 32px;position:relative;z-index:5;border-top:1px solid color-mix(in srgb, var(--paper) 12%, transparent)">
  <div class="wrap" style="max-width:1280px;margin:0 auto;padding:0 32px">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
      <span aria-hidden="true" style="display:inline-block;width:28px;height:1px;background:var(--accent);opacity:0.95"></span>
      <p style="font-size:10.5px;letter-spacing:0.3em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 75%, transparent);margin:0;font-family:var(--font-body);font-weight:500">Reserve directly</p>
      <span style="margin-left:auto;font-size:11px;color:color-mix(in srgb, var(--paper) 55%, transparent);font-family:var(--font-body);letter-spacing:0.05em">Best rate · no fees · instant confirmation</span>
    </div>
    <form class="${ns}-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;align-items:end" onsubmit="window.location.href='/contact';return false">
      <div>
        <label for="${ns}-in" style="display:block;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 65%, transparent);margin-bottom:8px;font-family:var(--font-body);font-weight:500">Check in</label>
        <input id="${ns}-in" name="checkin" type="date" class="${ns}-field" style="width:100%;background:transparent;border:none;border-bottom:1px solid color-mix(in srgb, var(--paper) 30%, transparent);padding:8px 0;color:var(--paper);font-family:var(--font-display);font-size:18px;outline:none;transition:border-color .25s ease;color-scheme:dark"/>
      </div>
      <div>
        <label for="${ns}-out" style="display:block;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 65%, transparent);margin-bottom:8px;font-family:var(--font-body);font-weight:500">Check out</label>
        <input id="${ns}-out" name="checkout" type="date" class="${ns}-field" style="width:100%;background:transparent;border:none;border-bottom:1px solid color-mix(in srgb, var(--paper) 30%, transparent);padding:8px 0;color:var(--paper);font-family:var(--font-display);font-size:18px;outline:none;transition:border-color .25s ease;color-scheme:dark"/>
      </div>
      <div>
        <label for="${ns}-g" style="display:block;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 65%, transparent);margin-bottom:8px;font-family:var(--font-body);font-weight:500">Guests</label>
        <select id="${ns}-g" name="guests" class="${ns}-field" style="width:100%;background:transparent;border:none;border-bottom:1px solid color-mix(in srgb, var(--paper) 30%, transparent);padding:8px 0;color:var(--paper);font-family:var(--font-display);font-size:18px;outline:none;transition:border-color .25s ease;cursor:pointer">
          <option value="2" style="color:#000">2 Adults</option>
          <option value="1" style="color:#000">1 Adult</option>
          <option value="3" style="color:#000">3 Adults</option>
          <option value="4" style="color:#000">4 Adults</option>
          <option value="family" style="color:#000">Family · 2+2</option>
        </select>
      </div>
      <div>
        <button type="submit" class="${ns}-cta" style="display:inline-flex;align-items:center;justify-content:center;gap:10px;width:100%;height:52px;background:var(--accent);color:var(--inkOnAccent,#fff);border:none;font-family:var(--font-body);font-size:12px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;cursor:pointer;transition:transform .2s ease, filter .2s ease;border-radius:999px">
          ${esc(ctx.content.primaryCta)}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="transition:transform .25s ease" class="${ns}-cta-arrow"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </div>
    </form>
  </div>
</section>
<style>
.${ns}-field:focus{border-bottom-color:var(--accent)}
.${ns}-cta:hover{filter:brightness(1.08);transform:translateY(-1px)}
.${ns}-cta:hover .${ns}-cta-arrow{transform:translateX(4px)}
@media (prefers-reduced-motion: reduce){
  .${ns}-cta,.${ns}-cta-arrow,.${ns}-field{transition:none}
  .${ns}-cta:hover{transform:none}
  .${ns}-cta:hover .${ns}-cta-arrow{transform:none}
}
@media (max-width: 720px){
  .booking-band > .wrap > div:first-child > span:last-child{display:none}
}
</style>`;
}

// ── Heritage / story section (image bg, centered text, overlay) ─────────

export function renderHeritage(ctx: RenderContext): string {
  const hero = ctx.assets?.heroImageUrl;
  const decs = renderDecorationsForSection(ctx.decorations, "features");
  // Try to extract an "EST 19XX" / "Since 19XX" year from the superline or
  // about body so the heritage stamp feels grounded, not generic.
  const sourceText = `${ctx.params.taglineSuperline ?? ""} ${ctx.content.about.body ?? ""}`;
  const yearMatch =
    sourceText.match(/(?:est\.?|since|founded)\D*((?:19|20)\d{2})/i) ??
    sourceText.match(/((?:19|20)\d{2})/);
  const sinceYear = yearMatch?.[1];
  return `<section class="heritage" style="position:relative;min-height:88vh;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--paper);overflow:hidden">
${decs}
  <div style="position:absolute;inset:0;z-index:0">
    ${
      hero
        ? `<img class="hero-photo" src="${esc(hero)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>`
        : `<div style="position:absolute;inset:0;background:linear-gradient(180deg, var(--ink) 0%, var(--accent) 100%)"></div>`
    }
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.7) 100%)"></div>
  </div>
  <div style="position:relative;z-index:1;max-width:820px;padding:0 32px">
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:32px">
      <span aria-hidden="true" style="display:inline-block;width:42px;height:1px;background:var(--paper);opacity:0.55"></span>
      <p style="font-size:11px;letter-spacing:0.34em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 80%, transparent);margin:0;font-family:var(--font-body);font-weight:500">${esc(ctx.params.customLabels?.about ?? "Our Heritage")}</p>
      <span aria-hidden="true" style="display:inline-block;width:42px;height:1px;background:var(--paper);opacity:0.55"></span>
    </div>
    <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(40px,6.5vw,84px);letter-spacing:-0.025em;line-height:1.02;margin:0 0 32px;color:var(--paper)">${esc(ctx.content.about.heading)}</h2>
    <p style="font-size:18px;line-height:1.7;color:color-mix(in srgb, var(--paper) 90%, transparent);max-width:640px;margin:0 auto 40px">${esc(ctx.content.about.mission)}</p>
    ${
      sinceYear
        ? `<div style="display:inline-flex;align-items:center;gap:14px;padding:14px 24px;border:1px solid color-mix(in srgb, var(--paper) 35%, transparent);font-family:var(--font-body);font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 85%, transparent);font-variant-numeric:tabular-nums">
      <span>Est.</span><span style="font-family:var(--font-display);font-size:18px;letter-spacing:0.04em;color:var(--paper);font-weight:500">${esc(sinceYear)}</span>
    </div>`
        : ""
    }
  </div>
  <svg aria-hidden="true" style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);z-index:1;color:color-mix(in srgb, var(--paper) 70%, transparent);animation:heritage-bob 2.4s ease-in-out infinite" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
  <style>
  @keyframes heritage-bob{0%,100%{transform:translateX(-50%) translateY(0);opacity:0.7}50%{transform:translateX(-50%) translateY(6px);opacity:1}}
  @media (prefers-reduced-motion: reduce){.heritage svg{animation:none}}
  </style>
</section>`;
}

// ── Rooms / suites grid ────────────────────────────────────────────────

export function renderRoomsGrid(ctx: RenderContext): string {
  const decs = renderDecorationsForSection(ctx.decorations, "pricing");
  // Hotel-vertical pricing. Lifted to chunk-138 pricing-cards bar while
  // keeping hotel character: 4:3 image area, "Suite" kicker, "/night" period.
  // Highlighted suite inverts to ink bg + paper text + accent CTA (same
  // pattern as chunk 138). Vector SVG checkmarks replace ·-bullets.
  const ns = `rm-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const heroPhoto = ctx.assets?.heroImageUrl;
  const checkSvg =
    '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:5px"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const cards = ctx.content.pricing
    .map((p, i) => {
      const isHi = !!p.highlighted;
      const bg = isHi ? "var(--ink)" : "var(--paper)";
      const textColor = isHi ? "var(--paper)" : "var(--ink)";
      const mutedColor = isHi ? "rgba(255,255,255,0.7)" : "var(--muted)";
      const checkColor = isHi ? "var(--paper)" : "var(--accent)";
      const features = p.features
        .map(
          (f) =>
            `<li style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;padding:5px 0;color:${textColor}"><span style="color:${checkColor}">${checkSvg}</span><span>${esc(f)}</span></li>`,
        )
        .join("");
      // Photo backdrop: highlighted suite gets the hero image as a tinted
      // backdrop, others get a deterministic gradient angle from index.
      const photoBg =
        isHi && heroPhoto
          ? `background-image:url('${esc(heroPhoto)}');background-size:cover;background-position:center;`
          : `background:linear-gradient(${135 + i * 25}deg, var(--accent-soft) 0%, var(--accent) 100%);opacity:.55;`;
      return `<article class="${ns}-card" style="position:relative;background:${bg};color:${textColor};overflow:hidden;border:1px solid ${isHi ? "var(--ink)" : "var(--line)"};display:flex;flex-direction:column;transition:transform 200ms ease, box-shadow 200ms ease">
      <div style="aspect-ratio:4/3;position:relative;overflow:hidden;${photoBg}">
        ${isHi ? `<span style="position:absolute;top:16px;right:16px;display:inline-block;padding:6px 12px;background:var(--accent);color:var(--inkOnAccent,#fff);font-family:var(--font-body);font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;border-radius:999px">Most booked</span>` : ""}
      </div>
      <div style="padding:32px 28px 28px;display:flex;flex-direction:column;gap:18px;flex:1">
        <header style="display:flex;flex-direction:column;gap:6px">
          <p style="margin:0;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:${mutedColor};font-family:var(--font-body)">Suite</p>
          <h3 style="margin:0;font-family:var(--font-display);font-size:24px;font-weight:500;letter-spacing:-0.01em;line-height:1.15">${esc(p.name)}</h3>
          <p style="margin:6px 0 0;font-size:14px;line-height:1.55;color:${mutedColor};min-height:3em">${esc(p.description)}</p>
        </header>
        <ul style="list-style:none;margin:0;padding:14px 0 0;border-top:1px solid ${isHi ? "rgba(255,255,255,0.18)" : "var(--line)"}">${features}</ul>
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:16px;border-top:1px solid ${isHi ? "rgba(255,255,255,0.18)" : "var(--line)"};margin-top:auto">
          <div>
            <span style="font-family:var(--font-display);font-size:28px;font-weight:500;letter-spacing:-0.02em">${esc(p.price)}</span>
            <span style="font-size:13px;color:${mutedColor};margin-left:2px">${esc(p.period || "/ night")}</span>
          </div>
          <a href="/contact" style="display:inline-flex;align-items:center;height:36px;padding:0 18px;border-radius:999px;background:${isHi ? "var(--accent)" : "transparent"};color:${isHi ? "var(--inkOnAccent,#fff)" : "var(--ink)"};border:1px solid ${isHi ? "var(--accent)" : "var(--ink)"};font-family:var(--font-body);font-size:11px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none">${esc(p.cta)}</a>
        </div>
      </div>
    </article>`;
    })
    .join("");
  const tagline =
    ctx.content.tagline && ctx.content.tagline.length < 100
      ? ctx.content.tagline
      : "Each suite shaped by the view";
  return `<section class="rooms" style="padding:120px 0;position:relative">
${decs}
  <div class="wrap" style="max-width:1280px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start;margin-bottom:64px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">${esc(ctx.params.customLabels?.pricing ?? "Accommodations")}</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,56px);font-weight:400;letter-spacing:-0.025em;line-height:1.05;font-family:var(--font-display)">${esc(tagline)}</h2>
      </div>
      <p style="margin:0;align-self:end;max-width:42ch;color:var(--muted);font-size:16px;line-height:1.6">Rates per room per night. Includes breakfast, late checkout when available, and the unhurried pace.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;align-items:stretch">${cards}</div>
  </div>
  <style>
    .${ns}-card:hover { transform: translateY(-3px); box-shadow: 0 14px 36px -18px rgba(0,0,0,0.20); }
    @media (prefers-reduced-motion: reduce) { .${ns}-card:hover { transform: none; box-shadow: none; } }
  </style>
</section>`;
}

// ── Amenities grid (features = amenities for hotel) ─────────────────────

export function renderAmenitiesGrid(ctx: RenderContext): string {
  const icons = ctx.params.featureIcons;
  // Hotel-vertical amenities. Lifted to chunk-139 bar (features grid-card)
  // while keeping the hotel character — accent-soft section bg + centered
  // editorial header + 40px icon plate + "01" index + hover lift.
  const ns = `am-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const items = ctx.content.features
    .map((f, i) => {
      const icon = icons?.[i] ?? "◆";
      const idx = String(i + 1).padStart(2, "0");
      return `<article class="${ns}-card" style="position:relative;padding:32px 28px;background:var(--paper);display:flex;flex-direction:column;gap:18px;transition:transform 200ms ease, box-shadow 200ms ease">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:var(--accent-soft);color:var(--accent);font-family:var(--font-display);font-size:18px;font-weight:600;line-height:1">${esc(icon)}</span>
        <span style="font-family:var(--font-body);font-size:11px;letter-spacing:0.06em;color:var(--muted);font-feature-settings:'tnum'">${idx}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <h3 style="margin:0;font-family:var(--font-display);font-size:18px;font-weight:500;line-height:1.25;letter-spacing:-0.005em;color:var(--ink)">${esc(f.title)}</h3>
        <p style="margin:0;font-size:14px;line-height:1.6;color:var(--muted)">${esc(f.description)}</p>
      </div>
    </article>`;
    })
    .join("");
  const tagline =
    ctx.content.tagline && ctx.content.tagline.length < 100
      ? ctx.content.tagline
      : "Everything considered, nothing extra";
  return `<section class="amenities" style="padding:120px 0;background:var(--accent-soft);position:relative">
  <div class="wrap" style="max-width:1280px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start;margin-bottom:64px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">${esc(ctx.params.customLabels?.features ?? "Amenities")}</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,56px);font-weight:400;letter-spacing:-0.025em;line-height:1.05;font-family:var(--font-display)">${esc(tagline)}</h2>
      </div>
      <p style="margin:0;align-self:end;max-width:42ch;color:var(--muted);font-size:16px;line-height:1.6">Considered touches that quietly improve the stay — selected, not stuffed in.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1px;background:var(--line);border:1px solid var(--line)">${items}</div>
  </div>
  <style>
    .${ns}-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px -14px rgba(0,0,0,0.12); }
    @media (prefers-reduced-motion: reduce) { .${ns}-card:hover { transform: none; box-shadow: none; } }
  </style>
</section>`;
}

// ── Gallery strip (horizontal scrolling photos / placeholders) ──────────

export function renderGalleryStrip(ctx: RenderContext): string {
  const hero = ctx.assets?.heroImageUrl;
  const ns = `gs-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  // 6 tiles — first two use hero; remaining are deterministic gradient
  // placeholders that vary in angle and tint by index.
  const captions = [
    "The garden",
    "Suite IX",
    "Morning light",
    "The terrace",
    "After dusk",
    "In the salon",
  ];
  const tiles = Array.from({ length: 6 })
    .map((_, i) => {
      const useHero = i === 0 && hero;
      const angle = 100 + i * 30;
      const opa = 0.4 + (i % 4) * 0.08;
      return `<figure class="${ns}-tile" style="flex:0 0 360px;aspect-ratio:4/5;background:var(--accent-soft);position:relative;overflow:hidden;margin:0;scroll-snap-align:start">
      ${
        useHero
          ? `<img src="${esc(hero)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .8s ease" class="${ns}-img"/>`
          : `<div style="position:absolute;inset:0;background:linear-gradient(${angle}deg, var(--accent) 0%, var(--ink) 100%);opacity:${opa.toFixed(2)}" class="${ns}-img"></div>`
      }
      <figcaption style="position:absolute;left:18px;bottom:18px;right:18px;display:flex;align-items:center;gap:10px;color:var(--paper)">
        <span aria-hidden="true" style="font-family:var(--font-body);font-size:10px;letter-spacing:0.24em;color:color-mix(in srgb, var(--paper) 70%, transparent);font-variant-numeric:tabular-nums">${String(i + 1).padStart(2, "0")}</span>
        <span aria-hidden="true" style="display:inline-block;width:18px;height:1px;background:color-mix(in srgb, var(--paper) 55%, transparent)"></span>
        <span style="font-family:var(--font-display);font-size:14px;letter-spacing:-0.005em">${esc(captions[i] ?? `Frame ${i + 1}`)}</span>
      </figcaption>
    </figure>`;
    })
    .join("");
  return `<section class="gallery-strip" style="padding:120px 0 100px;background:var(--ink);overflow:hidden">
  <div style="max-width:1280px;margin:0 auto;padding:0 32px 44px">
    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:32px;align-items:end">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
          <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.9"></span>
          <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 70%, transparent);margin:0;font-family:var(--font-body)">Gallery</p>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;color:var(--paper);margin:0">A look around.</h2>
      </div>
      <p style="font-size:14px;color:color-mix(in srgb, var(--paper) 70%, transparent);line-height:1.65;max-width:360px;margin:0 0 8px auto;text-align:right;font-family:var(--font-body)">Six rooms of the house, photographed at the hours we like best. Drag, swipe, or scroll.</p>
    </div>
  </div>
  <div class="${ns}-track" style="display:flex;gap:18px;padding:0 32px 8px;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch">${tiles}</div>
</section>
<style>
.${ns}-track::-webkit-scrollbar{display:none}
.${ns}-tile:hover .${ns}-img{transform:scale(1.04)}
@media (prefers-reduced-motion: reduce){
  .${ns}-img{transition:none}
  .${ns}-tile:hover .${ns}-img{transform:none}
}
@media (max-width: 720px){
  .gallery-strip > div:first-child > div{grid-template-columns:1fr}
  .gallery-strip > div:first-child > div > p{text-align:left;margin:0;max-width:none}
  .${ns}-tile{flex:0 0 84vw}
}
</style>`;
}

// ── Location (single column with map placeholder + text) ────────────────

export function renderLocation(ctx: RenderContext): string {
  const ns = `loc-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  // Try to extract a city/jurisdiction hint from the brief for the address
  // line. Falls back to a soft "By appointment" when nothing surfaces.
  const cityHint =
    (ctx.params.taglineSuperline ?? "").match(
      /([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/,
    )?.[1] ?? null;
  return `<section class="location" style="padding:140px 0">
  <div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:64px;max-width:1280px;align-items:center">
    <div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
        <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
        <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.contact ?? "Where to find us")}</p>
      </div>
      <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;margin:0 0 28px">${esc("On the right side of quiet.")}</h2>
      <p style="font-size:16px;line-height:1.7;color:var(--muted);margin:0 0 36px;max-width:480px">${esc(ctx.content.contact.blurb)}</p>
      <dl style="display:grid;grid-template-columns:1fr;gap:18px;margin:0 0 36px;max-width:420px">
        <div style="display:grid;grid-template-columns:90px 1fr;gap:16px;align-items:baseline;padding:14px 0;border-top:1px solid var(--line)">
          <dt style="font-family:var(--font-body);font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--muted)">By area</dt>
          <dd style="margin:0;font-family:var(--font-display);font-size:15px;color:var(--ink);font-weight:500;letter-spacing:-0.005em">${esc(cityHint ?? "By appointment")}</dd>
        </div>
        <div style="display:grid;grid-template-columns:90px 1fr;gap:16px;align-items:baseline;padding:14px 0;border-top:1px solid var(--line)">
          <dt style="font-family:var(--font-body);font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--muted)">Hours</dt>
          <dd style="margin:0;font-family:var(--font-display);font-size:15px;color:var(--ink);font-weight:500;letter-spacing:-0.005em">Reception · 24h</dd>
        </div>
        <div style="display:grid;grid-template-columns:90px 1fr;gap:16px;align-items:baseline;padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
          <dt style="font-family:var(--font-body);font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--muted)">Email</dt>
          <dd style="margin:0;font-family:var(--font-display);font-size:15px;color:var(--ink);font-weight:500;letter-spacing:-0.005em;overflow-wrap:anywhere"><a href="mailto:${esc(ctx.content.contact.email)}" style="color:var(--ink);text-decoration:none;border-bottom:1px solid var(--accent)">${esc(ctx.content.contact.email)}</a></dd>
        </div>
      </dl>
      <a href="mailto:${esc(ctx.content.contact.email)}?subject=Reservation%20inquiry" class="${ns}-cta" style="display:inline-flex;align-items:center;gap:10px;padding:14px 26px;border:1px solid var(--ink);color:var(--ink);text-decoration:none;font-family:var(--font-body);font-size:13px;letter-spacing:0.06em;font-weight:500;transition:background .25s ease, color .25s ease">
        Write to the concierge
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="${ns}-cta-arrow" style="transition:transform .25s ease"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </a>
    </div>
    <div class="${ns}-map" style="aspect-ratio:4/3;background:var(--accent-soft);position:relative;overflow:hidden;color:var(--ink)">
      <div style="position:absolute;inset:0;background:
        radial-gradient(circle at 30% 40%, var(--accent) 0%, transparent 30%),
        radial-gradient(circle at 70% 60%, var(--ink) 0%, transparent 25%);
        opacity:.18"></div>
      <svg viewBox="0 0 400 300" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true">
        <g stroke="currentColor" stroke-opacity="0.18" fill="none">
          <line x1="0" y1="50" x2="400" y2="50"/><line x1="0" y1="100" x2="400" y2="100"/><line x1="0" y1="150" x2="400" y2="150"/><line x1="0" y1="200" x2="400" y2="200"/><line x1="0" y1="250" x2="400" y2="250"/>
          <line x1="50" y1="0" x2="50" y2="300"/><line x1="100" y1="0" x2="100" y2="300"/><line x1="150" y1="0" x2="150" y2="300"/><line x1="200" y1="0" x2="200" y2="300"/><line x1="250" y1="0" x2="250" y2="300"/><line x1="300" y1="0" x2="300" y2="300"/><line x1="350" y1="0" x2="350" y2="300"/>
        </g>
        <path d="M 40 220 Q 120 150 200 150 T 360 80" stroke="var(--accent)" stroke-opacity="0.35" stroke-width="2" fill="none" stroke-dasharray="6 4"/>
        <circle class="${ns}-pin-ring" cx="200" cy="150" r="22" fill="none" stroke="var(--accent)" stroke-opacity="0.5"/>
        <circle class="${ns}-pin-pulse" cx="200" cy="150" r="14" fill="var(--accent)" fill-opacity="0.25"/>
        <circle cx="200" cy="150" r="9" fill="var(--accent)"/>
        <circle cx="200" cy="150" r="3" fill="var(--paper)"/>
      </svg>
      <span style="position:absolute;top:18px;left:18px;font-family:var(--font-body);font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:var(--ink);background:color-mix(in srgb, var(--paper) 90%, transparent);padding:6px 12px;font-weight:500">Approx · ${esc(cityHint ?? "the house")}</span>
    </div>
  </div>
</section>
<style>
.${ns}-cta:hover{background:var(--ink);color:var(--paper)}
.${ns}-cta:hover .${ns}-cta-arrow{transform:translateX(4px)}
.${ns}-pin-pulse{transform-origin:200px 150px;animation:${ns}-pulse 2.4s ease-out infinite}
@keyframes ${ns}-pulse{0%{transform:scale(1);opacity:0.45}70%{transform:scale(2.2);opacity:0}100%{transform:scale(2.2);opacity:0}}
@media (prefers-reduced-motion: reduce){
  .${ns}-cta,.${ns}-cta-arrow{transition:none}
  .${ns}-cta:hover .${ns}-cta-arrow{transform:none}
  .${ns}-pin-pulse{animation:none}
}
</style>`;
}
