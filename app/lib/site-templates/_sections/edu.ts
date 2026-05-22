// Education / LMS sections.
//
// Course grid, syllabus list, instructor card, learning-path stepper,
// enrollment-focused CTAs. For corporate LMS, online courses, bootcamps,
// professional certificates, training platforms.

import type { RenderContext } from "../schema";
import { esc, renderDecorationsForSection } from "./helpers";

// ── Course grid (features → courses with badge + duration) ──────────────

export function renderCourseGrid(ctx: RenderContext): string {
  const decs = renderDecorationsForSection(ctx.decorations, "features");
  const ns = `cg-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const durations = [
    "6 weeks",
    "8 weeks",
    "4 weeks",
    "12 weeks",
    "6 weeks",
    "10 weeks",
  ];
  const levels = [
    "Beginner",
    "Intermediate",
    "Advanced",
    "All levels",
    "Beginner",
    "Advanced",
  ];
  const clockSvg =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const paceSvg =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M4 6h16M4 12h10M4 18h7"/></svg>';
  const items = ctx.content.features
    .map(
      (f, i) => `
    <a href="/features" class="${ns}-card" style="display:flex;flex-direction:column;text-decoration:none;color:inherit;border:1px solid var(--line);background:var(--paper);overflow:hidden;transition:transform .3s ease, box-shadow .3s ease, border-color .3s ease">
      <div style="aspect-ratio:16/10;background:linear-gradient(${120 + i * 28}deg, var(--accent-soft) 0%, var(--accent) 100%);opacity:.7;position:relative">
        <div style="position:absolute;top:14px;left:14px;padding:6px 12px;background:var(--paper);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;font-family:var(--font-body);color:var(--ink)">${esc(levels[i % levels.length] ?? "All levels")}</div>
        <div class="${ns}-card-arrow" style="position:absolute;bottom:14px;right:14px;width:34px;height:34px;background:var(--paper);display:flex;align-items:center;justify-content:center;color:var(--ink);opacity:0;transform:translateY(4px);transition:opacity .3s ease, transform .3s ease">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
      </div>
      <div style="padding:28px 24px 24px;display:flex;flex-direction:column;gap:14px;flex:1">
        <h3 style="font-family:var(--font-display);font-weight:500;font-size:19px;letter-spacing:-0.012em;margin:0;line-height:1.22">${esc(f.title)}</h3>
        <p style="font-size:14px;color:var(--muted);line-height:1.55;margin:0;flex:1">${esc(f.description)}</p>
        <div style="display:flex;align-items:center;gap:14px;font-size:12px;color:var(--muted);font-family:var(--font-body);padding-top:14px;border-top:1px solid var(--line);margin-top:auto">
          <span style="display:inline-flex;align-items:center;gap:6px">${clockSvg}${esc(durations[i % durations.length] ?? "6 weeks")}</span>
          <span aria-hidden="true" style="opacity:0.4">·</span>
          <span style="display:inline-flex;align-items:center;gap:6px">${paceSvg}Self-paced</span>
        </div>
      </div>
    </a>`,
    )
    .join("");
  const count = ctx.content.features.length;
  return `<section class="course-grid" style="padding:120px 0;position:relative">
${decs}
  <div class="wrap" style="max-width:1280px">
    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:32px;align-items:end;margin-bottom:56px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
          <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
          <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.features ?? "Courses")}</p>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;margin:0">${esc(ctx.content.about.heading || "Learn at your pace.")}</h2>
      </div>
      <p style="font-size:14px;color:var(--muted);line-height:1.65;max-width:360px;margin:0 0 8px auto;text-align:right;font-family:var(--font-body)">${count} ${count === 1 ? "course" : "courses"} · all self-paced, all with live cohort options.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px">${items}</div>
  </div>
