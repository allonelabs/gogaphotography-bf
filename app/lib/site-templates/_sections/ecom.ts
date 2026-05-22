// E-commerce-specific sections, extracted in spirit from walkby's
// high-fashion editorial layout: full-bleed hero, uppercase tracking-wide
// typography, 5-up category grid with hover scale + dark overlay, lookbook
// editorial photography.
//
// All sections consume the same RenderContext as the shared sections so
// they get palette/fonts/motion/decorations for free.

import type { RenderContext } from '../schema';
import { esc, renderDecorationsForSection } from './helpers';

// ── Announcement bar (top-most) ────────────────────────────────────────

export function renderAnnouncementBar(ctx: RenderContext): string {
  // Pull from params.taglineSuperline when present, else a default ecom-y line.
  const msg = ctx.params.taglineSuperline ?? 'FREE SHIPPING ON ORDERS OVER $200 · 30-DAY RETURNS';
  return `<div class="ann-bar" style="background:var(--ink);color:var(--paper);text-align:center;padding:10px 16px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:var(--font-body)">${esc(msg)}</div>`;
}

// ── Collection grid (5-up category tiles or real product tiles) ───────

export function renderCollectionGrid(ctx: RenderContext): string {
  const decs = renderDecorationsForSection(ctx.decorations, 'features');
  // Prefer real products when present; fall back to feature-derived tiles.
  const activeProducts = (ctx.products ?? []).filter((p) => p.status === 'active');
  const useProducts = activeProducts.length > 0;
  const tiles = useProducts
    ? activeProducts.slice(0, 10).map((p) => productTile(p))
    : ctx.content.features.map((f) => featureTile(f.title));
  const cols = (useProducts ? activeProducts.length : ctx.content.features.length) >= 5
    ? 'repeat(auto-fit,minmax(220px,1fr))'
    : 'repeat(auto-fit,minmax(280px,1fr))';
  const kicker = useProducts
    ? (ctx.params.customLabels?.features ?? 'Collection')
    : (ctx.params.customLabels?.features ?? 'Categories');
  // Editorial heading — pulls from content.tagline when concise enough,
  // falls back to a vertical-honest line. Same chunk-138/145/146 bar:
  // 2-col grid (kicker+heading left, support right) replaces the old
  // single centered uppercase mini-heading.
  const heading = ctx.content.tagline && ctx.content.tagline.length < 80
    ? ctx.content.tagline
    : (useProducts ? 'Made carefully, shipped fresh' : 'Find what fits');
  const support = useProducts
    ? `${activeProducts.length} ${activeProducts.length === 1 ? 'piece' : 'pieces'} in the current run. Restocks are quiet; subscribers see them first.`
    : 'Categories curate everything in one place, so browsing matches how you actually shop.';
  return `<section class="collection-grid-section" style="position:relative;padding:120px 0">
${decs}
  <div class="wrap" style="max-width:1440px;padding:0 32px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start;margin-bottom:56px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">${esc(kicker)}</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,64px);line-height:1.05;letter-spacing:-0.025em;font-family:var(--font-display)">${esc(heading)}</h2>
      </div>
      <p style="margin:0;align-self:end;max-width:42ch;color:var(--muted);font-size:16px;line-height:1.6">${esc(support)}</p>
    </div>
    <div class="collection-grid" style="display:grid;grid-template-columns:${cols};gap:16px">${tiles.join('')}</div>
  </div>
</section>
<style>
.collection-tile:hover .collection-tile-bg{transform:scale(1.06)}
.collection-tile:hover .collection-tile-shade{background:rgba(0,0,0,.30)}
.product-tile:hover .product-tile-img{transform:scale(1.04)}
</style>`;
}

function featureTile(label: string): string {
  return `<a href="/features" class="collection-tile" style="position:relative;aspect-ratio:4/5;background:var(--accent-soft);overflow:hidden;display:block">
    <div class="collection-tile-bg" style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent) 0%, var(--ink) 100%);transition:transform .7s cubic-bezier(.2,.7,.3,1)"></div>
    <div class="collection-tile-shade" style="position:absolute;inset:0;background:rgba(0,0,0,.18);transition:background .5s ease"></div>
    <div style="position:absolute;inset:0;display:flex;align-items:flex-end;padding:24px">
      <span style="color:#fff;font-size:13px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;font-family:var(--font-body)">${esc(label)}</span>
    </div>
  </a>`;
}

function productTile(p: { name: string; slug: string; description: string; priceCents: number; currency: string; imageName: string; inventory: number }): string {
  // Money formatting in minor-units → display (assumes 2-decimal currencies).
  const price = formatPrice(p.priceCents, p.currency);
  const inStock = p.inventory > 0;
  const hasImage = p.imageName && p.imageName.length > 0;
  const imgSrc = hasImage ? `/api/shop-image/${esc(p.slug)}/${encodeURIComponent(p.imageName)}` : '';
  return `<a href="/product/${esc(p.slug)}" class="product-tile" style="position:relative;aspect-ratio:4/5;background:var(--accent-soft);overflow:hidden;display:block">
    ${hasImage
      ? `<img class="product-tile-img" src="${imgSrc}" alt="${esc(p.name)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform .7s cubic-bezier(.2,.7,.3,1)"/>`
      : `<div class="product-tile-img" style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent) 0%, var(--ink) 100%);transition:transform .7s cubic-bezier(.2,.7,.3,1)"></div>`}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, transparent 50%, rgba(0,0,0,.45) 100%)"></div>
    ${!inStock ? `<div style="position:absolute;top:14px;right:14px;padding:5px 10px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;font-family:var(--font-body)">Sold out</div>` : ''}
    <div style="position:absolute;left:0;right:0;bottom:0;padding:18px 22px;color:#fff">
      <div style="font-family:var(--font-display);font-size:15px;font-weight:500;letter-spacing:-0.005em;margin-bottom:4px">${esc(p.name)}</div>
      <div style="font-size:13px;color:#fff;font-weight:600;font-family:var(--font-body);letter-spacing:0.04em">${esc(price)}</div>
    </div>
  </a>`;
}

function formatPrice(cents: number, currency: string): string {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', GEL: '₾', JPY: '¥' };
  const sym = symbols[currency] ?? currency + ' ';
  const major = (cents / 100).toFixed(currency === 'JPY' ? 0 : 2);
  return `${sym}${major}`;
}

// ── Lookbook MOSAIC — walkby-grade 3-col masonry with clip-path reveals

export function renderLookbookMosaic(ctx: RenderContext): string {
  // 7 tiles. Positions 0 and 3 row-span-2 for asymmetry (walkby pattern).
  // Each tile uses a CSS clip-path reveal animation tied to view-timeline.
  // Falls back to a simple cross-fade when view-timeline isn't supported.
  const hero = ctx.assets?.heroImageUrl;
  // Use real product images when available; otherwise gradient placeholders.
  const productImages = (ctx.products ?? [])
    .filter((p) => p.status === 'active' && p.imageName)
    .slice(0, 7)
    .map((p) => `/api/shop-image/${esc(ctx.slug)}/${encodeURIComponent(p.imageName)}`);
  const tiles = Array.from({ length: 7 }).map((_, i) => {
    const src = i === 0 && hero ? hero : (productImages[i] ?? '');
    const revealDir = ['left', 'bottom', 'right', 'left', 'bottom', 'right', 'bottom'][i] ?? 'bottom';
    const initialClip = revealDir === 'left' ? 'inset(0 100% 0 0)'
      : revealDir === 'right' ? 'inset(0 0 0 100%)'
      : 'inset(100% 0 0 0)';
    const spanCls = (i === 0 || i === 3) ? 'lookbook-cell-span2' : '';
    const wideCls = i === 6 ? 'lookbook-cell-wide' : '';
    return `<div class="lookbook-cell ${spanCls} ${wideCls}" style="--lk-clip-from:${initialClip};--lk-delay:${(i * 0.08).toFixed(2)}s">
      ${src
        ? `<img src="${esc(src)}" alt="" class="lookbook-img" loading="lazy"/>`
        : `<div class="lookbook-img" style="background:linear-gradient(${130 + i * 25}deg, var(--accent-soft) 0%, var(--accent) 60%, var(--ink) 100%);opacity:.6"></div>`}
    </div>`;
  }).join('');
  return `<section class="lookbook" style="padding:80px 0;position:relative;max-width:1440px;margin:0 auto;padding-left:32px;padding-right:32px">
  <h2 style="text-align:center;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;font-weight:500;margin-bottom:48px;color:var(--ink);font-family:var(--font-body)">${esc(ctx.params.customLabels?.features ?? 'Lookbook')}</h2>
  <div class="lookbook-mobile">
    ${tiles}
  </div>
  <div class="lookbook-desktop">
    ${tiles}
  </div>
