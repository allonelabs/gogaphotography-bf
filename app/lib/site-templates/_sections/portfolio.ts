// Portfolio / creative-agency sections.
//
// Big editorial type, monochrome restraint, project-grid as primary content,
// awwwards-aesthetic. For utopiatokyo-style creative studios, portfolios,
// independent designers, motion houses.

import type { RenderContext } from '../schema';
import { esc, renderDecorationsForSection } from './helpers';

// ── Project grid (features → projects with year + medium) ───────────────

export function renderProjectGrid(ctx: RenderContext): string {
  const decs = renderDecorationsForSection(ctx.decorations, 'features');
  const ns = `pg-${ctx.slug.slice(0, 10)}`;
  const items = ctx.content.features.map((f, i) => {
    const year = 2024 + (i % 3);
    return `<a href="/features" class="${ns}-row" style="position:relative;display:block;text-decoration:none;color:inherit;border-bottom:1px solid var(--line);padding:48px 0;transition:padding-left .35s ease, background-color .35s ease">
      <div style="display:grid;grid-template-columns:72px 1fr auto 28px;gap:32px;align-items:baseline">
        <span style="font-family:var(--font-display);font-size:13px;color:var(--muted);letter-spacing:0.08em;font-variant-numeric:tabular-nums">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <h3 class="${ns}-title" style="font-family:var(--font-display);font-weight:400;font-size:clamp(28px,4vw,52px);letter-spacing:-0.025em;line-height:1.02;margin:0 0 10px;transition:color .35s ease">${esc(f.title)}</h3>
          <p style="font-size:14px;color:var(--muted);max-width:560px;line-height:1.55;margin:0">${esc(f.description)}</p>
        </div>
        <span style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body);font-variant-numeric:tabular-nums">${year}</span>
        <span aria-hidden="true" class="${ns}-arrow" style="display:inline-flex;align-items:center;justify-content:flex-end;width:28px;color:var(--ink);opacity:0;transform:translateX(-8px);transition:opacity .35s ease, transform .35s ease">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </span>
      </div>
    </a>`;
  }).join('');
  const count = ctx.content.features.length;
  const yearRange = `${2024} — ${2024 + ((count - 1) % 3)}`;
  return `<section class="project-grid" style="position:relative;padding:120px 0 96px">
${decs}
  <div class="wrap" style="max-width:1200px">
    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:32px;align-items:end;margin-bottom:64px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
          <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
          <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.features ?? 'Selected work')}</p>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5.5vw,72px);letter-spacing:-0.03em;line-height:1.02;margin:0">${esc(ctx.content.about.heading || 'A few things we made.')}</h2>
      </div>
      <div style="text-align:right;font-family:var(--font-body);font-size:13px;color:var(--muted);line-height:1.55;max-width:300px;margin:0 0 8px auto">
        <p style="margin:0 0 6px">${count} projects · ${esc(yearRange)}</p>
        <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase">Index</p>
      </div>
    </div>
    ${items}
  </div>
</section>
<style>
.${ns}-row:hover{padding-left:24px;background-color:color-mix(in srgb, var(--accent-soft) 60%, transparent)}
.${ns}-row:hover .${ns}-title{color:var(--accent)}
.${ns}-row:hover .${ns}-arrow{opacity:1;transform:translateX(0)}
@media (prefers-reduced-motion: reduce){
  .${ns}-row,.${ns}-row *{transition:none}
  .${ns}-row:hover{padding-left:0;background:transparent}
  .${ns}-row:hover .${ns}-arrow{opacity:1;transform:none}
}
@media (max-width: 720px){
  .project-grid .wrap > div:first-child{grid-template-columns:1fr}
  .project-grid .wrap > div:first-child > div:last-child{text-align:left;margin:0;max-width:none}
}
</style>`;
}

// ── Case study spotlight (one large feature, taken from first pricing) ──