</section>
<style>
.${ns}-card:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(0,0,0,0.07);border-color:var(--accent)}
.${ns}-card:hover .${ns}-card-arrow{opacity:1;transform:translateY(0)}
@media (prefers-reduced-motion: reduce){
  .${ns}-card,.${ns}-card *{transition:none}
  .${ns}-card:hover{transform:none}
}
@media (max-width: 720px){
  .course-grid .wrap > div:first-child{grid-template-columns:1fr}
  .course-grid .wrap > div:first-child > p{text-align:left;margin:0;max-width:none}
}
</style>`;
}

// ── Syllabus stepper (FAQ → learning path steps) ────────────────────────

export function renderSyllabus(ctx: RenderContext): string {
  const ns = `syl-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const sourceItems =
    ctx.content.faq.length >= 4
      ? ctx.content.faq.slice(0, 6)
      : ctx.content.features.slice(0, 6);
  const items = sourceItems
    .map((item, i) => {
      const heading = "q" in item ? item.q : (item as { title: string }).title;
      const body =
        "a" in item ? item.a : (item as { description: string }).description;
      const isLast = i === sourceItems.length - 1;
      return `<div class="${ns}-step" style="position:relative;padding:36px 36px 36px 96px;border-left:1px solid var(--line);transition:background-color .3s ease">
      <div style="position:absolute;left:-24px;top:36px;width:48px;height:48px;background:var(--paper);color:var(--accent);border:1px solid var(--line);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:18px;font-weight:500;font-variant-numeric:tabular-nums;letter-spacing:-0.01em;transition:background-color .3s ease, color .3s ease" class="${ns}-step-marker">${String(i + 1).padStart(2, "0")}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span aria-hidden="true" style="display:inline-block;width:18px;height:1px;background:var(--accent);opacity:0.7"></span>
        <span style="font-family:var(--font-body);font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:var(--muted)">Week ${i + 1}${isLast ? " · finale" : ""}</span>
      </div>
      <h3 style="font-family:var(--font-display);font-weight:500;font-size:21px;letter-spacing:-0.014em;margin:0 0 12px;line-height:1.25">${esc(heading)}</h3>
      <p style="font-size:14.5px;color:var(--muted);line-height:1.65;max-width:600px;margin:0">${esc(body)}</p>
    </div>`;
    })
    .join("");
  return `<section class="syllabus" style="padding:140px 0;background:var(--accent-soft)">
  <div class="wrap" style="max-width:980px">
    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:32px;align-items:end;margin-bottom:56px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
          <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
          <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.about ?? "Curriculum")}</p>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;margin:0">${esc(ctx.content.about.heading || "What you'll learn.")}</h2>
      </div>
      <p style="font-size:14px;color:var(--muted);line-height:1.65;max-width:340px;margin:0 0 8px auto;text-align:right;font-family:var(--font-body)">${sourceItems.length} ${sourceItems.length === 1 ? "week" : "weeks"}, paced so you can ship in real life alongside it.</p>
    </div>
    <div style="display:grid;gap:0">${items}</div>
  </div>
</section>
<style>
.${ns}-step:hover{background-color:color-mix(in srgb, var(--paper) 50%, transparent)}
.${ns}-step:hover .${ns}-step-marker{background:var(--accent);color:var(--paper);border-color:var(--accent)}
@media (prefers-reduced-motion: reduce){
  .${ns}-step,.${ns}-step-marker{transition:none}
}
@media (max-width: 720px){
  .syllabus .wrap > div:first-child{grid-template-columns:1fr}
  .syllabus .wrap > div:first-child > p{text-align:left;margin:0;max-width:none}
}
</style>`;
}

// ── Instructor card (testimonial → instructor profile) ──────────────────