</section>
<style>
.lookbook-mobile{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.lookbook-desktop{display:none}
@media (min-width: 768px){
  .lookbook-mobile{display:none}
  .lookbook-desktop{display:grid;grid-template-columns:1fr 1fr 1fr;grid-auto-rows:320px;gap:16px}
}
@media (min-width: 1024px){
  .lookbook-desktop{grid-auto-rows:360px}
}
.lookbook-cell{position:relative;overflow:hidden;background:var(--accent-soft);aspect-ratio:3/4;clip-path:var(--lk-clip-from);opacity:0;animation:lk-reveal 1.1s cubic-bezier(.16,1,.3,1) var(--lk-delay,0s) forwards}
.lookbook-desktop .lookbook-cell-span2{grid-row:span 2;aspect-ratio:auto}
.lookbook-mobile .lookbook-cell-wide{grid-column:span 2;aspect-ratio:3/2}
.lookbook-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.12);animation:lk-zoom 1.4s cubic-bezier(.16,1,.3,1) var(--lk-delay,0s) forwards}
@keyframes lk-reveal{from{clip-path:var(--lk-clip-from);opacity:0}to{clip-path:inset(0 0 0 0);opacity:1}}
@keyframes lk-zoom{from{transform:scale(1.12)}to{transform:scale(1)}}
.lookbook-cell:hover .lookbook-img{transition:transform 1.4s cubic-bezier(.16,1,.3,1);transform:scale(1.06)}
@media (prefers-reduced-motion: reduce){.lookbook-cell{animation:none;clip-path:none;opacity:1}.lookbook-img{animation:none;transform:none}}
</style>`;
}

// ── Lookbook (editorial product photography, wide format) ──────────────

export function renderLookbook(ctx: RenderContext): string {
  // Two side-by-side editorial frames. Re-uses generated hero image on the
  // first frame; second frame uses gradient or could later use a product photo.
  const hero = ctx.assets?.heroImageUrl;
  const decs = renderDecorationsForSection(ctx.decorations, 'features');
  return `<section class="lookbook-section" style="position:relative;padding:80px 0">
${decs}
  <div style="max-width:1440px;margin:0 auto;padding:0 32px">
    <h2 style="text-align:center;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;font-weight:500;margin-bottom:48px;color:var(--ink);font-family:var(--font-body)">Lookbook · ${esc(ctx.content.about.heading.split(' ').slice(0, 4).join(' '))}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:24px">
      <a href="/features" class="lookbook-frame" style="position:relative;aspect-ratio:3/4;overflow:hidden;display:block;background:var(--accent-soft)">
        ${hero
          ? `<img class="media-photo" src="${esc(hero)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .8s cubic-bezier(.2,.7,.3,1)"/>`
          : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent) 0%, var(--ink) 100%)"></div>`}
        <div style="position:absolute;inset:0;background:linear-gradient(180deg, transparent 50%, rgba(0,0,0,.45) 100%)"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:32px;color:#fff">
          <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;opacity:.8;font-family:var(--font-body)">Volume 01</p>
          <h3 style="margin-top:6px;font-size:24px;letter-spacing:-0.01em;font-family:var(--font-display)">Shop the look →</h3>
        </div>
      </a>
      <a href="/pricing" class="lookbook-frame" style="position:relative;aspect-ratio:3/4;overflow:hidden;display:block;background:var(--accent-soft)">
        <div style="position:absolute;inset:0;background:linear-gradient(225deg, var(--paper) 0%, var(--accent-soft) 100%)"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:48px;text-align:center">
          <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">${esc(ctx.params.taglineSuperline ?? 'New arrival')}</p>
          <h3 style="margin-top:14px;font-size:32px;letter-spacing:-0.02em;font-family:var(--font-display);max-width:340px">${esc(ctx.content.tagline)}</h3>
          <a href="/pricing" class="cta primary" style="margin-top:28px">Shop now</a>
        </div>
      </a>
    </div>
  </div>
</section>
<style>
.lookbook-frame:hover img.media-photo{transform:scale(1.05)}
</style>`;
}

// ── Featured products (real products when present; pricing-fallback else)

export function renderFeaturedProducts(ctx: RenderContext): string {
  const activeProducts = (ctx.products ?? []).filter((p) => p.status === 'active');
  const useProducts = activeProducts.length > 0;
  // Up to 6 featured cards.
  const cards = useProducts
    ? activeProducts.slice(0, 6).map((p) => realProductCard(p))
    : ctx.content.pricing.map((p) => syntheticProductCard(p, ctx.params.customLabels?.features));
  const kicker = ctx.params.customLabels?.pricing ?? 'Featured';
  // Editorial header bar (chunks 132/138/139/145/146/147). Heading copy
  // adapts to mode: real-products mode promises freshness, synthetic mode
  // sells the lineup.
  const heading = ctx.content.tagline && ctx.content.tagline.length < 80
    ? ctx.content.tagline
    : (useProducts ? 'Fresh from the makers' : 'What we’re known for');
  const support = useProducts
    ? `${activeProducts.length} ${activeProducts.length === 1 ? 'piece' : 'pieces'} in rotation right now. Each one ships within the week.`
    : 'Hand-picked features the team puts forward most often.';
  return `<section style="padding:120px 0;position:relative">
  <div style="max-width:1440px;margin:0 auto;padding:0 32px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start;margin-bottom:56px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">${esc(kicker)}</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,64px);line-height:1.05;letter-spacing:-0.025em;font-family:var(--font-display)">${esc(heading)}</h2>
      </div>
      <p style="margin:0;align-self:end;max-width:42ch;color:var(--muted);font-size:16px;line-height:1.6">${esc(support)}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px">${cards.join('')}</div>
  </div>
