# AllOnce Pitch Deck — Outline

**Version:** 1.0 (2026-05-06)
**Goal:** Investor-ready financial-narrative pitch deck. Brutalist-aesthetic. Matches AllOnce landing brand. Screen-ready + PDF-exportable.

**Audience:** Series A investors. Secondary use: strategic-customer pitches.

**Brand voice:** Confident, fact-dense, anti-jargon. "Quietly inevitable." No filler superlatives, no AI cliché vocabulary, no purple gradients.

**Visual system (matches `(landing)`):**
- Background: `#F7F5EC` (warm off-white)
- Foreground: `#111111` (near-black)
- Muted: `#5D5D55`
- Accent: `#0000FF` (electric blue, matches landing CTA)
- Accent-soft: `#F2C94C` (yellow, for callouts)
- Type: Archivo Black (display), Inter (body), IBM Plex Mono (labels/numbers)
- Radius: 2px max, mostly flat panels
- Grid: 12-col brutalist, generous whitespace

**Navigation:**
- Arrow keys: prev/next slide
- Space: next slide
- Esc: index view (slide grid)
- Print CSS: each slide forces page break for clean PDF export
- URL hash: `#01`, `#02` etc. for deep-linking

---

## Slide-by-slide

### 01 — Title
- Mark + wordmark: AllOnce
- Headline: **Your business, all at once.**
- Sub: How a 20-person team is building the operator OS for a billion businesses — at 8.6× the capital efficiency of the closest comp.
- Footer: Series A · Q4 2026 · Allone Labs

### 02 — The market
- Big number: **400M businesses today + 1B more in the next decade**
- Three stats stacked:
  - $2.5T spent on disconnected ops tools per year (global)
  - 36 SaaS tools at the average SMB
  - 5+ hrs/week reconciling data across them (per operator)
- TAM line: **$200B+ ops-automation TAM**

### 03 — The problem
- Headline: **The 14-tab commute.**
- Visual: stylized browser tabs row (HubSpot, Stripe, Gmail, QuickBooks, Notion, Linear, Webflow, Slack…)
- Supporting copy: SMBs spend $150K+/yr on tools that don't talk. Operators glue them together with manual ops time. Every new tool adds friction, not leverage.

### 04 — The solution
- Headline: **One prompt. One window. Whole business.**
- 3 bullets:
  - Describe the business once
  - AllOnce builds + connects (36 tools, 65 bridges by default)
  - Operate from one window — every customer, dollar, decision
- Visual: simplified product screenshot or sketch of the unified workspace

### 05 — Why now
- Three converging tailwinds:
  - **AI cost dropped 100×** (2023 → 2026) — tasks that cost $5 now cost 5¢
  - **Deterministic codegen viable** — no longer "AI maybe makes something" but "exact same brief → exact same output"
  - **Market validated** — Cofounder ($10.7M raised, USV-backed) proved buyers want this
- Closing line: **Window is 18-24 months before incumbents (Notion, HubSpot, Salesforce) catch up.**

### 06 — Capital efficiency (the financial centerpiece)
- Headline: **8.6× capital efficiency.**
- Comparison table:
  | | Cofounder (NY) | AllOnce (Tbilisi) | Ratio |
  |---|---|---|---|
  | Raised | $10.7M | $1.24M | 1/8.6 |
  | Engineers | 5 | 20 | 4× |
  | Architectural decisions | unknown | 146 ADRs | — |
  | Tests passing | unknown | 10,151 | — |
  | Production code | unknown | 567+ commits | — |
- Insight: **Tbilisi cost basis vs. NYC = uncatchable structural advantage.**

### 07 — Engineering velocity
- Headline: **4× shipping rate at parity burn.**
- Math: 20 engineers × Tbilisi loaded cost ≈ 5 engineers × NYC loaded cost
- Implication: at the same monthly burn, AllOnce ships 4× the customer-asked features
- Compounding curve: by customer 50, AllOnce has shipped what competitors will ship at customer 200
- Visual: feature-velocity curve (AllOnce vs. typical SF-funded comp)

### 08 — Token economics
- Headline: **3-5× lower AI cost per spawn.**
- The architecture choice:
  - **AllOnce:** deterministic spawn pipeline for boilerplate (typed contributions composed by surface-merger), Claude only for cells that need creativity
  - **Comp pattern:** stochastic-LLM-everywhere — every agent action is a model call