export function renderInstructorCard(ctx: RenderContext): string {
  const t = ctx.content.testimonials[0];
  if (!t) return "";
  const ns = `ic-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const initials =
    (t.author ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "·";
  return `<section class="instructor" style="padding:140px 0">
  <div class="wrap" style="max-width:1120px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:64px;align-items:center">
      <div class="${ns}-portrait" style="position:relative;max-width:360px">
        <div style="aspect-ratio:1/1;background:linear-gradient(135deg, var(--accent) 0%, var(--ink) 100%);position:relative;overflow:hidden;transition:transform .4s ease">
          <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)"></div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:300;font-size:clamp(72px,12vw,128px);color:var(--paper);letter-spacing:-0.04em;line-height:1;opacity:0.92">${esc(initials)}</div>
          <span aria-hidden="true" style="position:absolute;left:18px;top:18px;font-family:var(--font-body);font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--paper);background:rgba(0,0,0,0.4);padding:6px 12px;backdrop-filter:blur(8px);font-weight:500">Faculty · 01</span>
        </div>
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
          <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.testimonials ?? "Lead instructor")}</p>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,56px);letter-spacing:-0.025em;line-height:1.04;margin:0 0 8px">${esc(t.author)}</h2>
        <p style="font-family:var(--font-body);font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:var(--muted);margin:0 0 32px;font-weight:500">${esc(t.role)}</p>
        <div style="position:relative;padding:0 0 0 28px;border-left:2px solid var(--accent)">
          <span aria-hidden="true" style="position:absolute;left:-7px;top:-12px;font-family:var(--font-display);font-size:48px;line-height:1;color:var(--accent);opacity:0.6">&ldquo;</span>
          <blockquote style="font-family:var(--font-display);font-weight:400;font-size:19px;line-height:1.55;color:var(--ink);max-width:540px;margin:0">${esc(t.quote)}</blockquote>
        </div>
      </div>
    </div>
  </div>
</section>
<style>
.${ns}-portrait:hover > div{transform:scale(1.02)}
@media (prefers-reduced-motion: reduce){
  .${ns}-portrait > div{transition:none}
  .${ns}-portrait:hover > div{transform:none}
}
</style>`;
}

// ── Enrollment band (replaces generic CTA — concrete enrollment language) ──

export function renderEnrollmentBand(ctx: RenderContext): string {
  const ns = `enr-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  // Derive a near-month-out date for the "Next cohort" stamp.  Stable per
  // render (no client clock dependency) — uses build-time UTC date + 28 days.
  const cohort = new Date(Date.now() + 28 * 86400_000);
  const cohortLabel = cohort
    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    .toUpperCase();
  return `<section class="enrollment" style="padding:160px 0;background:var(--ink);color:var(--paper);text-align:center;position:relative;overflow:hidden">
  <div aria-hidden="true" style="position:absolute;inset:0;background:radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 55%);pointer-events:none"></div>
  <div class="wrap" style="max-width:720px;position:relative">
    <div style="display:inline-flex;align-items:center;gap:14px;padding:10px 20px;border:1px solid color-mix(in srgb, var(--paper) 30%, transparent);margin-bottom:32px;font-family:var(--font-body)">
      <span aria-hidden="true" style="position:relative;display:inline-flex;width:8px;height:8px">
        <span style="position:absolute;inset:0;border-radius:50%;background:var(--accent);opacity:0.7;animation:${ns}-pulse 1.8s ease-out infinite"></span>
        <span style="position:relative;width:8px;height:8px;border-radius:50%;background:var(--accent)"></span>
      </span>
      <span style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 88%, transparent);font-weight:500">Next cohort opens ${esc(cohortLabel)}</span>
    </div>
    <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5.5vw,72px);letter-spacing:-0.03em;line-height:1.02;color:var(--paper);margin:0 0 24px">${esc(ctx.content.tagline)}</h2>
    <p style="font-size:17px;color:color-mix(in srgb, var(--paper) 85%, transparent);line-height:1.65;margin:0 auto 44px;max-width:540px">${esc(ctx.content.subhead)}</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a href="/contact" class="${ns}-cta-primary" style="display:inline-flex;align-items:center;gap:10px;padding:16px 32px;background:var(--accent);color:var(--inkOnAccent,#fff);text-decoration:none;font-family:var(--font-body);font-size:13px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;border-radius:999px;transition:transform .2s ease, filter .2s ease">
        Apply now
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="transition:transform .25s ease" class="${ns}-cta-arrow"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </a>
      <a href="/pricing" class="${ns}-cta-secondary" style="display:inline-flex;align-items:center;padding:16px 28px;border:1px solid color-mix(in srgb, var(--paper) 30%, transparent);color:var(--paper);text-decoration:none;font-family:var(--font-body);font-size:13px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;border-radius:999px;transition:background .25s ease, border-color .25s ease">View tuition</a>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-top:36px;flex-wrap:wrap;font-family:var(--font-body);font-size:11.5px;letter-spacing:0.06em;color:color-mix(in srgb, var(--paper) 65%, transparent)">
      <span style="display:inline-flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>Refund within 14 days</span>
      <span aria-hidden="true" style="opacity:0.4">·</span>
      <span style="display:inline-flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/></svg>Reply within 24h</span>
      <span aria-hidden="true" style="opacity:0.4">·</span>
      <span style="display:inline-flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Self-paced</span>
    </div>
  </div>
</section>
<style>
@keyframes ${ns}-pulse{0%{transform:scale(1);opacity:0.7}70%{transform:scale(2.4);opacity:0}100%{transform:scale(2.4);opacity:0}}
.${ns}-cta-primary:hover{filter:brightness(1.08);transform:translateY(-1px)}
.${ns}-cta-primary:hover .${ns}-cta-arrow{transform:translateX(4px)}
.${ns}-cta-secondary:hover{background:color-mix(in srgb, var(--paper) 10%, transparent);border-color:var(--paper)}
@media (prefers-reduced-motion: reduce){
  .${ns}-cta-primary,.${ns}-cta-primary .${ns}-cta-arrow,.${ns}-cta-secondary{transition:none}
  .${ns}-cta-primary:hover{transform:none}
  .${ns}-cta-primary:hover .${ns}-cta-arrow{transform:none}
  *[style*="${ns}-pulse"]{animation:none}
}
</style>`;
}