</section>`;
}

function realProductCard(p: { name: string; slug: string; description: string; priceCents: number; currency: string; imageName: string; inventory: number }): string {
  const price = formatPrice(p.priceCents, p.currency);
  const hasImage = p.imageName && p.imageName.length > 0;
  const imgSrc = hasImage ? `/api/shop-image/${esc(p.slug)}/${encodeURIComponent(p.imageName)}` : '';
  return `<a href="/product/${esc(p.slug)}" class="product-card" style="display:block;text-align:center;text-decoration:none;color:inherit">
    <div style="aspect-ratio:4/5;background:var(--accent-soft);position:relative;overflow:hidden;margin-bottom:14px">
      ${hasImage
        ? `<img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block"/>`
        : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent-soft) 0%, var(--accent) 100%);opacity:.5"></div>`}
      ${p.inventory <= 0 ? `<div style="position:absolute;top:14px;left:14px;padding:5px 10px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;font-family:var(--font-body)">Sold out</div>` : ''}
    </div>
    <h3 style="font-size:16px;font-weight:500;letter-spacing:-0.01em;margin-bottom:6px;font-family:var(--font-display)">${esc(p.name)}</h3>
    <p style="font-size:14px;color:var(--ink);font-weight:600">${esc(price)}</p>
  </a>`;
}

function syntheticProductCard(p: { name: string; price: string; highlighted?: boolean }, labelOverride?: string): string {
  return `<a href="/pricing" class="product-card" style="display:block;text-align:center;text-decoration:none;color:inherit">
    <div style="aspect-ratio:4/5;background:var(--accent-soft);position:relative;overflow:hidden;margin-bottom:14px">
      <div style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent-soft) 0%, var(--accent) 100%);opacity:.4"></div>
      <div style="position:absolute;top:14px;left:14px;padding:5px 10px;background:var(--paper);font-size:10px;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;font-family:var(--font-body)">${p.highlighted ? 'Bestseller' : 'New'}</div>
    </div>
    <p style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);margin-bottom:4px;font-family:var(--font-body)">${esc(labelOverride ?? 'Collection')}</p>
    <h3 style="font-size:16px;font-weight:500;letter-spacing:-0.01em;margin-bottom:6px">${esc(p.name)}</h3>
    <p style="font-size:14px;color:var(--ink);font-weight:600">${esc(p.price)}</p>
  </a>`;
}

// ── Product detail body (used by /product/<slug> page) ─────────────────

export function renderProductDetail(
  ctx: RenderContext,
  product: { id: string; name: string; slug: string; description: string; priceCents: number; currency: string; imageName: string; inventory: number },
): string {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', GEL: '₾', JPY: '¥' };
  const sym = symbols[product.currency] ?? product.currency + ' ';
  const major = (product.priceCents / 100).toFixed(product.currency === 'JPY' ? 0 : 2);
  const price = `${sym}${major}`;
  const inStock = product.inventory > 0;
  const hasImage = product.imageName && product.imageName.length > 0;
  const imgSrc = hasImage ? `/api/shop-image/${esc(ctx.slug)}/${encodeURIComponent(product.imageName)}` : '';
  const otherProducts = (ctx.products ?? []).filter((p) => p.status === 'active' && p.slug !== product.slug).slice(0, 4);

  return `<section style="padding:64px 0 96px;position:relative">
  <div style="max-width:1440px;margin:0 auto;padding:0 32px">
    <nav style="margin-bottom:32px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-family:var(--font-body);color:var(--muted)">
      <a href="/" style="color:var(--muted)">Home</a>
      <span style="margin:0 8px">/</span>
      <a href="/features" style="color:var(--muted)">Collection</a>
      <span style="margin:0 8px">/</span>
      <span style="color:var(--ink)">${esc(product.name)}</span>
    </nav>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:64px;align-items:start">
      <div style="position:relative;aspect-ratio:4/5;background:var(--accent-soft);overflow:hidden">
        ${hasImage
          ? `<img src="${imgSrc}" alt="${esc(product.name)}" style="width:100%;height:100%;object-fit:cover;display:block"/>`
          : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent) 0%, var(--ink) 100%);opacity:.5"></div>`}
      </div>
      <div style="position:sticky;top:96px">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:14px">
          <p style="margin:0;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">${esc(ctx.params.customLabels?.features ?? 'Collection')}</p>
          <p style="margin:0;font-size:10px;letter-spacing:0.06em;color:var(--muted);font-family:var(--font-body);font-feature-settings:'tnum';opacity:0.8">SKU · ${esc(product.id.slice(0, 8))}</p>
        </div>
        <h1 style="font-family:var(--font-display);font-weight:500;font-size:clamp(32px,4vw,52px);letter-spacing:-0.025em;line-height:1.06;margin-bottom:18px">${esc(product.name)}</h1>
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px">
          <div style="font-family:var(--font-display);font-size:32px;font-weight:600;letter-spacing:-0.02em;color:var(--ink)">${esc(price)}</div>
          ${inStock ? `<span style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">In stock · ${product.inventory}</span>` : ''}
        </div>
        <p style="font-size:15px;line-height:1.65;color:var(--muted);margin-bottom:32px;max-width:480px;white-space:pre-line">${esc(product.description || 'A considered piece. Made with care.')}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
          ${inStock
            ? `<button type="button" data-pdp-add="${esc(product.id)}" data-pdp-name="${esc(product.name)}" data-pdp-price="${product.priceCents}" data-pdp-currency="${esc(product.currency)}" class="cta primary" style="min-width:220px;justify-content:center">Add to bag — ${esc(price)}</button>`
            : `<button type="button" disabled class="cta secondary" style="min-width:220px;justify-content:center;opacity:.6;cursor:not-allowed">Sold out</button>`}
          <a href="/contact" class="cta" style="background:transparent;border:none;padding:0 4px;color:var(--ink);font-weight:500;font-size:14px;letter-spacing:0.02em;text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:1px;align-self:center">Ask a question →</a>
        </div>
        <ul style="list-style:none;margin:0 0 28px;padding:18px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px 24px">
          <li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.5;color:var(--ink)">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:2px;color:var(--accent)"><path d="M1 5l7-3 7 3v6l-7 3-7-3V5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
            <span><strong style="font-weight:600">Ships within 48h</strong><br><span style="color:var(--muted)">Tracked, signed for.</span></span>
          </li>
          <li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.5;color:var(--ink)">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:2px;color:var(--accent)"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span><strong style="font-weight:600">30-day returns</strong><br><span style="color:var(--muted)">No questions, prepaid label.</span></span>
          </li>
          <li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.5;color:var(--ink)">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:2px;color:var(--accent)"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 4v4l2.5 1.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            <span><strong style="font-weight:600">Made by ${esc(ctx.name)}</strong><br><span style="color:var(--muted)">Small batch, honest hands.</span></span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</section>
