// Three-layer variant schema.
//
// LAYER 1 — Picks: enum tokens. Each maps to a wired code path (CSS, fonts,
//           motion keyframes, section variants). LLM cannot author HTML; only
//           picks which wired implementation to use.
//
// LAYER 2 — Params: free-roam values into wired slots. LLM authors hex colors,
//           Gemini prompts, custom labels, icons. Validators sanitize before
//           the renderer touches them.
//
// LAYER 3 — Decorations: sandboxed SVG snippets. LLM authors tiny visual
//           moments (orbits, dividers, glyphs) using a whitelisted tag set.
//           Renderer injects them at fixed anchors per section.
//
// Plus Content: the existing SiteContent (copy for hero/features/pricing/etc).
//
// A spawn produces exactly one VariantSpec. Renderer composes the final HTML
// from the four layers without any LLM-generated markup.

// ── Layer 1: Picks ────────────────────────────────────────────────────────

export const PICK_OPTIONS = {
  template: [
    "vercel-saas",
    "walkby-ecom",
    "afisha-hotel",
    "equivalenza-retail",
    "utopia-portfolio",
    "qualige-edu",
  ] as const,
  layout: [
    "centered",
    "split",
    "asymmetric",
    "sidebar",
    "full-bleed",
    "editorial-grid",
  ] as const,
  hero: [
    "photo-fullbleed",
    "photo-split",
    "video-loop",
    "typography-only",
    "abstract-gradient",
    "illustration",
    "product-isolate",
    "scroll-reveal",
    "manifesto-statement",
    "big-number-display",
    "split-image-caption",
    "side-numbers",
    "vertical-marquee",
  ] as const,
  heroPhotoStyle: [
    "cinematic",
    "editorial",
    "natural-light",
    "high-contrast",
    "overhead",
    "environmental",
    "product-isolation",
    "candid",
  ] as const,
  palette: [
    "mono-ink",
    "warm-paper",
    "cool-tech",
    "earth",
    "electric",
    "pastel",
    "bw-contrast",
    "jewel",
    "oxblood",
    "mint",
    "slate",
    "terracotta",
  ] as const,
  background: [
    "solid",
    "subtle-grain",
    "gradient-mesh",
    "dot-grid",
    "line-grid",
    "abstract-shape",
    "film-grain",
    "none",
    "paper-grain",
    "crosshatch",
    "noise-overlay",
    "vignette",
  ] as const,
  fonts: [
    "editorial-serif",
    "swiss-grotesk",
    "neo-grotesk",
    "display-serif",
    "mono-led",
    "humanist",
    "rounded-friendly",
    "classical",
  ] as const,
  sectionOrder: [
    "classic",
    "social-first",
    "pricing-led",
    "story-first",
    "editorial",
    "minimal",
    "feature-deep",
    "metrics-first",
    "value-led",
    "trust-stack",
    "proof-heavy",
    "visual-led",
    "tech-led",
    "cinematic",
  ] as const,
  density: ["tight", "balanced", "spacious", "luxe"] as const,
  motion: [
    "none",
    "subtle-fade",
    "scroll-stagger",
    "parallax-hero",
    "counter-numbers",
    "hover-tilt",
    "magnetic-cta",
    "letter-stagger",
    "marquee-text-line",
  ] as const,
  cta: ["pill", "square", "underline", "text-arrow", "filled-block"] as const,
  radius: ["sharp", "soft-12", "pill", "mixed"] as const,
  imageFx: [
    "none",
    "grayscale",
    "duotone",
    "tinted",
    "overlay",
    "film",
  ] as const,
  typeScale: ["compressed", "balanced", "luxurious", "small"] as const,
  logoPos: ["top-left", "top-center", "bottom-watermark", "mark-only"] as const,
  navStyle: [
    "minimal-flat",
    "floating-pill",
    "fullwidth-bordered",
    "sidebar-rail",
  ] as const,
  footerStyle: [
    "compact",
    "expanded-columns",
    "cta-card-bottom",
    "minimal-watermark",
  ] as const,
  hoverEffect: [
    "none",
    "underline-slide",
    "color-swap",
    "arrow-grow",
    "scale-tilt",
  ] as const,
  dividers: [
    "none",
    "thin-line",
    "hairline-fade",
    "chunky-rule",
    "decorative-glyph",
  ] as const,
  featuresStyle: [
    "grid-card",
    "editorial-rows",
    "asymmetric-split",
    "display-numerals",
  ] as const,
  pricingStyle: ["cards", "comparison-table", "simple-list"] as const,
  testimonialsStyle: [
    "cards",
    "marquee",
    "editorial-stack",
    "spotlight-quote",
  ] as const,
  // heroOverlay — strength of the dark/light gradient over photo-led heroes
  // (photo-fullbleed, photo-split, scroll-reveal). Lets the LLM dial mood
  // independent of palette: a "natural-light overhead" photo with a heavy
  // overlay reads as moody; a vignette-only treatment keeps the photo
  // dominant. Previously hardcoded per hero variant — now an axis.
  heroOverlay: ["none", "light", "medium", "heavy", "vignette"] as const,
  // wordmarkStyle — how the brand name renders in nav across every page.
  // Was hardcoded "plain text + dot" on every spawn. Real signature axis:
  //   plain    → "Brand Name." (current behaviour; default)
  //   capsule  → "Brand Name" pill, thin outline
  //   monogram → 2-letter initials in a square accent-soft chip
  //   stacked  → Brand / Name on two lines, tight letter-spacing
  //   underline-bar → text + 2px accent rule beneath
  wordmarkStyle: [
    "plain",
    "capsule",
    "monogram",
    "stacked",
    "underline-bar",
  ] as const,
  // headerScroll — how the nav reacts to vertical scroll.
  //   static       → header sits in normal flow, scrolls off with the page
  //   sticky       → header sticks to the top, full height
  //   shrink-on-scroll → header sticks AND compresses (height + padding) once
  //                      the page scrolls past a threshold. Reads naturally
  //                      as "premium product site" behaviour. Added 2026-05-14.
  headerScroll: ["static", "sticky", "shrink-on-scroll"] as const,
  // linkStyle — how inline text links (not CTAs) react to hover.  Applied
  // site-wide via a stylesheet snippet emitted next to baseCss in each
  // template.  Added 2026-05-14.
  linkStyle: [
    "underline-on-hover",
    "underline-always",
    "accent-color",
    "arrow-grow",
    "reverse-underline",
  ] as const,
  // accentEmphasis — how prominently the accent reads across the site's
  // tinted surfaces (badges, soft fills, hover states).  Single CSS-var
  // override (--accent-soft alpha) — universal effect, no retrofit.
  //   subtle    → 5% accent tint (almost invisible, sophisticated)
  //   balanced  → 10% (current default behaviour)
  //   bold      → 18% (more visible chips, more colour-led pages)
  //   vivid     → 28% + saturation boost via filter (high-impact landing)
  // Added 2026-05-14.
  accentEmphasis: ["subtle", "balanced", "bold", "vivid"] as const,
  // selectStyle — how text selection (::selection) renders site-wide.
  //   accent       → accent bg, paper fg (default; brand-led)
  //   accent-soft  → accent at 25% alpha, ink fg (gentle)
  //   ink          → ink bg, paper fg (high-contrast classical)
  //   minimal      → 8% black/white wash, color preserved (Apple-like)
  // Pure-CSS, no renderer retrofit.  Added 2026-05-14.
  selectStyle: ["accent", "accent-soft", "ink", "minimal"] as const,
  // focusRingStyle — how :focus-visible renders on inputs / buttons / links.
  //   accent       → 2px solid accent ring (default; clear, accessible)
  //   accent-soft  → 3px accent-soft halo, no hard ring (gentle)
  //   ink          → 2px solid ink ring (high-contrast classical)
  //   glow         → accent ring + soft blur shadow (premium / iOS-like)
  // Pure-CSS via :focus-visible.  Added 2026-05-14.
  focusRingStyle: ["accent", "accent-soft", "ink", "glow"] as const,
  // scrollIndicator — thin progress bar pinned to the viewport top that
  // fills as the operator scrolls.  Updated via a tiny inline scroll
  // listener writing CSS var --scroll-progress (0 → 1).
  //   none       → no indicator (default for spawns predating this axis)
  //   line       → 2px solid accent, no track
  //   glow       → 3px accent + soft blur shadow
  //   soft-track → 1px accent-soft track + 2px accent fill on top
  // Added 2026-05-14.
  scrollIndicator: ["none", "line", "glow", "soft-track"] as const,
  // cardElevation — depth treatment applied to product/pricing/feature
  // cards across every template via [class*='-card'] selector.
  //   flat       → no shadow (the current behaviour; minimalist)
  //   soft       → single thin shadow (the gentle default for premium feel)
  //   floating   → medium box-shadow + hover lift via translateY(-2px)
  //   layered    → stacked shadows for an Apple-like depth signature
  // Pure-CSS, hover-aware, no renderer retrofit.  Added 2026-05-15.
  cardElevation: ["flat", "soft", "floating", "layered"] as const,
  // inputStyle — how text inputs/textareas/selects render site-wide.
  // Applies to contact forms, signup, shop checkout, every form field.
  //   minimal        → 1px border-bottom only, accent on focus (default)
  //   boxed          → 1px border on all sides, rounded, accent on focus
  //   filled         → soft accent-tint background, no border, ring on focus
  //   underline-bold → 2px solid border-bottom, accent on focus (editorial)
  // Pure-CSS, no JS, accessible default.  Added 2026-05-15.
  inputStyle: ["minimal", "boxed", "filled", "underline-bold"] as const,
  // badgeStyle — small chips/tags used for "New", category labels, hero
  // kicker pills, pricing highlights.  Wired to `.badge, [class*='-badge'],
  // .chip, [class*='-chip']` selectors site-wide.
  //   pill-soft      → rounded-full + soft accent bg (default)
  //   square-outline → 1px accent outline, no fill, 6px radius
  //   dot-prefix     → no bg/border, small accent dot before text
  //   accent-block   → solid accent bg, contrasting foreground
  // Added 2026-05-15.
  badgeStyle: [
    "pill-soft",
    "square-outline",
    "dot-prefix",
    "accent-block",
  ] as const,
  // imageBorderRadius — corner treatment for content images (hero photo,
  // product photos, testimonial avatars, gallery thumbnails). Excludes
  // logos/icons/decorative SVGs via :not() and a [data-no-radius]
  // escape-hatch.  Per-component CSS still wins on specificity.
  //   sharp   → 0 corners (default editorial vibe)
  //   soft    → 8px (current implicit default across templates)
  //   rounded → 16px (Apple-leaning premium)
  //   pill    → fully rounded (extreme; works for avatar grids)
  // Added 2026-05-15.
  imageBorderRadius: ["sharp", "soft", "rounded", "pill"] as const,
} as const;