// ── Trust badges (university / corporate logos placeholder) ─────────────

export function renderEduTrustBadges(ctx: RenderContext): string {
  const ns = `tb-${ctx.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "def"}`;
  const items =
    ctx.content.testimonials.length > 0
      ? ctx.content.testimonials.map(
          (t) => t.role.split(",").pop()?.trim() ?? "Partner",
        )
      : ["Partner Co", "Northwind", "Linecraft", "Beam & Co", "Acme Studio"];
  const shown = items.slice(0, 5);
  return `<section style="padding:72px 0 64px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:color-mix(in srgb, var(--paper) 96%, var(--accent) 4%)">
  <div class="wrap" style="max-width:1280px;margin:0 auto;padding:0 32px">
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:36px">
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.testimonials ?? "Alumni at")}</p>
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:stretch">
      ${shown
        .map(
          (
            name,
            i,
          ) => `<div class="${ns}-badge" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:18px 16px;${i === shown.length - 1 ? "" : "border-right:1px solid var(--line);"}transition:background-color .3s ease, color .3s ease">
        <span style="font-family:var(--font-display);font-weight:500;font-size:16px;letter-spacing:-0.005em;color:var(--ink);transition:color .3s ease">${esc(name)}</span>
        <span aria-hidden="true" style="display:inline-block;width:18px;height:1px;background:var(--line);transition:background-color .3s ease, width .3s ease" class="${ns}-badge-rule"></span>
        <span style="font-family:var(--font-body);font-size:9.5px;letter-spacing:0.22em;text-transform:uppercase;color:var(--muted)">Alumna · ${String(i + 1).padStart(2, "0")}</span>
      </div>`,
        )
        .join("")}
    </div>
  </div>
</section>
<style>
.${ns}-badge:hover{background-color:color-mix(in srgb, var(--accent-soft) 70%, transparent)}
.${ns}-badge:hover .${ns}-badge-rule{background-color:var(--accent);width:32px}
@media (prefers-reduced-motion: reduce){
  .${ns}-badge,.${ns}-badge-rule,.${ns}-badge span{transition:none}
}
@media (max-width: 720px){
  section [style*="border-right"]{border-right:none;border-bottom:1px solid var(--line)}
}
</style>`;
}