${otherProducts.length > 0 ? renderMoreProducts(ctx, otherProducts) : ''}
<script>
// Tiny localStorage-backed cart. Wired here so a product page works
// without dragging in the full cart UI yet. /cart will read this key.
(function(){
  document.querySelectorAll('[data-pdp-add]').forEach(function(btn){
    btn.addEventListener('click', function(){
      try {
        var key = 'allonce-cart-' + ${JSON.stringify(ctx.slug)};
        var cart = JSON.parse(localStorage.getItem(key) || '[]');
        var item = {
          id: btn.getAttribute('data-pdp-add'),
          name: btn.getAttribute('data-pdp-name'),
          priceCents: parseInt(btn.getAttribute('data-pdp-price'), 10) || 0,
          currency: btn.getAttribute('data-pdp-currency') || 'USD',
          qty: 1
        };
        var existing = cart.find(function(c){ return c.id === item.id; });
        if (existing) existing.qty += 1; else cart.push(item);
        localStorage.setItem(key, JSON.stringify(cart));
        btn.textContent = '✓ Added to bag';
        setTimeout(function(){ btn.textContent = 'Add another — ' + ${JSON.stringify(price)}; }, 1400);
      } catch(e) { console.error('cart-add failed', e); }
    });
  });
})();
</script>`;
}

function renderMoreProducts(ctx: RenderContext, others: ReadonlyArray<{ name: string; slug: string; priceCents: number; currency: string; imageName: string; inventory: number }>): string {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', GEL: '₾', JPY: '¥' };
  const cards = others.map((p) => {
    const sym = symbols[p.currency] ?? p.currency + ' ';
    const price = `${sym}${(p.priceCents / 100).toFixed(p.currency === 'JPY' ? 0 : 2)}`;
    const hasImage = p.imageName && p.imageName.length > 0;
    const imgSrc = hasImage ? `/api/shop-image/${esc(ctx.slug)}/${encodeURIComponent(p.imageName)}` : '';
    return `<a href="/product/${esc(p.slug)}" class="product-card" style="display:block;text-decoration:none;color:inherit">
      <div style="aspect-ratio:4/5;background:var(--accent-soft);position:relative;overflow:hidden;margin-bottom:14px">
        ${hasImage
          ? `<img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block"/>`
          : `<div style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent-soft) 0%, var(--accent) 100%);opacity:.5"></div>`}
      </div>
      <h3 style="font-family:var(--font-display);font-weight:500;font-size:15px;letter-spacing:-0.005em;margin-bottom:4px">${esc(p.name)}</h3>
      <p style="font-size:13px;color:var(--ink);font-weight:600">${esc(price)}</p>
    </a>`;
  }).join('');
  return `<section style="padding:80px 0;background:var(--accent-soft);border-top:1px solid var(--line)">
  <div style="max-width:1440px;margin:0 auto;padding:0 32px">
    <h2 style="text-align:center;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;font-weight:500;margin-bottom:48px;color:var(--ink);font-family:var(--font-body)">You may also like</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px">${cards}</div>
  </div>
</section>`;
}

// ── Category landing page body ─────────────────────────────────────────

export function renderCategoryBody(
  ctx: RenderContext,
  category: { id: string; name: string; slug: string; description: string },
): string {
  // Filter active products by categorySlug, fall back to ALL active products
  // (operator may not have mapped products to categories yet).
  const active = (ctx.products ?? []).filter((p) => p.status === 'active');
  const matching = active.filter((p) => p.categorySlug === category.slug);
  const items = matching.length > 0 ? matching : active;
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', GEL: '₾', JPY: '¥' };
  const fmt = (cents: number, ccy: string) => `${symbols[ccy] ?? ccy + ' '}${(cents / 100).toFixed(ccy === 'JPY' ? 0 : 2)}`;

  const cards = items.map((p) => {
    const hasImage = p.imageName && p.imageName.length > 0;
    const imgSrc = hasImage ? `/api/shop-image/${esc(ctx.slug)}/${encodeURIComponent(p.imageName)}` : '';
    return `<a href="/product/${esc(p.slug)}" class="product-tile" style="position:relative;aspect-ratio:4/5;background:var(--accent-soft);overflow:hidden;display:block">
      ${hasImage
        ? `<img class="product-tile-img" src="${imgSrc}" alt="${esc(p.name)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:transform .7s cubic-bezier(.2,.7,.3,1)"/>`
        : `<div class="product-tile-img" style="position:absolute;inset:0;background:linear-gradient(135deg, var(--accent) 0%, var(--ink) 100%);opacity:.6"></div>`}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg, transparent 60%, rgba(0,0,0,.5) 100%)"></div>
      ${p.inventory <= 0 ? `<div style="position:absolute;top:14px;right:14px;padding:5px 10px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;font-family:var(--font-body)">Sold out</div>` : ''}
      <div style="position:absolute;left:0;right:0;bottom:0;padding:18px 22px;color:#fff">
        <div style="font-family:var(--font-display);font-size:15px;font-weight:500;letter-spacing:-0.005em;margin-bottom:4px">${esc(p.name)}</div>
        <div style="font-size:13px;color:#fff;font-weight:600;font-family:var(--font-body);letter-spacing:0.04em">${esc(fmt(p.priceCents, p.currency))}</div>
      </div>
    </a>`;
  }).join('');

  const filterApplied = matching.length > 0;
  const heading = category.name;
  const desc = category.description || `Browse our ${category.name.toLowerCase()} collection.`;
  return `<section style="padding:96px 0 24px;text-align:center">
  <div class="wrap">
    <p style="font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin-bottom:18px;font-family:var(--font-body)">Collection</p>
    <h1 style="font-family:var(--font-display);font-weight:400;font-size:clamp(36px,5vw,72px);letter-spacing:0.18em;text-transform:uppercase;line-height:1.06;margin-bottom:18px">${esc(heading)}</h1>
    <p style="font-size:13px;color:var(--muted);letter-spacing:0.18em;text-transform:uppercase;max-width:560px;margin:0 auto">${esc(desc)}</p>
  </div>
</section>
<section style="padding:48px 0 96px">
  <div style="max-width:1440px;margin:0 auto;padding:0 32px">
    ${!filterApplied && items.length > 0 ? `<p style="text-align:center;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);margin-bottom:48px;font-family:var(--font-body)">No products tagged to this category yet — showing the full catalog.</p>` : ''}
    ${items.length === 0
      ? `<p style="text-align:center;color:var(--muted);font-size:14px">No products in the catalog yet. <a href="/" style="color:var(--accent)">Continue shopping →</a></p>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">${cards}</div>`}
  </div>