export function renderCaseStudy(ctx: RenderContext): string {
  const hero = ctx.assets?.heroImageUrl;
  const study = ctx.content.testimonials[0] ?? ctx.content.features[0];
  if (!study) return '';
  const isTest = 'quote' in study;
  const ns = `cs-${ctx.slug.slice(0, 10)}`;
  const heading = isTest
    ? (study as { quote: string }).quote.split(/[.!?]/)[0] ?? ''
    : (study as { title: string }).title;
  const body = isTest
    ? (study as { quote: string }).quote
    : (study as { description: string }).description;
  const attribution = isTest
    ? ((study as { author?: string; role?: string }).author ?? '')
    : ctx.name;
  return `<section class="case-study" style="padding:140px 0;background:var(--ink);color:var(--paper);overflow:hidden;position:relative">
  <div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:64px;max-width:1280px;align-items:center">
    <div class="${ns}-media" style="position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--accent-soft);transform:translateZ(0)">
      ${hero
        ? `<img src="${esc(hero)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .8s ease" class="${ns}-img"/>`
        : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent) 0%, var(--paper) 100%);opacity:.35"></div>`}
      <span aria-hidden="true" style="position:absolute;top:18px;left:18px;font-family:var(--font-display);font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--paper);background:rgba(0,0,0,0.45);padding:6px 12px;backdrop-filter:blur(8px);font-weight:500">Case · 01</span>
    </div>
    <div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
        <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.9"></span>
        <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 70%, transparent);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.testimonials ?? 'Featured work')}</p>
      </div>
      <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;color:var(--paper);margin:0 0 28px">${esc(heading)}</h2>
      <p style="font-size:16px;line-height:1.72;color:color-mix(in srgb, var(--paper) 82%, transparent);max-width:520px;margin:0 0 32px">${esc(body)}</p>
      ${attribution ? `<div style="display:flex;align-items:center;gap:14px;margin-bottom:36px">
        <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:color-mix(in srgb, var(--paper) 40%, transparent)"></span>
        <p style="font-family:var(--font-body);font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:color-mix(in srgb, var(--paper) 80%, transparent);margin:0;font-weight:500">${esc(attribution)}</p>
      </div>` : ''}
      <a href="/features" class="${ns}-cta" style="display:inline-flex;align-items:center;gap:10px;padding:14px 26px;border:1px solid color-mix(in srgb, var(--paper) 35%, transparent);color:var(--paper);text-decoration:none;font-family:var(--font-body);font-size:13px;letter-spacing:0.06em;font-weight:500;transition:background .25s ease, border-color .25s ease">
        View the work
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="transition:transform .25s ease" class="${ns}-cta-arrow"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </a>
    </div>
  </div>
</section>
<style>
.${ns}-cta:hover{background:color-mix(in srgb, var(--paper) 10%, transparent);border-color:var(--paper)}
.${ns}-cta:hover .${ns}-cta-arrow{transform:translateX(4px)}
.${ns}-media:hover .${ns}-img{transform:scale(1.04)}
@media (prefers-reduced-motion: reduce){
  .${ns}-cta,.${ns}-cta-arrow,.${ns}-img{transition:none}
  .${ns}-cta:hover .${ns}-cta-arrow{transform:none}
  .${ns}-media:hover .${ns}-img{transform:none}
}
</style>`;
}

// ── Work process / approach (4 numbered steps from FAQ pairs or features) ──

export function renderWorkProcess(ctx: RenderContext): string {
  const ns = `wp-${ctx.slug.slice(0, 10)}`;
  const useFaq = (ctx.content.faq?.length ?? 0) >= 4;
  const stepsSource = useFaq ? ctx.content.faq.slice(0, 4) : ctx.content.features.slice(0, 4);
  const items = stepsSource.map((item, i) => {
    const heading = useFaq ? (item as { q: string }).q : (item as { title: string }).title;
    const body = useFaq ? (item as { a: string }).a : (item as { description: string }).description;
    const isLast = i === stepsSource.length - 1;
    return `<div class="${ns}-step" style="padding:56px 36px;border:1px solid var(--line);background:var(--paper);position:relative;transition:transform .3s ease, box-shadow .3s ease">
      <div style="display:flex;align-items:baseline;gap:14px;margin-bottom:28px">
        <span style="font-family:var(--font-display);font-size:clamp(64px,7vw,96px);font-weight:300;color:var(--accent);line-height:0.9;letter-spacing:-0.04em;font-variant-numeric:tabular-nums">${String(i + 1).padStart(2, '0')}</span>
        <span aria-hidden="true" style="flex:1;height:1px;background:var(--line);opacity:0.7"></span>
      </div>
      <h3 style="font-family:var(--font-display);font-weight:500;font-size:21px;letter-spacing:-0.012em;margin:0 0 14px;line-height:1.18">${esc(heading)}</h3>
      <p style="font-size:14px;color:var(--muted);line-height:1.68;margin:0">${esc(body)}</p>
      ${isLast ? '' : `<span aria-hidden="true" class="${ns}-step-arrow" style="position:absolute;top:50%;right:-14px;transform:translateY(-50%);width:28px;height:28px;background:var(--paper);border:1px solid var(--line);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--muted);z-index:1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </span>`}
    </div>`;
  }).join('');
  return `<section class="work-process" style="padding:140px 0;background:color-mix(in srgb, var(--accent-soft) 40%, var(--paper))">
  <div class="wrap" style="max-width:1280px">
    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:32px;align-items:end;margin-bottom:64px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
          <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.about ?? 'How we work')}</p>
        </div>
        <h2 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;margin:0">${esc(ctx.content.about.heading)}</h2>
      </div>
      <p style="font-size:14px;color:var(--muted);line-height:1.65;max-width:360px;margin:0 0 8px auto;text-align:right;font-family:var(--font-body)">${stepsSource.length} stages, no rushing. Each one finishes before the next begins.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px">${items}</div>
  </div>