export type TemplateKey = (typeof PICK_OPTIONS.template)[number];
export type LayoutKey = (typeof PICK_OPTIONS.layout)[number];
export type HeroKey = (typeof PICK_OPTIONS.hero)[number];
export type HeroPhotoStyleKey = (typeof PICK_OPTIONS.heroPhotoStyle)[number];
export type PaletteKey = (typeof PICK_OPTIONS.palette)[number];
export type BackgroundKey = (typeof PICK_OPTIONS.background)[number];
export type FontsKey = (typeof PICK_OPTIONS.fonts)[number];
export type SectionOrderKey = (typeof PICK_OPTIONS.sectionOrder)[number];
export type DensityKey = (typeof PICK_OPTIONS.density)[number];
export type MotionKey = (typeof PICK_OPTIONS.motion)[number];
export type CtaKey = (typeof PICK_OPTIONS.cta)[number];
export type RadiusKey = (typeof PICK_OPTIONS.radius)[number];
export type ImageFxKey = (typeof PICK_OPTIONS.imageFx)[number];
export type TypeScaleKey = (typeof PICK_OPTIONS.typeScale)[number];
export type LogoPosKey = (typeof PICK_OPTIONS.logoPos)[number];
export type NavStyleKey = (typeof PICK_OPTIONS.navStyle)[number];
export type FooterStyleKey = (typeof PICK_OPTIONS.footerStyle)[number];
export type HoverEffectKey = (typeof PICK_OPTIONS.hoverEffect)[number];
export type DividersKey = (typeof PICK_OPTIONS.dividers)[number];
export type FeaturesStyleKey = (typeof PICK_OPTIONS.featuresStyle)[number];
export type PricingStyleKey = (typeof PICK_OPTIONS.pricingStyle)[number];
export type TestimonialsStyleKey =
  (typeof PICK_OPTIONS.testimonialsStyle)[number];