- Per-spawn cost estimate: AllOnce ~$8-15, comp ~$40-80
- Margin protection at scale: 1,000 spawns/mo = $30-60K monthly savings

### 09 — Customer unit economics
- Headline: **Customer breaks even in week 2.**
- What AllOnce saves a customer:
  - 5-10 hrs/week ops time = $20-40K/year (at $40-50/hr loaded SMB rate)
  - Tool consolidation: $2-5K/mo savings (replaces 5-10 SaaS subscriptions)
  - Faster decisions: revenue lift (testimonial-anchored once customer 1-3 land)
- ROI math: $5K/mo subscription → $25K+/yr value → 5× ROI minimum

### 10 — Pricing strategy
- Headline: **Outcome-priced. Not seat-priced.**
- The wedge: SaaS norm = $20-50/mo per seat; AllOnce = $2-5K/mo per business
- Justified by:
  - Measurable hours saved (operator time)
  - Measurable revenue impact (auto-recovery, auto-outreach, auto-content)
  - Replaces, doesn't supplement, the existing tool stack
- Defensibility: Cofounder at $20-50/mo can't match outcome-priced — different category

### 11 — TAM / SAM / SOM
- Three concentric figures with numbers:
  - **TAM:** $200B (global ops-automation spend)
  - **SAM:** $25B (SMBs paying $1K+/mo for ops tooling)
  - **SOM (5yr):** $500M (1% capture = 100K customers × $5K/mo)
- Vertical breakdown sidebar: SaaS, e-commerce, restaurant, services, content, agency

### 12 — Traction
- Current state (May 2026):
  - 20-person team running on AllOnce in production
  - Architecture: 146 ADRs, 10,151 tests passing
  - Spawn pipeline: deterministic, bench-validated
  - Customer 1-3: warm-network pipeline
- 12-month plan:
  - Q3 2026: 10 paying customers
  - Q4 2026: 30 paying customers, $1M ARR run-rate
  - Q2 2027: 100 customers, $5M ARR

### 13 — Use of funds
- The ask: **$5M Series A**
- Allocation:
  - 40% engineering (10 more hires, all Tbilisi-based)
  - 30% sales/GTM (5 distributed AEs + DevRel)
  - 20% AI infra (compute scaling)
  - 10% runway buffer
- Outcome target: $20M ARR by month 24

### 14 — Team
- Photos + roles for ~4-6 key team members
- "20 engineers in Tbilisi" badge
- Founder bio (sales-strong + technical-deep + dropout-builder profile)
- **Allone Labs runs on AllOnce in production** — own dogfood case

### 15 — The 4 structural moats
- Numbered, brutalist callouts:
  1. **Capital efficiency** — 8.6× (uncatchable from NYC)
  2. **Architectural depth** — 146 ADRs, deterministic spawn, bench-validated
  3. **Per-vertical intelligence** — 14 knobs × 6 verticals, growing with every customer
  4. **Real ownership** — customer code lives in customer's repo from day 1, no platform lock-in

### 16 — Why this team wins
- Three intersecting bets:
  - **Founder:** sales-strong + technical-deep + has shipped before (Velvet, Decheque)
  - **Market:** validated by Cofounder; we're the depth-play in a brand-led category
  - **Timing:** AI cost curve hit the inflection in 2025; window is 18-24 months
- Pre-validated category + 4× engineering velocity + sales = **rare combination**

### 17 — The ask
- $5M Series A
- Target close: **Q4 2026**
- Looking for: founder-friendly lead with SMB-ops thesis
- What investors get:
  - Architectural moat (3-year lead compressed into 12 months)
  - Capital-efficient burn (Tbilisi base)
  - Sales-strong founder (CEO does sales, not the CTO)
  - Real customers within 90 days

### 18 — Vision / closing
- Big text: **1 billion businesses, one window each.**
- Sub: AllOnce — for the operators who refuse to pretend the 14-tab commute is acceptable.
- Footer: hello@allonelabs.com · Allone Labs · 2026

---

## Execution ticks

- [x] **Tick 1:** Outline + scaffold + slide engine + slides 01-03
- [ ] **Tick 2:** Slides 04-08 (solution → token economics)
- [ ] **Tick 3:** Slides 09-12 (unit econ → traction)
- [ ] **Tick 4:** Slides 13-18 (funds → vision)
- [ ] **Tick 5:** Polish — transitions, print CSS, mobile, PDF export script

Each tick = single commit, pushable to staging at `bf.allonelabs.com/pitch`.