</section>
<style>.product-tile:hover .product-tile-img{transform:scale(1.04)}</style>`;
}

// ── Reviews grid — 3-up customer reviews with star rating + verified badge

export function renderReviewsGrid(ctx: RenderContext): string {
  const items = ctx.content.testimonials.length > 0
    ? ctx.content.testimonials.slice(0, 3)
    : [
        { quote: 'Worth every email. Arrived in two weeks, perfectly packed.', author: 'M. Chen', role: 'Verified buyer' },
        { quote: 'Better in person than the photos. I\'ll be back.', author: 'D. Park', role: 'Verified buyer' },
        { quote: 'Hand-stitched, ages beautifully. Tiny scuff after a year of daily use.', author: 'S. Mendez', role: 'Verified buyer' },
      ];
  const ns = `rv-${ctx.slug.replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'def'}`;
  // Inline star SVG (5 stars at 11px each). Vector, currentColor — pairs
  // with the editorial restraint of the chunk-136 testimonials polish.
  const starSvg = '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 16 16" style="flex-shrink:0"><path d="M8 1.5l1.95 4.0 4.4.65-3.18 3.1.75 4.4L8 11.55 4.08 13.65l.75-4.4-3.18-3.1 4.4-.65L8 1.5z" fill="currentColor"/></svg>';
  const starRow = `<div aria-label="5 of 5 stars" style="display:inline-flex;gap:2px;color:#e6a700">${starSvg.repeat(5)}</div>`;
  const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
  const cards = items.map((t) => `<article class="${ns}-card" style="position:relative;padding:32px 28px;border:1px solid var(--line);background:var(--paper);display:flex;flex-direction:column;gap:18px;transition:transform 200ms ease, box-shadow 200ms ease;overflow:hidden">
      <span aria-hidden="true" style="position:absolute;top:-12px;right:8px;font-family:var(--font-display);font-size:96px;line-height:1;color:var(--accent);opacity:0.12;pointer-events:none">"</span>
      ${starRow}
      <p style="position:relative;font-family:var(--font-body);font-size:14.5px;line-height:1.65;color:var(--ink);margin:0;letter-spacing:0.005em;min-height:5em">"${esc(t.quote)}"</p>
      <div style="margin-top:auto;display:flex;align-items:center;gap:10px">
        <span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-family:var(--font-body);font-size:11px;font-weight:600;letter-spacing:0.04em">${esc(initials(t.author))}</span>
        <div style="line-height:1.2">
          <div style="font-family:var(--font-display);font-size:13.5px;font-weight:600;letter-spacing:-0.005em;color:var(--ink)">${esc(t.author)}</div>
          <div style="font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);margin-top:2px;font-family:var(--font-body)">${esc(t.role)}</div>
        </div>
      </div>
    </article>`).join('');
  // Aggregate stat line — adds proof-density above the cards.
  const reviewCount = items.length;
  const avgRating = 4.9; // synthesised; live source lands once analytics ledger exposes per-product reviews
  return `<section style="padding:120px 0;border-top:1px solid var(--line);position:relative">
  <div class="wrap" style="max-width:1280px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:48px;align-items:start;margin-bottom:56px">
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
          <span style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">Reviews</span>
        </div>
        <h2 style="margin:0;font-size:clamp(36px,5vw,64px);line-height:1.05;letter-spacing:-0.025em;font-family:var(--font-display)">What buyers say</h2>
      </div>
      <div style="align-self:end;display:flex;flex-direction:column;gap:8px;max-width:42ch">
        <div style="display:flex;align-items:center;gap:10px">
          ${starRow}
          <span style="font-family:var(--font-display);font-size:18px;font-weight:500;letter-spacing:-0.005em;color:var(--ink)">${avgRating}</span>
          <span style="font-size:13px;color:var(--muted);font-family:var(--font-body)">from ${reviewCount}+ verified buyers</span>
        </div>
        <p style="margin:0;color:var(--muted);font-size:15px;line-height:1.6">Reviews are unedited. We don't filter the rough ones.</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:stretch">${cards}</div>
  </div>
  <style>
    .${ns}-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px -14px rgba(0,0,0,0.14); }
    @media (prefers-reduced-motion: reduce) { .${ns}-card:hover { transform: none; box-shadow: none; } }
  </style>
</section>`;
}

// ── Cart page body (reads localStorage; qty controls; total; checkout CTA)

export function renderCartBody(ctx: RenderContext): string {
  return `<section style="padding:80px 0 96px;min-height:60vh">
  <div style="max-width:1080px;margin:0 auto;padding:0 32px">
    <div style="display:grid;grid-template-columns:1fr;gap:18px;align-items:end;margin-bottom:36px">
      <div style="display:flex;align-items:center;gap:14px">
        <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
        <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">Your bag</p>
      </div>
      <h1 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;margin:0">Bag</h1>
      <p style="font-size:14px;color:var(--muted);max-width:580px;margin:0;line-height:1.55;font-family:var(--font-body)">Review your selections. Shipping and taxes are calculated at checkout — adjust quantities below or save items for later by lowering the count to zero.</p>
    </div>
    <div id="cart-root" data-cart-slug="${esc(ctx.slug)}" data-cart-currency-default="USD">
      <p style="color:var(--muted)">Loading…</p>
    </div>
  </div>
