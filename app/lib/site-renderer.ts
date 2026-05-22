// Multi-page site renderer.
//
// One LLM call produces a SiteContent JSON. This module turns it into a
// 5-page static site (index, about, features, pricing, contact) with a
// shared header, footer, and palette-driven theme. Pure functions — easy
// to test, fast to render, no I/O.
//
// Apple-inspired minimal. Palette-driven inline CSS. No purple gradients.

export interface Palette {
  ink: string;
  paper: string;
  accent: string;
  muted: string;
  line: string;
}

export interface BrandIdentity {
  archetype?: string;
  voice?: string;
  do?: string[];
  doNot?: string[];
}

export interface Feature {
  title: string;
  description: string;
  icon?: string; // glyph (single char) — optional decorative mark
}

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export interface SiteContent {
  tagline: string;
  subhead: string;
  primaryCta: string;
  secondaryCta: string;
  features: Feature[];
  pricing: PricingTier[];
  faq: Faq[];
  about: { heading: string; body: string; mission: string };
  contact: { email: string; blurb: string };
  testimonials: Testimonial[];
  footer: { tagline: string };
}

export interface RenderInput {
  name: string;
  slug: string;
  paragraph: string;
  content: SiteContent;
  palette: Palette;
  identity: BrandIdentity;
}

// ── Strict-JSON system prompt ────────────────────────────────────────────

export const SITE_CONTENT_SYSTEM_PROMPT = `You are a senior brand copywriter. Given a business brief, return STRICT JSON matching this exact shape:

{
  "tagline": "string, max 80 chars, NOT a sentence — a sharp positioning line",
  "subhead": "string, max 200 chars, one clear sentence explaining what they get",
  "primaryCta": "string, max 18 chars, action verb (e.g. 'Get started', 'Book a call')",
  "secondaryCta": "string, max 18 chars, lower-commitment alternative",
  "features": [
    { "title": "string max 40 chars", "description": "string max 140 chars, concrete benefit, no fluff", "icon": "single emoji or symbol char" }
  ] (EXACTLY 6 items),
  "pricing": [
    { "name": "string", "price": "string with currency symbol", "period": "string e.g. '/month'", "description": "string max 80 chars", "features": ["string"] (4-6 items), "cta": "string max 18 chars", "highlighted": boolean }
  ] (EXACTLY 3 tiers, middle tier highlighted=true),
  "faq": [
    { "q": "string max 100 chars, real question a buyer would ask", "a": "string max 280 chars, direct answer" }
  ] (EXACTLY 6 items),
  "about": {
    "heading": "string max 60 chars",
    "body": "string, 3 short paragraphs separated by \\n\\n, total 400-600 chars",
    "mission": "string max 200 chars, one sentence"
  },
  "contact": {
    "email": "string, plausible support email (e.g. hi@slug.com)",
    "blurb": "string max 200 chars, warm one-liner inviting contact"
  },
  "testimonials": [
    { "quote": "string max 200 chars, sounds like a real customer", "author": "string realistic name", "role": "string realistic title at realistic company" }
  ] (EXACTLY 3 items),
  "footer": { "tagline": "string max 80 chars, brand tone, NOT just repeat tagline" }
}

Rules:
- Match the brand voice exactly.
- Concrete > abstract. "Cut invoice prep from 2h to 8min" beats "Save time on invoices."
- No clichés: avoid "revolutionize", "synergy", "seamless", "innovative", "cutting-edge", "world-class", "next-generation".
- No purple-prose AI-speak. Write like a thoughtful operator, not a marketer.
- Pricing prices must be realistic for the vertical (B2B SaaS: $29-$499; consumer: $9-$99; agency/services: $1k-$10k).
- Return ONLY the JSON. No prose, no fences, no comments.`;

export function buildSiteContentUserMessage(name: string, paragraph: string, aesthetic: string, identity: BrandIdentity): string {
  const voiceLine = identity.voice ? `Voice: ${identity.voice}` : '';
  const doLine = identity.do && identity.do.length > 0 ? `Do: ${identity.do.join('; ')}` : '';
  const dontLine = identity.doNot && identity.doNot.length > 0 ? `Don't: ${identity.doNot.join('; ')}` : '';
  const archetypeLine = identity.archetype ? `Archetype: ${identity.archetype}` : '';
  return [
    `Business: ${name}`,
    `Aesthetic: ${aesthetic}`,
    archetypeLine,
    voiceLine,
    doLine,
    dontLine,
    `Brief: ${paragraph}`,
  ].filter(Boolean).join('\n');
}