export type HeroOverlayKey = (typeof PICK_OPTIONS.heroOverlay)[number];
export type WordmarkStyleKey = (typeof PICK_OPTIONS.wordmarkStyle)[number];
export type HeaderScrollKey = (typeof PICK_OPTIONS.headerScroll)[number];
export type LinkStyleKey = (typeof PICK_OPTIONS.linkStyle)[number];
export type AccentEmphasisKey = (typeof PICK_OPTIONS.accentEmphasis)[number];
export type SelectStyleKey = (typeof PICK_OPTIONS.selectStyle)[number];
export type FocusRingStyleKey = (typeof PICK_OPTIONS.focusRingStyle)[number];
export type ScrollIndicatorKey = (typeof PICK_OPTIONS.scrollIndicator)[number];
export type CardElevationKey = (typeof PICK_OPTIONS.cardElevation)[number];
export type InputStyleKey = (typeof PICK_OPTIONS.inputStyle)[number];
export type BadgeStyleKey = (typeof PICK_OPTIONS.badgeStyle)[number];
export type ImageBorderRadiusKey =
  (typeof PICK_OPTIONS.imageBorderRadius)[number];

export interface VariantPicks {
  template: TemplateKey;
  layout: LayoutKey;
  hero: HeroKey;
  heroPhotoStyle: HeroPhotoStyleKey;
  palette: PaletteKey;
  background: BackgroundKey;
  fonts: FontsKey;
  sectionOrder: SectionOrderKey;
  density: DensityKey;
  motion: MotionKey;
  cta: CtaKey;
  radius: RadiusKey;
  imageFx: ImageFxKey;
  typeScale: TypeScaleKey;
  logoPos: LogoPosKey;
  navStyle: NavStyleKey;
  footerStyle: FooterStyleKey;
  hoverEffect: HoverEffectKey;
  dividers: DividersKey;
  featuresStyle: FeaturesStyleKey;
  pricingStyle: PricingStyleKey;
  testimonialsStyle: TestimonialsStyleKey;
  /** Optional — defaults to 'medium' for backward compat with spawns
   *  created before chunk 162. Hero renderer reads via heroOverlayCss(). */
  heroOverlay?: HeroOverlayKey;
  /** Optional — defaults to 'plain' for backward compat with spawns
   *  created before chunk 171. renderNav reads via wordmarkCss(). */
  wordmarkStyle?: WordmarkStyleKey;
  /** Optional — defaults to 'sticky' for spawns predating this axis.
   *  renderNav emits the corresponding CSS + inline shrink-on-scroll script. */
  headerScroll?: HeaderScrollKey;
  /** Optional — defaults to 'underline-on-hover'. linkStyleCss() emits the
   *  site-wide stylesheet snippet read by each template's <style> block. */
  linkStyle?: LinkStyleKey;
  /** Optional — defaults to 'balanced'. accentEmphasisCss() overrides the
   *  --accent-soft alpha so the accent reads more or less prominently. */
  accentEmphasis?: AccentEmphasisKey;
  /** Optional — defaults to 'accent'. selectStyleCss() emits site-wide
   *  ::selection CSS so the highlight matches the brand voice. */
  selectStyle?: SelectStyleKey;
  /** Optional — defaults to 'accent'. focusRingStyleCss() emits
   *  :focus-visible CSS for inputs / buttons / links. */
  focusRingStyle?: FocusRingStyleKey;
  /** Optional — defaults to 'none'. scrollIndicatorCss() emits a fixed
   *  top progress bar + inline script that tracks scroll position. */
  scrollIndicator?: ScrollIndicatorKey;
  /** Optional — defaults to 'soft'. cardElevationCss() emits box-shadow
   *  + hover-lift rules targeting any element with a `-card` class token. */
  cardElevation?: CardElevationKey;
  /** Optional — defaults to 'minimal'. inputStyleCss() emits site-wide
   *  styling for input/textarea/select with matching :focus-visible rules. */
  inputStyle?: InputStyleKey;
  /** Optional — defaults to 'pill-soft'. badgeStyleCss() emits site-wide
   *  styling for `.badge`, `.chip`, `[class*='-badge']`, `[class*='-chip']`. */
  badgeStyle?: BadgeStyleKey;
  /** Optional — defaults to 'soft'. imageBorderRadiusCss() applies corner
   *  radius to content `<img>` / `<picture> img` elements site-wide. */
  imageBorderRadius?: ImageBorderRadiusKey;
}