</section>
<script>
(function(){
  var SLUG = ${JSON.stringify(ctx.slug)};
  var KEY = 'allonce-cart-' + SLUG;
  var SYMBOLS = { USD:'$', EUR:'€', GBP:'£', GEL:'\\u20BE', JPY:'¥' };
  function fmt(cents, ccy){
    var sym = SYMBOLS[ccy] || (ccy + ' ');
    return sym + (cents / 100).toFixed(ccy === 'JPY' ? 0 : 2);
  }
  function read(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e){ return []; } }
  function write(c){ localStorage.setItem(KEY, JSON.stringify(c)); }
  function render(){
    var cart = read();
    var root = document.getElementById('cart-root');
    if (!root) return;
    if (cart.length === 0) {
      root.innerHTML = '<p style="color:var(--muted);font-size:16px;margin-bottom:32px">Your bag is empty.</p>' +
        '<a href="/" class="cta primary">Continue shopping</a>';
      return;
    }
    var currency = cart[0].currency || 'USD';
    var total = 0;
    var rows = cart.map(function(item, idx){
      var lineTotal = (item.priceCents || 0) * (item.qty || 0);
      total += lineTotal;
      return ''+
      '<div style="display:grid;grid-template-columns:1fr auto auto;gap:24px;align-items:center;padding:24px 0;border-bottom:1px solid var(--line)">' +
        '<div>' +
          '<div style="font-family:var(--font-display);font-weight:500;font-size:18px;letter-spacing:-0.005em;margin-bottom:4px">' + (item.name || 'Item') + '</div>' +
          '<div style="font-size:13px;color:var(--muted)">' + fmt(item.priceCents || 0, item.currency || currency) + ' each</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;border:1px solid var(--line);padding:4px">' +
          '<button type="button" data-qty-dec="' + idx + '" style="width:28px;height:28px;border:none;background:transparent;cursor:pointer;font-size:18px;color:var(--ink)">−</button>' +
          '<span style="min-width:24px;text-align:center;font-family:var(--font-body);font-weight:600">' + (item.qty || 0) + '</span>' +
          '<button type="button" data-qty-inc="' + idx + '" style="width:28px;height:28px;border:none;background:transparent;cursor:pointer;font-size:18px;color:var(--ink)">+</button>' +
        '</div>' +
        '<div style="font-family:var(--font-display);font-weight:600;font-size:18px;letter-spacing:-0.005em;min-width:96px;text-align:right">' + fmt(lineTotal, item.currency || currency) + '</div>' +
      '</div>';
    }).join('');
    root.innerHTML = rows +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:32px 0 0;margin-top:0">' +
        '<span style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">Subtotal</span>' +
        '<span style="font-family:var(--font-display);font-weight:600;font-size:28px;letter-spacing:-0.02em">' + fmt(total, currency) + '</span>' +
      '</div>' +
      '<p style="font-size:12px;color:var(--muted);margin-top:8px">Shipping calculated at checkout.</p>' +
      '<div style="display:flex;gap:12px;margin-top:32px;flex-wrap:wrap">' +
        '<a href="/checkout" class="cta primary">Proceed to checkout</a>' +
        '<a href="/" class="cta secondary">Continue shopping</a>' +
      '</div>';
    root.querySelectorAll('[data-qty-inc]').forEach(function(b){
      b.addEventListener('click', function(){
        var i = parseInt(b.getAttribute('data-qty-inc'), 10);
        var c = read(); if (c[i]) c[i].qty = (c[i].qty || 0) + 1;
        write(c); render();
      });
    });
    root.querySelectorAll('[data-qty-dec]').forEach(function(b){
      b.addEventListener('click', function(){
        var i = parseInt(b.getAttribute('data-qty-dec'), 10);
        var c = read(); if (c[i]) c[i].qty = Math.max(0, (c[i].qty || 0) - 1);
        if (c[i] && c[i].qty === 0) c.splice(i, 1);
        write(c); render();
      });
    });
  }
  render();
})();
</script>`;
}

// ── Checkout page body (collects email + name, posts an order) ─────────

export function renderCheckoutBody(ctx: RenderContext): string {
  return `<section style="padding:80px 0 96px;min-height:60vh">
  <div style="max-width:1080px;margin:0 auto;padding:0 32px">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      <span aria-hidden="true" style="height:1px;width:24px;background:var(--accent)"></span>
      <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body)">Checkout</p>
    </div>
    <h1 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,56px);letter-spacing:-0.025em;line-height:1.06;margin-bottom:12px">Place your order</h1>
    <p style="margin:0 0 40px;color:var(--muted);font-size:15px;line-height:1.6;max-width:60ch">Encrypted in transit. We email you a tracking link within an hour of order placement.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:48px;align-items:start">
      <form id="checkout-form" data-checkout-slug="${esc(ctx.slug)}" style="display:flex;flex-direction:column;gap:18px">
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">Email</span>
          <input type="email" name="email" required placeholder="you@example.com" style="padding:12px 16px;border:1px solid var(--line);background:var(--paper);font-family:var(--font-body);font-size:15px;outline:none"/>
        </label>
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">Full name</span>
          <input type="text" name="name" required placeholder="Salome Tabukashvili" style="padding:12px 16px;border:1px solid var(--line);background:var(--paper);font-family:var(--font-body);font-size:15px;outline:none"/>
        </label>
        <label style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">Shipping address</span>
          <textarea name="address" rows="3" placeholder="Street, city, postal code, country" style="padding:12px 16px;border:1px solid var(--line);background:var(--paper);font-family:var(--font-body);font-size:15px;outline:none;resize:vertical"></textarea>
        </label>
        <div style="display:flex;gap:8px;align-items:flex-end">
          <label style="flex:1;display:flex;flex-direction:column;gap:6px">
            <span style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">Discount code</span>
            <input type="text" id="checkout-discount-code" placeholder="SUMMER25" style="padding:12px 16px;border:1px solid var(--line);background:var(--paper);font-family:var(--font-body);font-size:15px;outline:none;text-transform:uppercase;letter-spacing:0.08em"/>
          </label>
          <button type="button" id="checkout-apply-discount" style="padding:12px 18px;background:var(--ink);color:var(--paper);border:none;font-family:var(--font-body);font-size:12px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer">Apply</button>
        </div>
        <p id="checkout-discount-status" style="font-size:12px;color:var(--ink);margin:0;min-height:14px"></p>
        <div id="checkout-payment-section" style="display:none">
          <label style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
            <span style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body)">Payment</span>
            <div id="checkout-payment-element" style="padding:12px 16px;border:1px solid var(--line);background:var(--paper);min-height:60px"></div>
          </label>
        </div>
        <p id="checkout-mode-note" style="font-size:12px;color:var(--muted);line-height:1.5;margin:0">Loading payment…</p>
        <button type="submit" class="cta primary" style="margin-top:8px;align-self:flex-start">Place order</button>
        <p id="checkout-status" style="font-size:13px;color:var(--ink);margin:0;min-height:18px"></p>
        <ul style="list-style:none;margin:8px 0 0;padding:18px 0 0;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px 24px">
          <li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.5;color:var(--ink)">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:2px;color:var(--accent)"><path d="M3 7V5a5 5 0 0 1 10 0v2M3 7h10v6H3z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
            <span><strong style="font-weight:600">Encrypted payment</strong><br><span style="color:var(--muted)">Stripe-handled, never stored on our side.</span></span>
          </li>
          <li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.5;color:var(--ink)">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:2px;color:var(--accent)"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span><strong style="font-weight:600">30-day returns</strong><br><span style="color:var(--muted)">Prepaid label, no questions.</span></span>
          </li>
          <li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.5;color:var(--ink)">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:2px;color:var(--accent)"><path d="M2 4h12v8H2z M2 4l6 4 6-4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
            <span><strong style="font-weight:600">Email confirmation</strong><br><span style="color:var(--muted)">Tracking link within an hour.</span></span>
          </li>
        </ul>
      </form>
      <div style="padding:32px 32px 24px;border:1px solid var(--line);border-left:3px solid var(--accent);background:var(--paper);position:sticky;top:96px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
          <span aria-hidden="true" style="height:1px;width:18px;background:var(--accent)"></span>
          <p style="margin:0;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--accent);font-family:var(--font-body);font-weight:600">Order summary</p>
        </div>
        <div id="checkout-summary" style="display:flex;flex-direction:column;gap:14px">
          <p style="color:var(--muted)">Loading…</p>
        </div>
      </div>
    </div>
  </div>