</section>
<style>
.${ns}-step:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(0,0,0,0.06)}
@media (prefers-reduced-motion: reduce){.${ns}-step{transition:none}.${ns}-step:hover{transform:none;box-shadow:none}}
@media (max-width: 720px){
  .work-process .wrap > div:first-child{grid-template-columns:1fr}
  .work-process .wrap > div:first-child > p{text-align:left;margin:0;max-width:none}
  .${ns}-step-arrow{display:none}
}
</style>`;
}

// ── Awards / recognition strip ──────────────────────────────────────────

export function renderAwardsStrip(ctx: RenderContext): string {
  const ns = `aw-${ctx.slug.slice(0, 10)}`;
  // Use brand year if available in params.taglineSuperline (often "EST 2024"
  // / "ISSUE 01"); fall back to a generic current-year set.
  const yearMatch = (ctx.params.taglineSuperline ?? '').match(/(19|20)\d{2}/);
  const anchorYear = yearMatch ? Number(yearMatch[0]) : 2024;
  const labels = [
    { title: 'Awwwards', sub: 'Site of the Day' },
    { title: 'CSS Design', sub: `Honors · ${anchorYear}` },
    { title: 'FWA', sub: `${anchorYear + 1}` },
    { title: 'Type Director', sub: 'Gold' },
    { title: 'The Webby', sub: 'Nominee' },
  ];
  const items = labels.map((label, i) => `<div class="${ns}-item" style="padding:36px 24px;text-align:center;${i === labels.length - 1 ? '' : 'border-right:1px solid var(--line);'}position:relative;transition:background-color .3s ease">
      <div style="font-family:var(--font-display);font-weight:500;font-size:14px;letter-spacing:-0.005em;color:var(--ink);margin-bottom:6px">${esc(label.title)}</div>
      <div style="font-family:var(--font-body);font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:var(--muted);font-variant-numeric:tabular-nums">${esc(label.sub)}</div>
    </div>`).join('');
  return `<section class="awards-strip" style="padding:80px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:color-mix(in srgb, var(--paper) 92%, var(--accent) 8%)">
  <div class="wrap" style="max-width:1280px">
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:36px">
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">Recognition</p>
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${items}</div>
  </div>
</section>
<style>
.${ns}-item:hover{background-color:color-mix(in srgb, var(--accent-soft) 60%, transparent)}
@media (prefers-reduced-motion: reduce){.${ns}-item{transition:none}}
@media (max-width: 720px){.awards-strip [style*="border-right"]{border-right:none;border-bottom:1px solid var(--line)}}
</style>`;
}

// ── Manifesto block (about-mission, big-type) ───────────────────────────

export function renderManifesto(ctx: RenderContext): string {
  // Editorial polish: pull-quote with accent open glyph + drop letter to give
  // the manifesto block the weight of a single committed statement.
  const mission = (ctx.content.about.mission ?? '').trim();
  const dropChar = mission.charAt(0) || 'A';
  const remainder = mission.slice(1);
  const author = ctx.content.footer?.tagline ?? ctx.name;
  return `<section class="manifesto" style="padding:180px 0 160px;position:relative;overflow:hidden">
  <div class="wrap" style="max-width:940px;position:relative">
    <div aria-hidden="true" style="position:absolute;top:-40px;left:-20px;font-family:var(--font-display);font-size:clamp(160px,22vw,280px);line-height:0.8;color:var(--accent);opacity:0.08;font-weight:500;letter-spacing:-0.06em;pointer-events:none;user-select:none">&ldquo;</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:36px;position:relative">
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">${esc(ctx.params.customLabels?.about ?? 'Manifesto')}</p>
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
    </div>
    <p style="font-family:var(--font-display);font-weight:400;font-size:clamp(28px,4.5vw,52px);letter-spacing:-0.025em;line-height:1.22;color:var(--ink);text-align:center;margin:0 0 48px;position:relative">
      <span style="float:left;font-family:var(--font-display);font-size:1.5em;line-height:0.92;font-weight:500;color:var(--accent);margin:0 14px 0 0;letter-spacing:-0.04em">${esc(dropChar)}</span>${esc(remainder)}
    </p>
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;position:relative">
      <span aria-hidden="true" style="display:inline-block;width:48px;height:1px;background:var(--ink);opacity:0.4"></span>
      <p style="font-family:var(--font-body);font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:var(--muted);margin:0">${esc(author)}</p>
    </div>
  </div>
</section>`;
}