// ── Layer 2: Params (free-roam values into wired slots) ─────────────────

export interface VariantParams {
  /** Overrides palette accent. Hex format. WCAG-validated against paper. */
  accentColor?: string;
  /** Overrides palette ink. */
  inkColor?: string;
  /** Overrides palette paper. */
  paperColor?: string;
  /** 2-4 hex stops for background gradient. Validated. */
  bgGradientStops?: string[];
  /** Free-form prompt for the hero photo Gemini call. 50-800 chars. */
  heroImagePrompt?: string;
  /** Negative prompt — what to avoid in the hero photo. */
  heroNegativePrompt?: string;
  /** Section heading overrides keyed by section type. */
  customLabels?: Partial<{
    features: string;
    pricing: string;
    faq: string;
    testimonials: string;
    about: string;
    contact: string;
    cta: string;
  }>;
  /** Per-feature icon glyphs. 1-2 chars each. One per feature. */
  featureIcons?: string[];
  /** Small kicker line above the hero headline. ≤ 30 chars. */
  taglineSuperline?: string;
  /** Testimonial quote opener glyph. From approved set. */
  quoteMark?: '"' | "❝" | "//" | "—" | "«";
  /** Section divider style. */
  dividerStyle?: "wave" | "dot-row" | "single-line" | "double-line" | "none";
  /** Free-form CSS appended after every other style emission.  Used as an
   *  escape hatch when the operator's directive doesn't fit a structured
   *  pick — the chat (or restyle endpoint) authors raw CSS that overrides
   *  anything the templates emit. Sanitized: no <script>, no @import, no
   *  javascript: urls, length-capped at 16k. */
  customCss?: string;
}