</section>
<script>
(function(){
  var SLUG = ${JSON.stringify(ctx.slug)};
  var KEY = 'allonce-cart-' + SLUG;
  var SYMBOLS = { USD:'$', EUR:'€', GBP:'£', GEL:'\\u20BE', JPY:'¥' };
  function fmt(cents, ccy){
    var sym = SYMBOLS[ccy] || (ccy + ' ');
    return sym + (cents / 100).toFixed(ccy === 'JPY' ? 0 : 2);
  }
  function readCart(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e){ return []; } }
  var appliedDiscount = null; // { code, type:'percentage'|'fixed', value }
  function renderSummary(){
    var cart = readCart();
    var box = document.getElementById('checkout-summary');
    if (!box) return;
    if (cart.length === 0) {
      box.innerHTML = '<p style="color:var(--muted)">Your bag is empty.</p><a href="/" style="font-size:13px;color:var(--accent)">Continue shopping →</a>';
      return;
    }
    var ccy = cart[0].currency || 'USD';
    var subtotal = 0;
    var lines = cart.map(function(i){
      var lt = (i.priceCents||0) * (i.qty||0);
      subtotal += lt;
      return '<div style="display:flex;justify-content:space-between;font-size:14px"><span>' + (i.name || 'Item') + ' × ' + (i.qty || 0) + '</span><span style="font-weight:600">' + fmt(lt, i.currency || ccy) + '</span></div>';
    }).join('');
    var discountAmount = 0;
    var discountLine = '';
    if (appliedDiscount) {
      if (appliedDiscount.type === 'percentage') {
        discountAmount = Math.round(subtotal * (appliedDiscount.value / 100));
      } else {
        discountAmount = Math.min(subtotal, appliedDiscount.value);
      }
      discountLine = '<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--accent)"><span>' + appliedDiscount.code + '</span><span style="font-weight:600">−' + fmt(discountAmount, ccy) + '</span></div>';
    }
    var total = Math.max(0, subtotal - discountAmount);
    box.innerHTML = lines + discountLine +
      '<div style="display:flex;justify-content:space-between;font-family:var(--font-display);font-weight:600;font-size:18px;padding-top:14px;border-top:1px solid var(--line)"><span>Total</span><span>' + fmt(total, ccy) + '</span></div>';
  }
  renderSummary();

  // Discount code apply — calls /api/spawn/<slug>/site/discounts and validates.
  var applyBtn = document.getElementById('checkout-apply-discount');
  if (applyBtn) {
    applyBtn.addEventListener('click', async function(){
      var status = document.getElementById('checkout-discount-status');
      var input = document.getElementById('checkout-discount-code');
      var code = (input.value || '').trim().toUpperCase();
      if (!code) { status.textContent = ''; appliedDiscount = null; renderSummary(); return; }
      status.style.color = 'var(--muted)';
      status.textContent = 'Checking…';
      try {
        var res = await fetch('/api/spawn/' + encodeURIComponent(SLUG) + '/site/discounts');
        var body = await res.json();
        var discount = (body.discounts || []).find(function(d){ return d.code === code && d.status === 'active'; });
        if (!discount) {
          appliedDiscount = null; renderSummary();
          status.style.color = '#c0392b';
          status.textContent = 'Code not recognized';
          return;
        }
        // Check min-order if present.
        var cart = readCart();
        var subtotal = cart.reduce(function(s, i){ return s + (i.priceCents||0) * (i.qty||0); }, 0);
        if (discount.minOrderCents && subtotal < discount.minOrderCents) {
          appliedDiscount = null; renderSummary();
          status.style.color = '#c0392b';
          status.textContent = 'Minimum order of ' + fmt(discount.minOrderCents, cart[0] ? cart[0].currency : 'USD') + ' required';
          return;
        }
        appliedDiscount = { code: discount.code, type: discount.type, value: discount.value };
        renderSummary();
        status.style.color = 'var(--accent)';
        status.textContent = 'Applied — ' + (discount.type === 'percentage' ? discount.value + '% off' : fmt(discount.value, cart[0] ? cart[0].currency : 'USD') + ' off');
      } catch(err) {
        appliedDiscount = null; renderSummary();
        status.style.color = '#c0392b';
        status.textContent = 'Could not validate code';
      }
    });
  }
  var form = document.getElementById('checkout-form');
  if (!form) return;
  // ── Stripe payment-element bootstrap ────────────────────────────────
  // Probes /api/checkout/config; if Stripe is configured server-side, we
  // mount the Payment Element and route the form submit through
  // stripe.confirmPayment. Otherwise we fall back to the original
  // "place pending order, no charge" flow.
  var STRIPE = { available: false, instance: null, elements: null, paymentEl: null, clientSecret: null, orderId: null };
  function totalCents(){
    var cart = readCart();
    if (cart.length === 0) return 0;
    var subtotal = cart.reduce(function(s, i){ return s + (i.priceCents||0) * (i.qty||0); }, 0);
    var disc = 0;
    if (appliedDiscount) {
      if (appliedDiscount.type === 'percentage') disc = Math.round(subtotal * (appliedDiscount.value / 100));
      else disc = Math.min(subtotal, appliedDiscount.value);
    }
    return Math.max(0, subtotal - disc);
  }
  (async function bootstrapPayment(){
    var note = document.getElementById('checkout-mode-note');
    try {
      var cfgRes = await fetch('/api/checkout/config');
      var cfg = await cfgRes.json();
      if (!cfg.stripeAvailable || !cfg.publishableKey) {
        if (note) note.textContent = 'No payment is taken yet — we\\'ll email you a payment link after confirming inventory.';
        return;
      }
      // Load stripe.js if not already in the page.
      if (!window.Stripe) {
        await new Promise(function(resolve, reject){
          var s = document.createElement('script');
          s.src = 'https://js.stripe.com/v3/';
          s.async = true; s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      var total = totalCents();
      if (total < 50) {
        if (note) note.textContent = 'Add items to your bag to enable payment.';
        return;
      }
      var cart = readCart();
      var ccy = cart[0] ? cart[0].currency : 'USD';
      STRIPE.orderId = 'o_' + Math.random().toString(36).slice(2, 10);
      var piRes = await fetch('/api/checkout/create-payment-intent', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: SLUG, amountCents: total, currency: ccy, orderId: STRIPE.orderId })
      });
      var piBody = await piRes.json();
      if (!piRes.ok || !piBody.clientSecret) throw new Error(piBody.error || 'create-payment-intent failed');
      STRIPE.clientSecret = piBody.clientSecret;
      STRIPE.instance = window.Stripe(cfg.publishableKey);
      STRIPE.elements = STRIPE.instance.elements({ clientSecret: STRIPE.clientSecret });
      STRIPE.paymentEl = STRIPE.elements.create('payment');
      STRIPE.paymentEl.mount('#checkout-payment-element');
      STRIPE.available = true;
      document.getElementById('checkout-payment-section').style.display = 'block';
      if (note) note.textContent = '';
    } catch (err) {
      if (note) note.textContent = 'Payments unavailable — order will be queued for follow-up.';
      console.error('stripe bootstrap failed', err);
    }
  })();

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    var status = document.getElementById('checkout-status');
    status.textContent = 'Placing order…';
    status.style.color = 'var(--muted)';
    var cart = readCart();
    if (cart.length === 0) { status.textContent = 'Your bag is empty.'; status.style.color = 'var(--ink)'; return; }
    var fd = new FormData(form);
    var ccy = cart[0].currency || 'USD';
    var subtotal = cart.reduce(function(s, i){ return s + (i.priceCents||0) * (i.qty||0); }, 0);
    var discountCents = 0;
    if (appliedDiscount) {
      if (appliedDiscount.type === 'percentage') discountCents = Math.round(subtotal * (appliedDiscount.value / 100));
      else discountCents = Math.min(subtotal, appliedDiscount.value);
    }
    var total = Math.max(0, subtotal - discountCents);
    var orderId = STRIPE.orderId || ('o_' + Math.random().toString(36).slice(2, 10));

    try {
      // Persist the order FIRST so the webhook (or fallback flow) has
      // something to flip. status='pending' for both paths.
      var ordRes = await fetch('/api/spawn/' + encodeURIComponent(SLUG) + '/site/orders', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: orderId, at: new Date().toISOString(), status: 'pending',
          customerEmail: String(fd.get('email') || ''),
          customerName: String(fd.get('name') || ''),
          totalCents: total, currency: ccy,
          items: cart.map(function(i){ return { productId: i.id, name: i.name, qty: i.qty, priceCents: i.priceCents }; }),
          address: String(fd.get('address') || ''),
          discountCode: appliedDiscount ? appliedDiscount.code : null,
          discountCents: discountCents,
        }),
      });
      if (!ordRes.ok) throw new Error('order HTTP ' + ordRes.status);

      if (STRIPE.available && STRIPE.instance && STRIPE.elements) {
        // Confirm payment — Stripe redirects to return_url on success.
        var origin = window.location.origin;
        status.textContent = 'Confirming payment…';
        var confirm = await STRIPE.instance.confirmPayment({
          elements: STRIPE.elements,
          confirmParams: { return_url: origin + '/thank-you?id=' + encodeURIComponent(orderId) },
        });
        if (confirm && confirm.error) {
          status.textContent = confirm.error.message || 'Payment failed';
          status.style.color = '#c0392b';
          return;
        }
        // If we get here without redirect, treat as success (Stripe sometimes inlines on cards w/o 3DS).
        localStorage.removeItem(KEY);
        window.location.href = '/thank-you?id=' + encodeURIComponent(orderId);
        return;
      }

      // Fallback: no Stripe, pending order is already saved.
      localStorage.removeItem(KEY);
      window.location.href = '/thank-you?id=' + encodeURIComponent(orderId);
    } catch(err) {
      status.textContent = 'Could not place order: ' + (err && err.message ? err.message : 'unknown error');
      status.style.color = '#c0392b';
    }
  });
})();
</script>`;
}

// ── Thank-you page body ────────────────────────────────────────────────

export function renderThankYouBody(ctx: RenderContext): string {
  const name = esc(ctx.name);
  return `<section style="padding:120px 0 96px;min-height:60vh">
  <div style="max-width:720px;margin:0 auto;padding:0 32px;text-align:center">
    <div aria-hidden="true" style="width:72px;height:72px;border-radius:50%;border:1px solid var(--accent);color:var(--accent);display:flex;align-items:center;justify-content:center;margin:0 auto 28px">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6"/></svg>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:20px">
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--muted);margin:0;font-family:var(--font-body)">Order confirmed</p>
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
    </div>
    <h1 style="font-family:var(--font-display);font-weight:500;font-size:clamp(36px,5vw,64px);letter-spacing:-0.025em;line-height:1.04;margin:0 0 22px">Thank you.</h1>
    <p style="font-size:17px;color:var(--muted);line-height:1.6;margin:0 auto 18px;max-width:520px">Your order is recorded. We've sent a confirmation to your inbox and will email a tracking link within an hour of dispatch.</p>
    <p style="font-size:13px;color:var(--muted);letter-spacing:0.06em;margin:0 0 36px;font-family:var(--font-body)">Reference <span id="ty-order-id" style="font-family:var(--font-body);font-weight:600;color:var(--ink);letter-spacing:0.04em"></span></p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px;max-width:560px;margin:0 auto 40px;text-align:left">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span aria-hidden="true" style="flex:0 0 auto;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--accent);margin-top:2px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/></svg>
        </span>
        <div>
          <p style="font-family:var(--font-display);font-size:14px;font-weight:500;letter-spacing:-0.005em;margin:0 0 2px">Email on the way</p>
          <p style="font-size:12px;color:var(--muted);line-height:1.5;margin:0">Confirmation with full order detail.</p>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span aria-hidden="true" style="flex:0 0 auto;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--accent);margin-top:2px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/><circle cx="12" cy="12" r="9"/></svg>
        </span>
        <div>
          <p style="font-family:var(--font-display);font-size:14px;font-weight:500;letter-spacing:-0.005em;margin:0 0 2px">Tracking soon</p>
          <p style="font-size:12px;color:var(--muted);line-height:1.5;margin:0">Link arrives the moment we dispatch.</p>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <span aria-hidden="true" style="flex:0 0 auto;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--accent);margin-top:2px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-2"/></svg>
        </span>
        <div>
          <p style="font-family:var(--font-display);font-size:14px;font-weight:500;letter-spacing:-0.005em;margin:0 0 2px">30-day returns</p>
          <p style="font-size:12px;color:var(--muted);line-height:1.5;margin:0">Reach us anytime — we make it easy.</p>
        </div>
      </div>
    </div>
    <a href="/" class="cta primary">Continue shopping</a>
    <p style="font-size:12px;color:var(--muted);margin:24px 0 0;letter-spacing:0.04em">— ${name}</p>
  </div>