// ── Fallback content (when LLM fails or returns garbage) ────────────────

export function fallbackContent(name: string, paragraph: string): SiteContent {
  const first = paragraph.split(/[.!?]/)[0]?.trim() || `${name} helps you ship faster.`;
  return {
    tagline: `${name} — purpose-built, no fluff.`,
    subhead: first.slice(0, 200),
    primaryCta: 'Get started',
    secondaryCta: 'See how it works',
    features: [
      { title: 'Built for operators', description: 'Direct workflows. No dashboards-for-dashboards. Get to the work.', icon: '▸' },
      { title: 'Honest pricing', description: 'Pay for what you use. No seat traps, no hidden gates.', icon: '◆' },
      { title: 'Fast to start', description: 'Up and running in minutes. No 6-week onboarding.', icon: '▲' },
      { title: 'Real support', description: 'Talk to humans who use the product. Replies within hours, not days.', icon: '●' },
      { title: 'Own your data', description: 'Export anytime. Nothing locked. We earn the renewal.', icon: '◉' },
      { title: 'Always shipping', description: 'Weekly improvements. The product gets better while you use it.', icon: '◈' },
    ],
    pricing: [
      { name: 'Starter', price: '$29', period: '/month', description: 'For solo operators getting going.', features: ['Up to 1,000 records', 'Email support', 'Core workflows', 'Export anytime'], cta: 'Start free', highlighted: false },
      { name: 'Team', price: '$99', period: '/month', description: 'For teams of 2 to 10.', features: ['Up to 10,000 records', 'Priority support', 'All workflows', 'API access', 'Audit log'], cta: 'Start free trial', highlighted: true },
      { name: 'Scale', price: '$299', period: '/month', description: 'For larger teams that need more.', features: ['Unlimited records', 'Dedicated support', 'SSO + SAML', 'Custom integrations', 'SLA'], cta: 'Talk to sales', highlighted: false },
    ],
    faq: [
      { q: 'Do you offer a free trial?', a: 'Yes — 14 days, no credit card required. Cancel anytime before the trial ends and you won\'t be charged.' },
      { q: 'Can I export my data?', a: 'Yes. CSV and JSON export are available on every plan, anytime. Your data is yours.' },
      { q: 'Do you have an API?', a: 'Yes, on Team and Scale plans. Full REST API with webhooks for every event.' },
      { q: 'What\'s your support response time?', a: 'Email replies within 4 business hours on Team. Within 1 hour on Scale. Real humans, not bots.' },
      { q: 'Where is my data stored?', a: 'EU region by default. US region available on request. Encrypted at rest and in transit.' },
      { q: 'Can I switch plans?', a: 'Yes, anytime. Upgrades take effect immediately, downgrades at the next billing cycle.' },
    ],
    about: {
      heading: `Why we built ${name}`,
      body: `${first}\n\nWe started because the existing tools felt like they were designed for a deck, not for actual work. Too many tabs, too many fields, too much theater.\n\nWe wanted something an operator could use every day without thinking about it. Quiet, fast, useful. That's it.`,
      mission: `Build a tool that gets out of the way and makes the work itself better.`,
    },
    contact: { email: `hi@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`, blurb: 'Have a question, an edge case, or want to see a demo? Send us a note — a real person will reply.' },
    testimonials: [
      { quote: 'Replaced three spreadsheets and a Slack channel. I get an hour back every day.', author: 'Maya Chen', role: 'Operations Lead, Northwind Studios' },
      { quote: 'The first tool in this space that didn\'t feel like it was designed in a conference room.', author: 'Daniel Park', role: 'Founder, Linecraft' },
      { quote: 'Onboarding took 12 minutes. Our previous vendor needed a 4-week implementation.', author: 'Sofia Mendez', role: 'Director of Ops, Beam & Co' },
    ],
    footer: { tagline: `Built with care. Used in production.` },
  };
}

// ── Parser ───────────────────────────────────────────────────────────────