// ── Layer 3: Decorations (sandboxed SVG snippets) ───────────────────────

export type DecorationSection =
  | "hero"
  | "features"
  | "pricing"
  | "faq"
  | "cta"
  | "footer"
  | "testimonials";
export type DecorationAnchor =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export interface Decoration {
  section: DecorationSection;
  anchor: DecorationAnchor;
  /** Inner SVG content — wrapped by renderer in a positioned <svg viewBox>.
   *  Either `svg` (free-roam, validated) or `preset` (named library entry). */
  svg?: string;
  /** Preset id from the decoration-presets library. Preferred over freeform. */
  preset?: string;
  /** Optional opacity 0-1. */
  opacity?: number;
  /** Optional size multiplier 0.5-3. */
  scale?: number;
}

// ── Content (existing, kept compatible) ─────────────────────────────────

export interface Feature {
  title: string;
  description: string;
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

// ── The full spec ───────────────────────────────────────────────────────

export interface VariantSpec {
  picks: VariantPicks;
  params: VariantParams;
  decorations: Decoration[];
  content: SiteContent;
}

// ── Render context (after validation, what _sections see) ───────────────

export interface ResolvedPalette {
  ink: string;
  paper: string;
  accent: string;
  accentSoft: string; // accent at 10% alpha for backgrounds
  muted: string;
  line: string;
  inkOnAccent: string; // best foreground over accent
}

export interface ResolvedFonts {
  display: string; // CSS font-family stack
  body: string;
  googleFontsUrl: string;
}

export interface RenderContext {
  /** Business basics. */
  name: string;
  slug: string;
  paragraph: string;
  /** Resolved (validated + defaulted) tokens. */
  palette: ResolvedPalette;
  fonts: ResolvedFonts;
  picks: VariantPicks;
  params: VariantParams;
  decorations: Decoration[];
  content: SiteContent;
  /** Optional generated assets keyed by purpose. */
  assets?: {
    heroImageUrl?: string;
    wordmarkSvgUrl?: string;
  };
  /** Real products from the operator's shop admin. E-commerce templates
   *  prefer these over synthesized content.pricing/features tiles. */
  products?: ReadonlyArray<{
    id: string;
    name: string;
    slug: string;
    description: string;
    priceCents: number;
    currency: string;
    imageName: string;
    inventory: number;
    status: "draft" | "active" | "archived";
    /** Optional category slug — links product to a category landing page. */
    categorySlug?: string;
  }>;
  /** Real categories from the operator's shop admin. Used to emit
   *  /category/<slug> landing pages. */
  categories?: ReadonlyArray<{
    id: string;
    name: string;
    slug: string;
    description: string;
  }>;
  /** Which route this render is for — sections render slightly different per route. */
  currentRoute: "/" | "/about" | "/features" | "/pricing" | "/contact";
}