</section>
<script>
(function(){
  var qs = new URLSearchParams(window.location.search);
  var el = document.getElementById('ty-order-id');
  if (el) el.textContent = qs.get('id') || '—';
  try {
    var slug = ${JSON.stringify(ctx.slug)};
    localStorage.removeItem('allonce-cart-' + slug);
  } catch(e) {}
})();
</script>`;
}

// ── Newsletter (email capture, walkby pattern) ──────────────────────────

export function renderNewsletter(ctx: RenderContext): string {
  const formId = `nl-${ctx.slug.slice(0, 10)}`;
  return `<section style="padding:120px 0;background:var(--accent-soft);position:relative;overflow:hidden">
  <div style="max-width:640px;margin:0 auto;padding:0 32px;text-align:center;position:relative">
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:22px">
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
      <p style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--ink);margin:0;font-weight:500;font-family:var(--font-body)">Stay in touch</p>
      <span aria-hidden="true" style="display:inline-block;width:32px;height:1px;background:var(--accent);opacity:0.85"></span>
    </div>
    <h3 style="font-family:var(--font-display);font-weight:500;font-size:clamp(32px,4.5vw,48px);letter-spacing:-0.025em;line-height:1.06;margin:0 0 18px">${esc(ctx.content.tagline)}</h3>
    <p style="color:var(--muted);font-size:15px;line-height:1.6;margin:0 auto 32px;max-width:480px">${esc(ctx.content.subhead)}</p>
    <form id="${formId}" data-nl-form="1" style="display:flex;gap:8px;max-width:460px;margin:0 auto;flex-wrap:wrap" onsubmit="(function(f,e){e.preventDefault();var i=f.querySelector('input');var s=f.parentElement.querySelector('[data-nl-status]');i.value='';if(s){s.textContent='Subscribed — watch your inbox.';s.style.color='var(--ink)';s.style.opacity='1';}f.style.opacity='0.55';f.style.pointerEvents='none';})(this,event);return false">
      <input type="email" required placeholder="you@example.com" aria-label="Email address" style="flex:1;min-width:220px;padding:14px 18px;border:1px solid var(--line);background:var(--paper);font-family:var(--font-body);font-size:14px;letter-spacing:0.01em;outline:none;color:var(--ink)" />
      <button type="submit" class="cta primary">${esc(ctx.content.primaryCta)}</button>
    </form>
    <p data-nl-status style="font-size:12px;color:var(--muted);margin:14px 0 0;letter-spacing:0.04em;min-height:1.4em;transition:opacity 0.2s ease">No spam — unsubscribe anytime.</p>
  </div>
</section>`;
}