export function parseSiteContent(raw: string): SiteContent | null {
  if (!raw || typeof raw !== 'string') return null;
  // Strip code fences if present.
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fence && fence[1]) text = fence[1].trim();
  // Find first balanced object.
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(text.slice(start, end + 1)); }
  catch { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  // Structural validation — every required field present and well-shaped.
  if (typeof obj['tagline'] !== 'string' || typeof obj['subhead'] !== 'string') return null;
  if (!Array.isArray(obj['features']) || obj['features'].length < 3) return null;
  if (!Array.isArray(obj['pricing']) || obj['pricing'].length < 2) return null;
  if (!Array.isArray(obj['faq']) || obj['faq'].length < 3) return null;
  if (!obj['about'] || typeof obj['about'] !== 'object') return null;
  return obj as unknown as SiteContent;
}

// ── HTML helpers ────────────────────────────────────────────────────────

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

function pageShell(opts: {
  title: string;
  description: string;
  palette: Palette;
  name: string;
  body: string;
  currentRoute: string;
}): string {
  const { title, description, palette, name, body, currentRoute } = opts;
  const isActive = (r: string) => r === currentRoute ? ' aria-current="page"' : '';
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<style>
:root{
  --ink:${palette.ink};
  --paper:${palette.paper};
  --accent:${palette.accent};
  --muted:${palette.muted};
  --line:${palette.line};
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif;background:var(--paper);color:var(--ink);line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}

/* Layout primitives */
.wrap{max-width:1120px;margin:0 auto;padding:0 32px}
.row{display:flex;gap:32px;align-items:center}
.cta{display:inline-flex;align-items:center;gap:8px;padding:14px 22px;border-radius:999px;font-size:15px;font-weight:600;letter-spacing:-0.01em;transition:transform .15s ease,box-shadow .15s ease}
.cta.primary{background:var(--ink);color:var(--paper)}
.cta.primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.15)}
.cta.secondary{background:transparent;color:var(--ink);border:1px solid var(--line)}
.cta.secondary:hover{border-color:var(--ink)}
.cta.accent{background:var(--accent);color:#fff}
.cta.accent:hover{transform:translateY(-1px);box-shadow:0 8px 24px ${palette.accent}33}

/* Header */
header.nav{position:sticky;top:0;z-index:50;background:${palette.paper}ee;backdrop-filter:saturate(180%) blur(14px);-webkit-backdrop-filter:saturate(180%) blur(14px);border-bottom:1px solid var(--line)}
header.nav .row{height:64px;justify-content:space-between}
header.nav .logo{font-weight:700;letter-spacing:-0.02em;font-size:18px;display:flex;align-items:center;gap:8px}
header.nav .logo .dot{width:8px;height:8px;border-radius:50%;background:var(--accent)}
header.nav nav{display:flex;gap:28px;align-items:center}
header.nav nav a{font-size:14px;font-weight:500;color:var(--muted);transition:color .15s ease}
header.nav nav a:hover,header.nav nav a[aria-current]{color:var(--ink)}
header.nav .cta{padding:8px 16px;font-size:13px}

/* Hero */
section.hero{padding:120px 0 96px}
section.hero h1{font-size:clamp(44px,7vw,84px);font-weight:700;letter-spacing:-0.04em;line-height:1.02;max-width:920px}
section.hero p.subhead{margin-top:24px;font-size:clamp(18px,2vw,22px);color:var(--muted);max-width:680px;line-height:1.4;letter-spacing:-0.01em}
section.hero .ctas{margin-top:40px;display:flex;gap:12px;flex-wrap:wrap}
.kicker{font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:24px;display:inline-flex;align-items:center;gap:8px}
.kicker::before{content:"";width:24px;height:1px;background:var(--muted)}

/* Sections */
section{padding:96px 0}
section.muted{background:${palette.paper === '#fafafa' ? '#f5f5f7' : palette.paper};border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
h2{font-size:clamp(32px,5vw,52px);font-weight:700;letter-spacing:-0.03em;line-height:1.08;max-width:780px}
h2 + p.lede{margin-top:16px;font-size:18px;color:var(--muted);max-width:640px;line-height:1.5}

/* Features grid */
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;margin-top:64px;background:var(--line);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.feature{background:var(--paper);padding:40px 32px}
.feature .icon{display:inline-flex;width:40px;height:40px;border-radius:10px;background:${palette.accent}11;color:var(--accent);align-items:center;justify-content:center;font-size:20px;margin-bottom:20px}
.feature h3{font-size:18px;font-weight:600;letter-spacing:-0.01em;margin-bottom:8px}
.feature p{font-size:15px;color:var(--muted);line-height:1.55}

/* Pricing */
.pricing{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:64px;align-items:stretch}
.tier{border:1px solid var(--line);border-radius:20px;padding:40px 32px;background:var(--paper);position:relative;display:flex;flex-direction:column}
.tier.highlighted{border-color:var(--ink);box-shadow:0 4px 24px rgba(0,0,0,.06)}
.tier.highlighted::before{content:"Most popular";position:absolute;top:-12px;left:32px;background:var(--ink);color:var(--paper);font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px}
.tier h3{font-size:14px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);margin-bottom:16px}
.tier .price{display:flex;align-items:baseline;gap:6px;margin-bottom:8px}
.tier .price .amount{font-size:44px;font-weight:700;letter-spacing:-0.03em}
.tier .price .period{font-size:15px;color:var(--muted)}
.tier .desc{font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.5}
.tier ul{list-style:none;margin-bottom:32px;flex:1}
.tier li{font-size:14px;padding:8px 0;display:flex;align-items:flex-start;gap:10px;color:var(--ink)}
.tier li::before{content:"✓";color:var(--accent);font-weight:700;flex-shrink:0}
.tier .cta{width:100%;justify-content:center}

/* FAQ */
.faq{margin-top:48px;max-width:780px}
.faq details{border-bottom:1px solid var(--line);padding:24px 0}
.faq summary{font-size:18px;font-weight:600;cursor:pointer;letter-spacing:-0.01em;list-style:none;display:flex;justify-content:space-between;align-items:center}
.faq summary::after{content:"+";font-size:24px;color:var(--muted);font-weight:400;transition:transform .2s ease}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq details p{margin-top:14px;color:var(--muted);font-size:15px;line-height:1.55;max-width:680px}

/* Testimonials */
.testimonials{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:64px}
.testimonial{padding:32px;border:1px solid var(--line);border-radius:16px;background:var(--paper)}
.testimonial blockquote{font-size:17px;line-height:1.5;letter-spacing:-0.01em;color:var(--ink);margin-bottom:24px}
.testimonial .author{font-size:14px;font-weight:600}
.testimonial .role{font-size:13px;color:var(--muted);margin-top:2px}

/* CTA band */
.cta-band{margin:120px 32px;max-width:1056px;margin-left:auto;margin-right:auto;padding:80px 48px;background:var(--ink);color:var(--paper);border-radius:24px;text-align:center}
.cta-band h2{color:var(--paper);margin:0 auto}
.cta-band p{color:${palette.paper}99;margin-top:16px;font-size:18px;max-width:540px;margin-left:auto;margin-right:auto}
.cta-band .ctas{margin-top:36px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cta-band .cta.primary{background:var(--paper);color:var(--ink)}
.cta-band .cta.secondary{border-color:${palette.paper}33;color:var(--paper)}

/* Footer */
footer{padding:64px 0 48px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
footer .row{justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:32px}
footer .brand{font-weight:600;color:var(--ink);font-size:16px;margin-bottom:4px}
footer .tagline{max-width:320px;line-height:1.5}
footer .links{display:flex;flex-wrap:wrap;gap:24px}
footer .links a{font-size:14px;transition:color .15s ease}
footer .links a:hover{color:var(--ink)}
footer .meta{margin-top:32px;padding-top:24px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}

/* About */
.about-body{margin-top:48px;max-width:680px;font-size:17px;line-height:1.65;color:var(--ink)}
.about-body p{margin-bottom:20px}
.mission{margin-top:48px;padding:32px;border-left:3px solid var(--accent);background:${palette.accent}08;font-size:18px;line-height:1.5;letter-spacing:-0.01em}
.mission .label{font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}

/* Contact */
.contact-card{margin-top:48px;max-width:560px;padding:40px;border:1px solid var(--line);border-radius:20px}
.contact-card .email{font-size:24px;font-weight:600;letter-spacing:-0.02em;color:var(--accent);margin-bottom:12px}
.contact-card .email a:hover{text-decoration:underline}
.contact-card .blurb{color:var(--muted);font-size:16px;line-height:1.55}

@media (max-width:640px){
  .wrap{padding:0 20px}
  header.nav nav{display:none}
  section.hero{padding:80px 0 64px}
  section{padding:64px 0}
  .cta-band{margin:80px 16px;padding:48px 28px}
  .tier{padding:32px 24px}
}
</style>
</head>
<body>
<header class="nav">
  <div class="wrap">
    <div class="row">
      <a href="/" class="logo">${esc(name)}<span class="dot"></span></a>
      <nav>
        <a href="/"${isActive('/')}>Home</a>
        <a href="/features"${isActive('/features')}>Features</a>
        <a href="/pricing"${isActive('/pricing')}>Pricing</a>
        <a href="/about"${isActive('/about')}>About</a>
        <a href="/contact" class="cta primary"${isActive('/contact')}>Contact</a>
      </nav>
    </div>
  </div>
</header>
${body}
</body></html>`;
}

function renderHeroBlock(name: string, content: SiteContent, accentVariant = false): string {
  return `<section class="hero">
  <div class="wrap">
    <span class="kicker">${esc(name)}</span>
    <h1>${esc(content.tagline)}</h1>
    <p class="subhead">${esc(content.subhead)}</p>
    <div class="ctas">
      <a href="/contact" class="cta ${accentVariant ? 'accent' : 'primary'}">${esc(content.primaryCta)} →</a>
      <a href="/features" class="cta secondary">${esc(content.secondaryCta)}</a>
    </div>
  </div>
</section>`;
}

function renderFeaturesBlock(content: SiteContent, heading?: string): string {
  const h2 = heading ?? 'What you get';
  return `<section class="muted">
  <div class="wrap">
    <h2>${esc(h2)}</h2>
    <p class="lede">Direct workflows. Real outputs. No theater.</p>
    <div class="features">
      ${content.features.map((f) => `
      <div class="feature">
        <div class="icon">${esc(f.icon ?? '◆')}</div>
        <h3>${esc(f.title)}</h3>
        <p>${esc(f.description)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;
}

function renderTestimonialsBlock(content: SiteContent): string {
  if (!content.testimonials || content.testimonials.length === 0) return '';
  return `<section>
  <div class="wrap">
    <h2>Used by operators who don't have time to waste</h2>
    <div class="testimonials">
      ${content.testimonials.map((t) => `
      <div class="testimonial">
        <blockquote>"${esc(t.quote)}"</blockquote>
        <div class="author">${esc(t.author)}</div>
        <div class="role">${esc(t.role)}</div>
      </div>`).join('')}
    </div>
  </div>
</section>`;
}

function renderPricingBlock(content: SiteContent, heading?: string): string {
  const h2 = heading ?? 'Pricing';
  return `<section class="muted">
  <div class="wrap">
    <h2>${esc(h2)}</h2>
    <p class="lede">Pay for what you use. No seat traps, no hidden gates.</p>
    <div class="pricing">
      ${content.pricing.map((p) => `
      <div class="tier${p.highlighted ? ' highlighted' : ''}">
        <h3>${esc(p.name)}</h3>
        <div class="price"><span class="amount">${esc(p.price)}</span><span class="period">${esc(p.period)}</span></div>
        <p class="desc">${esc(p.description)}</p>
        <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <a href="/contact" class="cta ${p.highlighted ? 'primary' : 'secondary'}">${esc(p.cta)}</a>
      </div>`).join('')}
    </div>
  </div>
</section>`;
}

function renderFaqBlock(content: SiteContent): string {
  return `<section>
  <div class="wrap">
    <h2>Common questions</h2>
    <div class="faq">
      ${content.faq.map((f) => `
      <details>
        <summary>${esc(f.q)}</summary>
        <p>${esc(f.a)}</p>
      </details>`).join('')}
    </div>
  </div>
</section>`;
}

function renderCtaBand(content: SiteContent): string {
  return `<div class="cta-band">
  <h2>${esc(content.tagline)}</h2>
  <p>${esc(content.subhead)}</p>
  <div class="ctas">
    <a href="/contact" class="cta primary">${esc(content.primaryCta)} →</a>
    <a href="/pricing" class="cta secondary">${esc(content.secondaryCta)}</a>
  </div>
</div>`;
}

function renderFooter(name: string, content: SiteContent): string {
  const year = new Date().getFullYear();
  return `<footer>
  <div class="wrap">
    <div class="row">
      <div>
        <div class="brand">${esc(name)}</div>
        <div class="tagline">${esc(content.footer.tagline)}</div>
      </div>
      <div class="links">
        <a href="/">Home</a>
        <a href="/features">Features</a>
        <a href="/pricing">Pricing</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </div>
    </div>
    <div class="meta">
      <span>© ${year} ${esc(name)}</span>
      <span>Built with AllOnce</span>
    </div>
  </div>
</footer>`;
}

// ── Page renderers ──────────────────────────────────────────────────────

export function renderIndex(input: RenderInput): string {
  const { name, content, palette } = input;
  return pageShell({
    title: `${name} — ${content.tagline}`,
    description: content.subhead,
    palette,
    name,
    currentRoute: '/',
    body: [
      renderHeroBlock(name, content),
      renderFeaturesBlock(content),
      renderTestimonialsBlock(content),
      renderPricingBlock(content, 'Simple, honest pricing'),
      renderFaqBlock(content),
      renderCtaBand(content),
      renderFooter(name, content),
    ].join('\n'),
  });
}

export function renderAbout(input: RenderInput): string {
  const { name, content, palette } = input;
  const paragraphs = content.about.body.split(/\n\n+/).map((p) => `<p>${esc(p.trim())}</p>`).join('');
  return pageShell({
    title: `About — ${name}`,
    description: content.about.mission,
    palette,
    name,
    currentRoute: '/about',
    body: `<section class="hero" style="padding-bottom:48px">
  <div class="wrap">
    <span class="kicker">About</span>
    <h1>${esc(content.about.heading)}</h1>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap">
    <div class="about-body">${paragraphs}</div>
    <div class="mission">
      <div class="label">Our mission</div>
      ${esc(content.about.mission)}
    </div>
  </div>
</section>
${renderTestimonialsBlock(content)}
${renderCtaBand(content)}
${renderFooter(name, content)}`,
  });
}

export function renderFeatures(input: RenderInput): string {
  const { name, content, palette } = input;
  return pageShell({
    title: `Features — ${name}`,
    description: `What ${name} does, in detail.`,
    palette,
    name,
    currentRoute: '/features',
    body: `<section class="hero" style="padding-bottom:48px">
  <div class="wrap">
    <span class="kicker">Features</span>
    <h1>Everything ${esc(name)} does, in detail.</h1>
    <p class="subhead">No hand-wavy bullets. Each capability listed below is shipped today.</p>
  </div>
</section>
${renderFeaturesBlock(content, 'Capabilities')}
${renderTestimonialsBlock(content)}
${renderCtaBand(content)}
${renderFooter(name, content)}`,
  });
}

export function renderPricing(input: RenderInput): string {
  const { name, content, palette } = input;
  return pageShell({
    title: `Pricing — ${name}`,
    description: `Plans and pricing for ${name}.`,
    palette,
    name,
    currentRoute: '/pricing',
    body: `<section class="hero" style="padding-bottom:48px">
  <div class="wrap">
    <span class="kicker">Pricing</span>
    <h1>Honest pricing. No surprises.</h1>
    <p class="subhead">Start free. Upgrade when you actually need it.</p>
  </div>
</section>
${renderPricingBlock(content, 'Plans')}
${renderFaqBlock(content)}
${renderCtaBand(content)}
${renderFooter(name, content)}`,
  });
}

export function renderContact(input: RenderInput): string {
  const { name, content, palette } = input;
  return pageShell({
    title: `Contact — ${name}`,
    description: content.contact.blurb,
    palette,
    name,
    currentRoute: '/contact',
    body: `<section class="hero" style="padding-bottom:48px">
  <div class="wrap">
    <span class="kicker">Contact</span>
    <h1>Talk to us.</h1>
    <p class="subhead">${esc(content.contact.blurb)}</p>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap">
    <div class="contact-card">
      <div class="email"><a href="mailto:${esc(content.contact.email)}">${esc(content.contact.email)}</a></div>
      <div class="blurb">A real person reads every email. Expect a reply within one business day.</div>
    </div>
  </div>
</section>
${renderCtaBand(content)}
${renderFooter(name, content)}`,
  });
}

// ── Public entry point ──────────────────────────────────────────────────

export function renderAllPages(input: RenderInput): Record<string, string> {
  return {
    'index.html': renderIndex(input),
    'about.html': renderAbout(input),
    'features.html': renderFeatures(input),
    'pricing.html': renderPricing(input),
    'contact.html': renderContact(input),
  };
}
