// AllOnce pitch deck — all 20 slides + chart helpers.
// Deep-analysis pitch: financial-narrative-led, data-dense.
// Brutalist visual language matches the landing brand.

import type { CSSProperties } from 'react';

export const TOTAL_SLIDES = 20;

// ─────────────────────── 01 — Title ───────────────────────

export function Slide01() {
  return (
    <section className="slide slide-title">
      <div className="slide-grid">
        <div className="slide-mark">
          <img
            src="/images/allonce-mark.svg"
            alt="AllOnce mark"
            width="32"
            height="32"
            className="slide-mark-square"
          />
          <span className="slide-mark-text">AllOnce</span>
        </div>
        <div className="slide-title-body">
          <h1 className="slide-title-headline">
            Your business,<br />all at once.
          </h1>
          <p className="slide-title-sub">
            How <span className="slide-em">5 of us</span> inside Allone Labs are going to ship
            the operator OS for a billion businesses — on under
            <span className="slide-em">$200K</span>, against a $10.7M comp.
          </p>
        </div>
        <div className="slide-title-footer">
          <span className="slide-mono">Internal · Team Briefing</span>
          <span className="slide-mono">2026</span>
          <span className="slide-mono">Allone Labs · AllOnce team</span>
          <span className="slide-mono">For us, not investors</span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 02 — Market ───────────────────────

export function Slide02() {
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="02" label="The market" />
        <h2 className="slide-headline-md">
          400&nbsp;million businesses today.<br />
          1&nbsp;billion more in the next decade.
        </h2>
        <div className="slide-stats">
          <Stat n="$2.5T" label="global SMB spend on disconnected ops tools per year" />
          <Stat n="36" label="average SaaS tools per SMB (and growing)" />
          <Stat n="5+ hrs" label="weekly operator time reconciling data across them" />
        </div>
        <div className="slide-conclusion">
          <span className="slide-mono">TAM →</span>
          <span className="slide-tam">$200B+</span>
          <span className="slide-mono">ops-automation surface</span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 03 — Problem ───────────────────────

export function Slide03() {
  const tabs = [
    'HubSpot', 'Stripe', 'Gmail', 'QuickBooks', 'Notion',
    'Linear', 'Webflow', 'Slack', 'Calendly', 'Airtable',
    'Mixpanel', 'Mailchimp', 'Zapier', 'Discord',
  ];
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="03" label="The problem" />
        <h2 className="slide-headline-lg">The 14-tab commute.</h2>
        <div className="slide-tabs">
          {tabs.map((t) => <span key={t} className="slide-tab">{t}</span>)}
        </div>
        <div className="slide-problem-body">
          <p className="slide-body">
            SMBs spend <strong>$150K+/year</strong> on tools that don&apos;t talk.
            Operators glue them together with manual ops time. Every new tool
            adds friction — not leverage.
          </p>
          <p className="slide-body slide-body-muted">
            The operator&apos;s job has become tab management. We don&apos;t accept that.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 04 — Solution ───────────────────────

export function Slide04() {
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="04" label="The solution" />
        <h2 className="slide-headline-md">
          One prompt. One window.<br />Whole business.
        </h2>
        <div className="slide-three-col">
          <div className="slide-col">
            <div className="slide-col-num">1</div>
            <div className="slide-col-title">Describe</div>
            <p className="slide-col-body">
              One paragraph. ICP, model, differentiation, stage. AllOnce parses it
              and writes the business brief.
            </p>
          </div>
          <div className="slide-col">
            <div className="slide-col-num">2</div>
            <div className="slide-col-title">Spawn</div>
            <p className="slide-col-body">
              <strong>27 tools</strong> compose typed contributions. Site, ecom, CRM,
              email, social, payments, booking, ops — all assembled at once.
            </p>
          </div>
          <div className="slide-col">
            <div className="slide-col-num">3</div>
            <div className="slide-col-title">Operate</div>
            <p className="slide-col-body">
              One window. Real-time activity feed. Auto-decisions. Daily digest.
              <strong> 65 integrations wired by default.</strong>
            </p>
          </div>
        </div>
        <div className="slide-deliverable-grid">
          <span className="slide-deliverable">Branded site</span>
          <span className="slide-deliverable">Storefront</span>
          <span className="slide-deliverable">Checkout</span>
          <span className="slide-deliverable">CRM</span>
          <span className="slide-deliverable">Email pipeline</span>
          <span className="slide-deliverable">Social publishing</span>
          <span className="slide-deliverable">Payments</span>
          <span className="slide-deliverable">Booking</span>
          <span className="slide-deliverable">Operator dashboard</span>
          <span className="slide-deliverable">Daily digest</span>
          <span className="slide-deliverable">Self-audit</span>
          <span className="slide-deliverable">Trend pipeline</span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 05 — Why now ───────────────────────

export function Slide05() {
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="05" label="Why now" />
        <h2 className="slide-headline-md">
          Three converging tailwinds.<br />
          <span className="slide-headline-sub">18-24 month window before incumbents catch up.</span>
        </h2>
        <div className="slide-three-col">
          <div className="slide-col">
            <div className="slide-col-num">i</div>
            <div className="slide-col-title">AI cost ↓ 100×</div>
            <div className="slide-cost-decline">
              <div className="slide-cost-row">
                <span className="slide-mono">2023 GPT-4</span>
                <span className="slide-cost-bar slide-cost-bar-old" style={{ width: '100%' }} />
                <span className="slide-cost-val">$30 / M tok</span>
              </div>
              <div className="slide-cost-row">
                <span className="slide-mono">2026 Haiku</span>
                <span className="slide-cost-bar slide-cost-bar-new" style={{ width: '0.8%' }} />
                <span className="slide-cost-val">$0.25 / M tok</span>
              </div>
            </div>
            <p className="slide-col-body slide-col-body-sm">
              Tasks that cost $5 in 2023 cost 5¢ in 2026. The unit economics of
              autonomous ops tools changed permanently.
            </p>
          </div>
          <div className="slide-col">
            <div className="slide-col-num">ii</div>
            <div className="slide-col-title">Deterministic codegen</div>
            <p className="slide-col-body">
              Typed-contribution architectures (the surface-merger pattern) hit
              production-grade in 2025-2026. <strong>Same brief → same output</strong> —
              the missing primitive that made AI codegen unreliable for real apps.
            </p>
            <p className="slide-col-body slide-col-body-sm slide-col-body-muted">
              Without determinism, every generated app is a one-off. With it,
              regeneration is safe and re-spawn becomes a feature.
            </p>
          </div>
          <div className="slide-col">
            <div className="slide-col-num">iii</div>
            <div className="slide-col-title">Market validated</div>
            <ul className="slide-col-list">
              <li><strong>Cofounder (GIC):</strong> $10.7M raised, USV-led</li>
              <li><strong>59,000 tasks</strong> automated to date (public claim)</li>
              <li><strong>18B tokens</strong> processed monthly</li>
              <li>Buyer category exists; depth play is open</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 06 — Capital efficiency (centerpiece) ───────────────────────

export function Slide06() {
  return (
    <section className="slide slide-financial">
      <div className="slide-grid">
        <SlideKicker num="06" label="Capital efficiency" />
        <div className="slide-big-stat">
          <div className="slide-big-stat-n">54×</div>
          <div className="slide-big-stat-label">our capital efficiency target vs Cofounder</div>
        </div>
        <table className="slide-table">
          <thead>
            <tr>
              <th></th>
              <th>Cofounder (NYC)</th>
              <th>AllOnce (us)</th>
              <th>Ratio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Capital backing the product</td>
              <td>$10.7M raised</td>
              <td><strong>&lt;$200K (Allone Labs internal)</strong></td>
              <td className="slide-ratio">1 / 54</td>
            </tr>
            <tr>
              <td>Engineers on the product</td>
              <td>5 (NYC team)</td>
              <td><strong>5 (us)</strong></td>
              <td className="slide-ratio">parity</td>
            </tr>
            <tr>
              <td>Loaded $/eng/month</td>
              <td>~$22K</td>
              <td><strong>~$5K</strong></td>
              <td className="slide-ratio">1 / 4.4</td>
            </tr>
            <tr>
              <td>AllOnce burn rate</td>
              <td>~$110K/mo</td>
              <td><strong>~$25K/mo</strong></td>
              <td className="slide-ratio">1 / 4.4</td>
            </tr>
            <tr>
              <td>Runway from current capital</td>
              <td>~96 months</td>
              <td><strong>~8 months internal · re-allocate as we ship</strong></td>
              <td className="slide-ratio">we move first</td>
            </tr>
            <tr>
              <td>Investor pressure</td>
              <td>USV board · growth-or-die</td>
              <td><strong>None — Allone Labs cover</strong></td>
              <td className="slide-ratio">we choose</td>
            </tr>
            <tr>
              <td>Architectural foundation (already built)</td>
              <td>unknown</td>
              <td><strong>146 ADRs · 10,151 tests · 567+ commits</strong></td>
              <td className="slide-ratio">we&apos;re ahead</td>
            </tr>
          </tbody>
        </table>
        <div className="slide-callout">
          <span className="slide-mono">What this means for us →</span>
          <span className="slide-callout-text">
            We don&apos;t need to win on capital. We need to win on <strong>shipping</strong>,
            <strong> taste</strong>, and <strong>customer time</strong>. Five of us, lean burn,
            no investor noise — that&apos;s our edge.
          </span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 07 — Engineering velocity ───────────────────────

export function Slide07() {
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="07" label="Engineering velocity" />
        <h2 className="slide-headline-md">
          Same headcount, 4× longer runway,<br />
          deeper architecture out of the gate.
        </h2>
        <div className="slide-velocity-chart">
          <VelocityChart />
        </div>
        <div className="slide-velocity-conclusion">
          <p className="slide-body">
            We have <strong>146 ADRs and 10K tests already shipped</strong>. They&apos;re still
            architecting. Same five engineers, same shipping rate — but our codebase is
            12+ months ahead of their starting line. <strong>That&apos;s the head start we
            don&apos;t lose.</strong>
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 08 — Token economics ───────────────────────

export function Slide08() {
  return (
    <section className="slide slide-financial">
      <div className="slide-grid">
        <SlideKicker num="08" label="Token economics" />
        <h2 className="slide-headline-md">
          3-5× lower AI cost per spawn.<br />
          <span className="slide-headline-sub">Margin protection at scale.</span>
        </h2>
        <table className="slide-table slide-table-cost">
          <thead>
            <tr>
              <th>Cost element</th>
              <th>Stochastic-LLM-everywhere</th>
              <th>AllOnce hybrid</th>
              <th>Ratio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Site generation (per spawn)</td>
              <td>$25-40</td>
              <td><strong>$3-5</strong></td>
              <td className="slide-ratio">8×</td>
            </tr>
            <tr>
              <td>Email pipeline (per spawn)</td>
              <td>$8-15</td>
              <td><strong>$0.50-1</strong></td>
              <td className="slide-ratio">15×</td>
            </tr>
            <tr>
              <td>Brand system (per spawn)</td>
              <td>$5-10</td>
              <td><strong>$1-2</strong></td>
              <td className="slide-ratio">5×</td>
            </tr>
            <tr>
              <td>Autonomy ops (per customer / month)</td>
              <td>$30-60</td>
              <td><strong>$5-10</strong></td>
              <td className="slide-ratio">6×</td>
            </tr>
            <tr className="slide-table-totals">
              <td>Total per spawn (one-time)</td>
              <td>$40-80</td>
              <td><strong>$8-15</strong></td>
              <td className="slide-ratio">5×</td>
            </tr>
            <tr className="slide-table-totals">
              <td>Total monthly per customer</td>
              <td>$30-60</td>
              <td><strong>$5-10</strong></td>
              <td className="slide-ratio">6×</td>
            </tr>
          </tbody>
        </table>
        <div className="slide-callout">
          <span className="slide-mono">At 1,000 customers →</span>
          <span className="slide-callout-text">
            Cofounder pattern = $30-60K/mo AI cost. AllOnce hybrid = $5-10K/mo.
            <strong> Margin protection: 5-6× at scale.</strong>
          </span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 09 — Customer unit economics ───────────────────────

export function Slide09() {
  return (
    <section className="slide slide-financial">
      <div className="slide-grid">
        <SlideKicker num="09" label="Customer unit economics" />
        <h2 className="slide-headline-md">
          Customer breaks even in week 2.
        </h2>
        <div className="slide-roi-grid">
          <div className="slide-roi-row">
            <span className="slide-roi-label">Operator time saved</span>
            <span className="slide-roi-bar"><span className="slide-roi-bar-fill" style={{ width: '20%' }} /></span>
            <span className="slide-roi-val">$13K-26K / yr</span>
          </div>
          <div className="slide-roi-row">
            <span className="slide-roi-label">Tool consolidation</span>
            <span className="slide-roi-bar"><span className="slide-roi-bar-fill" style={{ width: '40%' }} /></span>
            <span className="slide-roi-val">$12K-60K / yr</span>
          </div>
          <div className="slide-roi-row">
            <span className="slide-roi-label">Revenue lift (auto-recovery, outreach, content)</span>
            <span className="slide-roi-bar"><span className="slide-roi-bar-fill" style={{ width: '85%' }} /></span>
            <span className="slide-roi-val">$15K-400K / yr</span>
          </div>
          <div className="slide-roi-row slide-roi-row-total">
            <span className="slide-roi-label">Total customer value</span>
            <span className="slide-roi-bar"><span className="slide-roi-bar-fill slide-roi-bar-fill-accent" style={{ width: '100%' }} /></span>
            <span className="slide-roi-val">$40K-486K / yr</span>
          </div>
        </div>
        <div className="slide-roi-math">
          <div className="slide-roi-math-row">
            <span className="slide-mono">AllOnce price (Growth tier)</span>
            <span className="slide-roi-math-val">$5K / mo · $60K / yr</span>
          </div>
          <div className="slide-roi-math-row slide-roi-math-row-emph">
            <span className="slide-mono">Customer ROI</span>
            <span className="slide-roi-math-val slide-em">0.7× → 8× (median ~3×)</span>
          </div>
          <div className="slide-roi-math-row">
            <span className="slide-mono">Payback period</span>
            <span className="slide-roi-math-val">week 2 (average customer)</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 10 — Pricing ───────────────────────

export function Slide10() {
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="10" label="Pricing strategy" />
        <h2 className="slide-headline-md">
          Outcome-priced. Not seat-priced.
        </h2>
        <div className="slide-pricing-grid">
          <div className="slide-pricing-tier">
            <div className="slide-pricing-tier-label">Starter</div>
            <div className="slide-pricing-tier-price">$2K<span className="slide-pricing-tier-mo">/mo</span></div>
            <ul className="slide-pricing-tier-list">
              <li>1 spawn</li>
              <li>Basic autonomy</li>
              <li>5K monthly events</li>
              <li>Email + social</li>
              <li>Self-serve onboarding</li>
            </ul>
          </div>
          <div className="slide-pricing-tier slide-pricing-tier-feat">
            <div className="slide-pricing-tier-label">Growth</div>
            <div className="slide-pricing-tier-price">$5K<span className="slide-pricing-tier-mo">/mo</span></div>
            <ul className="slide-pricing-tier-list">
              <li>1 spawn</li>
              <li>Full autonomy stack</li>
              <li>50K monthly events</li>
              <li>Priority support</li>
              <li>Per-vertical optimization</li>
              <li>White-glove onboarding</li>
            </ul>
            <div className="slide-pricing-tier-tag">Target tier</div>
          </div>
          <div className="slide-pricing-tier">
            <div className="slide-pricing-tier-label">Scale</div>
            <div className="slide-pricing-tier-price">Custom</div>
            <ul className="slide-pricing-tier-list">
              <li>Multi-spawn</li>
              <li>Dedicated infra</li>
              <li>Vertical specialist</li>
              <li>SLA</li>
              <li>Custom integrations</li>
            </ul>
          </div>
        </div>
        <div className="slide-pricing-anchor">
          <span className="slide-mono">For context →</span>
          <span className="slide-body">
            SaaS norm: $20-50/seat. <strong>AllOnce is in Salesforce territory ($2.5K/mo)</strong> — but
            replaces 10+ tools and ships measurable revenue lift. Cofounder at $20-50/mo can&apos;t
            match outcome-priced delivery: different ICP, different category.
          </span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 11 — TAM/SAM/SOM ───────────────────────

export function Slide11() {
  return (
    <section className="slide slide-financial">
      <div className="slide-grid">
        <SlideKicker num="11" label="TAM / SAM / SOM" />
        <h2 className="slide-headline-md">
          5-year path to $500M ARR.
        </h2>
        <div className="slide-tam-grid">
          <div className="slide-tam-bar slide-tam-tam">
            <div className="slide-tam-bar-label">TAM</div>
            <div className="slide-tam-bar-fill" style={{ width: '100%' }}>
              <span className="slide-tam-bar-n">$200B+</span>
            </div>
            <div className="slide-tam-bar-note">Global ops automation across 400M businesses</div>
          </div>
          <div className="slide-tam-bar slide-tam-sam">
            <div className="slide-tam-bar-label">SAM</div>
            <div className="slide-tam-bar-fill" style={{ width: '12.5%' }}>
              <span className="slide-tam-bar-n">$25B</span>
            </div>
            <div className="slide-tam-bar-note">SMBs 5-500 employees, $1K+/mo budget</div>
          </div>
          <div className="slide-tam-bar slide-tam-som">
            <div className="slide-tam-bar-label">SOM (5y)</div>
            <div className="slide-tam-bar-fill" style={{ width: '0.25%' }}>
              <span className="slide-tam-bar-n">$500M</span>
            </div>
            <div className="slide-tam-bar-note">1% of SAM = 10K customers × $5K/mo</div>
          </div>
        </div>
        <div className="slide-vertical-breakdown">
          <div className="slide-vertical-title">SAM by vertical</div>
          <div className="slide-vertical-row"><span>SaaS</span><span className="slide-mono">$8B</span></div>
          <div className="slide-vertical-row"><span>E-commerce</span><span className="slide-mono">$6B</span></div>
          <div className="slide-vertical-row"><span>Services / agencies</span><span className="slide-mono">$5B</span></div>
          <div className="slide-vertical-row"><span>Restaurant / hospitality</span><span className="slide-mono">$3B</span></div>
          <div className="slide-vertical-row"><span>Creator / content</span><span className="slide-mono">$3B</span></div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 12 — Competitive landscape ───────────────────────

export function Slide12() {
  const rows = [
    { player: 'Cofounder (GIC)', stage: 'Public V2', funding: '$10.7M', strength: 'Brand, USV-backed', weakness: 'Markdown-files arch, lock-in', ours: 'Real ownership, depth, capital efficiency' },
    { player: 'Lovable', stage: 'Public', funding: '~$15M', strength: 'Fast UI generation', weakness: 'UI-only, no autonomy', ours: 'Cross-functional ops' },
    { player: 'Replit Agent', stage: 'Public', funding: '$200M+ co', strength: 'IDE integration', weakness: 'Dev-tool focus', ours: 'Operator focus' },
    { player: 'Devin', stage: 'Public', funding: '$21M', strength: 'Autonomous engineering', weakness: 'Code-only', ours: 'End-to-end business' },
    { player: 'Cursor', stage: 'Public', funding: '$100M+', strength: 'Best dev IDE', weakness: 'Pair programmer', ours: 'Different category' },
    { player: 'Vercel v0', stage: 'Public', funding: '$50M+ co', strength: 'Component generation', weakness: 'Component-only', ours: 'Whole-business spawn' },
  ];
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="12" label="Competitive landscape" />
        <h2 className="slide-headline-md">
          The depth play.
          <span className="slide-headline-sub"> No one combines code + ops + ownership + vertical intelligence.</span>
        </h2>
        <table className="slide-table slide-table-comp">
          <thead>
            <tr>
              <th>Player</th>
              <th>Stage / funding</th>
              <th>Strength</th>
              <th>Weakness</th>
              <th>Where AllOnce wins</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player}>
                <td className="slide-comp-player">{r.player}</td>
                <td className="slide-mono">{r.stage} · {r.funding}</td>
                <td>{r.strength}</td>
                <td className="slide-comp-weakness">{r.weakness}</td>
                <td className="slide-comp-win"><strong>{r.ours}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="slide-callout">
          <span className="slide-mono">Net →</span>
          <span className="slide-callout-text">
            Single-function tools dominate. <strong>AllOnce is the only end-to-end operator OS</strong>
            that combines code generation, business operations, real ownership, and per-vertical intelligence.
          </span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 13 — Traction ───────────────────────

export function Slide13() {
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="13" label="Traction" />
        <h2 className="slide-headline-md">
          Architecture done. Customers next.
        </h2>
        <div className="slide-traction-now">
          <div className="slide-traction-now-label">Where we are today (Q2 2026)</div>
          <div className="slide-traction-now-grid">
            <Stat n="5" label="of us on this product" />
            <Stat n="567+" label="commits already shipped" />
            <Stat n="146" label="locked ADRs · architectural foundation" />
            <Stat n="10,151" label="tests passing · regression-safe" />
          </div>
        </div>
        <div className="slide-timeline">
          <div className="slide-timeline-row">
            <span className="slide-timeline-q">Q2 26</span>
            <span className="slide-timeline-bar" style={{ width: '6%' }} />
            <span className="slide-timeline-event">Allone Labs runs on AllOnce in production · we use what we ship</span>
            <span className="slide-timeline-arr">customer 0 · us</span>
          </div>
          <div className="slide-timeline-row">
            <span className="slide-timeline-q">Q3 26</span>
            <span className="slide-timeline-bar" style={{ width: '12%' }} />
            <span className="slide-timeline-event">3 paying customers from warm network · pricing validated</span>
            <span className="slide-timeline-arr">$120K ARR</span>
          </div>
          <div className="slide-timeline-row">
            <span className="slide-timeline-q">Q4 26</span>
            <span className="slide-timeline-bar" style={{ width: '24%' }} />
            <span className="slide-timeline-event">10 customers · public launch · Cofounder pressure</span>
            <span className="slide-timeline-arr">$400K ARR</span>
          </div>
          <div className="slide-timeline-row">
            <span className="slide-timeline-q">Q1 27</span>
            <span className="slide-timeline-bar" style={{ width: '40%' }} />
            <span className="slide-timeline-event">25 customers · vertical playbooks v1 locked · Allone Labs decides scale path</span>
            <span className="slide-timeline-arr">$1M ARR run-rate</span>
          </div>
          <div className="slide-timeline-row">
            <span className="slide-timeline-q">Q2 27</span>
            <span className="slide-timeline-bar" style={{ width: '60%' }} />
            <span className="slide-timeline-event">50 customers · profitable on lean burn · hiring optional</span>
            <span className="slide-timeline-arr">$2.5M ARR</span>
          </div>
          <div className="slide-timeline-row">
            <span className="slide-timeline-q">Q4 27</span>
            <span className="slide-timeline-bar" style={{ width: '90%' }} />
            <span className="slide-timeline-event">100 customers · Allone Labs decides Series A or stay private</span>
            <span className="slide-timeline-arr slide-em">$6M ARR</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 14 — Our budget ───────────────────────

export function Slide14() {
  return (
    <section className="slide slide-financial">
      <div className="slide-grid">
        <SlideKicker num="14" label="Our budget" />
        <h2 className="slide-headline-md">
          Under $200K · 8 months · Allone Labs internal funding.
        </h2>
        <div className="slide-funds-bar">
          <div className="slide-funds-segment slide-funds-eng" style={{ width: '60%' }}>
            <span className="slide-funds-pct">60%</span>
            <span className="slide-funds-amt">$120K</span>
            <span className="slide-funds-cat">5 of us · 8 months</span>
          </div>
          <div className="slide-funds-segment slide-funds-ai" style={{ width: '20%' }}>
            <span className="slide-funds-pct">20%</span>
            <span className="slide-funds-amt">$40K</span>
            <span className="slide-funds-cat">AI compute</span>
          </div>
          <div className="slide-funds-segment slide-funds-gtm" style={{ width: '12%' }}>
            <span className="slide-funds-pct">12%</span>
            <span className="slide-funds-amt">$24K</span>
            <span className="slide-funds-cat">Infra · domains</span>
          </div>
          <div className="slide-funds-segment slide-funds-buf" style={{ width: '8%' }}>
            <span className="slide-funds-pct">8%</span>
            <span className="slide-funds-amt">$16K</span>
            <span className="slide-funds-cat">Buffer</span>
          </div>
        </div>
        <div className="slide-funds-detail">
          <div className="slide-funds-row">
            <span className="slide-funds-row-cat">5 of us</span>
            <span className="slide-funds-row-detail">$3K/mo blended × 5 × 8 mo ≈ $120K · Tbilisi cost basis · core team intact through customer 10</span>
          </div>
          <div className="slide-funds-row">
            <span className="slide-funds-row-cat">AI compute</span>
            <span className="slide-funds-row-detail">Claude API · per-spawn deterministic budget · ~$5K/mo with our hybrid model (vs ~$30K/mo if we went LLM-everywhere)</span>
          </div>
          <div className="slide-funds-row">
            <span className="slide-funds-row-cat">Infra · domains</span>
            <span className="slide-funds-row-detail">Vercel · Supabase · Resend · domain pool for first 30 spawns · ~$3K/mo</span>
          </div>
          <div className="slide-funds-row">
            <span className="slide-funds-row-cat">Buffer</span>
            <span className="slide-funds-row-detail">Surprises · contractor for legal · paid acquisition tests · whatever we don&apos;t see coming</span>
          </div>
          <div className="slide-funds-row">
            <span className="slide-funds-row-cat slide-em">Funding source</span>
            <span className="slide-funds-row-detail"><strong>Allone Labs internal · no equity dilution · no investor pressure · we own our pace</strong></span>
          </div>
          <div className="slide-funds-row">
            <span className="slide-funds-row-cat slide-em">Re-allocation trigger</span>
            <span className="slide-funds-row-detail">Hit 10 paying customers by Q4 26 → Allone Labs adds another tranche. Performance-based, not pre-committed.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 15 — Team ───────────────────────

export function Slide15() {
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="15" label="The 5 of us" />
        <h2 className="slide-headline-md">
          Five roles. Clear ownership.<br />
          <span className="slide-headline-sub">Inside Allone Labs · funded · accountable to each other.</span>
        </h2>
        <div className="slide-team-grid slide-team-grid-five">
          <div className="slide-team-card slide-team-card-founder">
            <div className="slide-team-role">01 · Lead / Architect</div>
            <div className="slide-team-name">Owns vision · sales · product</div>
            <p className="slide-team-bio">
              Closes the first 10 customers. Owns the brief → spawn architecture.
              Decision-of-last-resort on roadmap.
            </p>
          </div>
          <div className="slide-team-card">
            <div className="slide-team-role">02 · Backend / Autonomy</div>
            <div className="slide-team-name">Owns spawn pipeline · bridge runtime</div>
            <p className="slide-team-bio">
              Surface-merger, per-vertical defaults, autonomy rules.
              The architectural moat lives here.
            </p>
          </div>
          <div className="slide-team-card">
            <div className="slide-team-role">03 · Frontend / Operator UI</div>
            <div className="slide-team-name">Owns the one-window experience</div>
            <p className="slide-team-bio">
              Operator dashboard, designer surfaces, brand-forge UI.
              The product the customer sees daily.
            </p>
          </div>
          <div className="slide-team-card">
            <div className="slide-team-role">04 · Integrations / Bridges</div>
            <div className="slide-team-name">Owns 65 integrations &amp; growing</div>
            <p className="slide-team-bio">
              Stripe, Resend, Bluesky, Mastodon, Supabase, R2 — all wired.
              Adds new bridges as customers ask.
            </p>
          </div>
          <div className="slide-team-card">
            <div className="slide-team-role">05 · Design / Brand</div>
            <div className="slide-team-name">Owns brand · landing · spawn aesthetics</div>
            <p className="slide-team-bio">
              Brutalist visual system. Brand kit per spawn. Landing.
              The reason customers think we look real.
            </p>
          </div>
        </div>
        <div className="slide-team-proof">
          <span className="slide-mono">Our proof point →</span>
          <span className="slide-team-proof-text">
            <strong>Allone Labs runs on AllOnce in production.</strong> 20 people, every email,
            social post, customer outreach — generated by the product we ship. We use it
            because we built it. That&apos;s our credibility, free.
          </span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 16 — Structural moats ───────────────────────

export function Slide16() {
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="16" label="The 4 structural moats" />
        <h2 className="slide-headline-md">
          Each moat compounds the others.
        </h2>
        <div className="slide-moats-grid">
          <div className="slide-moat">
            <div className="slide-moat-num">01</div>
            <div className="slide-moat-title">Capital efficiency</div>
            <div className="slide-moat-headline">8.6× — uncatchable from NYC</div>
            <p className="slide-moat-body">
              Tbilisi cost basis is structural, not strategic. NY-funded comps will burn
              4-5× our rate to ship the same surface. Moat compounds with every month.
            </p>
          </div>
          <div className="slide-moat">
            <div className="slide-moat-num">02</div>
            <div className="slide-moat-title">Architectural depth</div>
            <div className="slide-moat-headline">146 ADRs · deterministic spawn · bench-validated</div>
            <p className="slide-moat-body">
              Surface-merger composes typed contributions from 27 tools. Same brief →
              same output, every time. 87/87 bench specs validate regression on real signal.
            </p>
          </div>
          <div className="slide-moat">
            <div className="slide-moat-num">03</div>
            <div className="slide-moat-title">Per-vertical intelligence</div>
            <div className="slide-moat-headline">14 knobs × 6 verticals · grows per customer</div>
            <p className="slide-moat-body">
              Loyalty thresholds, dormancy, complaint rates, voice — tuned per vertical.
              Every customer that runs on AllOnce tightens the defaults. Generic competitors
              fall further behind.
            </p>
          </div>
          <div className="slide-moat">
            <div className="slide-moat-num">04</div>
            <div className="slide-moat-title">Real ownership</div>
            <div className="slide-moat-headline">Customer code in customer&apos;s repo · day 1</div>
            <p className="slide-moat-body">
              No platform lock-in. No &quot;graduate&quot; gate. Customer can hire engineers,
              use Cursor, leave us — and keep everything they built. Trust moat for
              technical buyers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 17 — Why this team wins ───────────────────────

export function Slide17() {
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="17" label="Why this team wins" />
        <h2 className="slide-headline-md">
          Three intersecting bets.
        </h2>
        <div className="slide-three-col">
          <div className="slide-col">
            <div className="slide-col-num">A</div>
            <div className="slide-col-title">Founder/market fit</div>
            <p className="slide-col-body">
              <strong>Sales-strong + technical-deep.</strong> CEO closes deals while CTO ships.
              The combination kills both common failure modes: tech-only founders who can&apos;t sell,
              sales-only founders who can&apos;t build.
            </p>
            <p className="slide-col-body slide-col-body-sm slide-col-body-muted">
              Prior shipping experience (Velvet, Decheque-shape exits) — pattern-matched founder.
            </p>
          </div>
          <div className="slide-col">
            <div className="slide-col-num">B</div>
            <div className="slide-col-title">Market</div>
            <p className="slide-col-body">
              <strong>Pre-validated by Cofounder.</strong> $10.7M raised + USV-led + 59K tasks
              automated proves the buyer category exists. We&apos;re the depth play in a brand-led
              category.
            </p>
            <p className="slide-col-body slide-col-body-sm slide-col-body-muted">
              No need to convince investors the market exists. Question is who wins the category.
            </p>
          </div>
          <div className="slide-col">
            <div className="slide-col-num">C</div>
            <div className="slide-col-title">Timing</div>
            <p className="slide-col-body">
              <strong>AI cost curve hit the inflection in 2025.</strong> Deterministic codegen
              became viable in 2026. Window before Notion/HubSpot/Salesforce ship competitive:
              <strong> 18-24 months.</strong>
            </p>
            <p className="slide-col-body slide-col-body-sm slide-col-body-muted">
              Move now, lock in vertical playbooks, build distribution moat before incumbents
              wake up.
            </p>
          </div>
        </div>
        <div className="slide-callout">
          <span className="slide-mono">Combined →</span>
          <span className="slide-callout-text">
            <strong>Rare combination.</strong> Most teams have one. We have all three plus 4×
            engineering velocity. The path to $50-200M ARR in 5 years runs through this combination.
          </span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 18 — Risks + mitigation ───────────────────────

export function Slide18() {
  const risks = [
    {
      r: 'Cofounder out-distributes us',
      m: '4× engineering velocity → ship features they can&apos;t match within 90 days. Customer-1 case (Allone Labs) closes the credibility gap.',
      sev: 'medium',
    },
    {
      r: 'AI cost spikes',
      m: 'Deterministic spawn pipeline keeps AI usage minimal — 5-6× margin protection vs stochastic-everywhere comps. Hedged.',
      sev: 'low',
    },
    {
      r: 'SMB market doesn&apos;t pay outcome prices',
      m: 'Allone Labs as proof point. First 3 customers from warm network validate. ROI math (3× median, week-2 payback) defends against price pushback.',
      sev: 'medium',
    },
    {
      r: 'Tbilisi team retention',
      m: 'Above-market local comp + equity participation. 20-person team is concentrated; founder retention is the actual risk and is high.',
      sev: 'low',
    },
    {
      r: 'Founder bandwidth (CEO doing sales)',
      m: 'Hire Head of Sales by month 12. Until then, sales-strong founder is an advantage, not a constraint.',
      sev: 'medium',
    },
    {
      r: 'Incumbents (Notion, HubSpot) ship competitive product',
      m: '18-24 month window. Architectural lead (146 ADRs, deterministic spawn) takes 12+ months to replicate. Distribution lock-in within window protects.',
      sev: 'high',
    },
  ];
  return (
    <section className="slide">
      <div className="slide-grid">
        <SlideKicker num="18" label="Risks + mitigation" />
        <h2 className="slide-headline-md">
          What can kill us, and how we hedge.
        </h2>
        <table className="slide-table slide-table-risks">
          <thead>
            <tr>
              <th>Risk</th>
              <th>Severity</th>
              <th>Mitigation</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((row, i) => (
              <tr key={i}>
                <td className="slide-risk-r" dangerouslySetInnerHTML={{ __html: row.r }} />
                <td><span className={`slide-risk-sev slide-risk-sev-${row.sev}`}>{row.sev}</span></td>
                <td className="slide-risk-m" dangerouslySetInnerHTML={{ __html: row.m }} />
              </tr>
            ))}
          </tbody>
        </table>
        <div className="slide-callout">
          <span className="slide-mono">Net →</span>
          <span className="slide-callout-text">
            One high-severity risk (incumbents). Hedged by architectural lead + 18-24 month
            window. <strong>All other risks low-to-medium with concrete mitigations.</strong>
          </span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 19 — Our commitments ───────────────────────

export function Slide19() {
  return (
    <section className="slide slide-financial">
      <div className="slide-grid">
        <SlideKicker num="19" label="Our commitments" />
        <div className="slide-ask-headline">
          <span className="slide-ask-amount">5</span>
          <span className="slide-ask-label">commitments to each other</span>
        </div>
        <div className="slide-ask-grid">
          <div className="slide-ask-row">
            <span className="slide-mono">Cadence</span>
            <span className="slide-ask-val">Daily ship · weekly customer review · monthly all-hands with Allone Labs</span>
          </div>
          <div className="slide-ask-row">
            <span className="slide-mono">Decision rights</span>
            <span className="slide-ask-val">Each role owns their domain. Cross-cutting decisions: 24h written async, then call.</span>
          </div>
          <div className="slide-ask-row">
            <span className="slide-mono">No-go zones</span>
            <span className="slide-ask-val">No scope creep without removing scope · no premature optimization · no committee design</span>
          </div>
          <div className="slide-ask-row">
            <span className="slide-mono">Customer time</span>
            <span className="slide-ask-val">Every team member talks to a real customer at least once a month. No exceptions.</span>
          </div>
        </div>
        <div className="slide-ask-investor-grid">
          <div className="slide-ask-investor-title">What we promise each other</div>
          <ul className="slide-ask-investor-list">
            <li><strong>We ship daily.</strong> Every commit goes through gates green. No stalled branches.</li>
            <li><strong>We use the product.</strong> Allone Labs runs on AllOnce in production. We feel the bugs first.</li>
            <li><strong>We say no fast.</strong> Bad ideas die in the next standup, not after a sprint.</li>
            <li><strong>We track the bench.</strong> Architecture regressions get caught before customer 1 hits them.</li>
            <li><strong>We honor the head start.</strong> 146 ADRs and 10K tests are an asset — we don&apos;t casually break them.</li>
            <li><strong>We win or we learn.</strong> If a customer churns, we know why within 48 hours. Reframe, don&apos;t deflect.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── 20 — Vision / closing ───────────────────────

export function Slide20() {
  return (
    <section className="slide slide-closing">
      <div className="slide-grid">
        <div className="slide-mark">
          <img
            src="/images/allonce-mark.svg"
            alt="AllOnce mark"
            width="32"
            height="32"
            className="slide-mark-square"
          />
          <span className="slide-mark-text">AllOnce</span>
        </div>
        <h2 className="slide-vision-headline">
          1&nbsp;billion businesses,<br />one window each.
        </h2>
        <p className="slide-vision-sub">
          AllOnce — for the operators who refuse to pretend the 14-tab commute is acceptable.
        </p>
        <div className="slide-closing-footer">
          <span className="slide-mono">hello@allonelabs.com</span>
          <span className="slide-mono">Allone Labs · 2026</span>
          <span className="slide-mono">Confidential</span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────── Helpers ───────────────────────

export function SlideKicker({ num, label }: { readonly num: string; readonly label: string }) {
  return (
    <div className="slide-kicker">
      <span className="slide-kicker-num">{num}</span>
      <span className="slide-kicker-divider" />
      <span className="slide-kicker-label">{label}</span>
    </div>
  );
}

export function Stat({ n, label }: { readonly n: string; readonly label: string }) {
  return (
    <div className="slide-stat">
      <div className="slide-stat-n">{n}</div>
      <div className="slide-stat-label">{label}</div>
    </div>
  );
}

// Velocity chart — cumulative features shipped over time.
// SVG renders curves + grid only. All text labels are positioned as HTML
// overlays so typography stays crisp (no aspect-ratio stretching).
function VelocityChart() {
  const months = 24;
  const allOnce = (m: number) => Math.min(100, 4 * m);
  const comp = (m: number) => Math.min(100, m);
  const points = (fn: (m: number) => number) =>
    Array.from({ length: months + 1 }, (_, m) => `${(m / months) * 100},${100 - fn(m)}`).join(' ');

  return (
    <div className="slide-velocity-frame">
      <div className="slide-velocity-y-label">cumulative features shipped</div>

      <div className="slide-velocity-plot">
        <svg
          viewBox="0 0 100 100"
          className="slide-velocity-svg"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Horizontal grid */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} className="slide-velocity-grid" />
          ))}
          {/* Vertical grid (quarters) */}
          {[0, 25, 50, 75, 100].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" className="slide-velocity-grid slide-velocity-grid-v" />
          ))}
          {/* Comp curve (dashed, muted) */}
          <polyline
            points={points(comp)}
            className="slide-velocity-curve slide-velocity-curve-comp"
          />
          {/* AllOnce curve (solid, accent) */}
          <polyline
            points={points(allOnce)}
            className="slide-velocity-curve slide-velocity-curve-allonce"
          />
        </svg>

        {/* HTML overlay labels — crisp typography, no SVG stretch */}
        <span className="slide-velocity-tag slide-velocity-tag-allonce" style={{ top: '8%', right: '6%' }}>
          AllOnce — 4× shipping rate
        </span>
        <span className="slide-velocity-tag slide-velocity-tag-comp" style={{ bottom: '10%', right: '6%' }}>
          SF-funded comp — 1×
        </span>
      </div>

      {/* X-axis ticks */}
      <div className="slide-velocity-x-axis">
        <span>month 0</span>
        <span>month 6</span>
        <span>month 12</span>
        <span>month 18</span>
        <span>month 24</span>
      </div>
    </div>
  );
}

// ─────────────────────── Style block ───────────────────────

export const SLIDE_STYLES: CSSProperties = {};

export function DeckStyles() {
  return (
    <style jsx global>{`
      :root {
        --bg: #F7F5EC;
        --fg: #111111;
        --muted: #5D5D55;
        --line: #1111111A;
        --line-strong: #11111133;
        --accent: #0000FF;
        --accent-soft: #F2C94C;
        --accent-soft-bg: #EFE3B4;
        --risk-low: #0A8A3A;
        --risk-med: #C77700;
        --risk-high: #C72E1F;
      }

      html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); }
      .deck { font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; }
      .deck * { box-sizing: border-box; }

      .deck-screen { display: block; }
      .deck-print { display: none; }

      .slide {
        width: 100vw;
        min-height: 100vh;
        padding: 60px 80px;
        display: flex;
        align-items: center;
        background: var(--bg);
        color: var(--fg);
      }
      .slide-grid {
        width: 100%;
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 24px;
      }

      /* Kicker */
      .slide-kicker {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 16px;
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--muted);
        margin-bottom: 16px;
      }
      .slide-kicker-num { color: var(--fg); font-weight: 600; }
      .slide-kicker-divider { flex: 0 0 60px; height: 1px; background: var(--fg); opacity: 0.3; }

      /* Title slide */
      .slide-mark {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 60px;
      }
      .slide-mark-square { width: 32px; height: 32px; display: block; }
      .slide-mark-text {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: 22px;
        letter-spacing: -0.03em;
      }
      .slide-title-body { grid-column: 1 / 11; }
      .slide-title-headline {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: clamp(56px, 7vw, 112px);
        line-height: 0.92;
        letter-spacing: -0.04em;
        margin: 0 0 28px 0;
      }
      .slide-title-sub {
        font-size: clamp(18px, 1.4vw, 24px);
        line-height: 1.4;
        color: var(--muted);
        max-width: 720px;
        margin: 0;
      }
      .slide-em { color: var(--accent); font-weight: 600; }
      .slide-title-footer {
        grid-column: 1 / -1;
        display: flex;
        gap: 32px;
        margin-top: 72px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
      }

      /* Headlines */
      .slide-headline-lg {
        grid-column: 1 / -1;
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: clamp(48px, 6vw, 96px);
        line-height: 0.95;
        letter-spacing: -0.04em;
        margin: 16px 0 40px 0;
      }
      .slide-headline-md {
        grid-column: 1 / -1;
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: clamp(32px, 4vw, 56px);
        line-height: 1;
        letter-spacing: -0.03em;
        margin: 0 0 40px 0;
      }
      .slide-headline-sub {
        display: block;
        font-family: 'Inter', sans-serif;
        font-size: 0.5em;
        font-weight: 400;
        color: var(--muted);
        margin-top: 12px;
        letter-spacing: -0.01em;
      }

      /* Stats */
      .slide-stats {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        margin-bottom: 48px;
      }
      .slide-stat { border-top: 2px solid var(--fg); padding-top: 14px; }
      .slide-stat-n {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: clamp(32px, 3vw, 48px);
        line-height: 1;
        letter-spacing: -0.03em;
        margin-bottom: 10px;
      }
      .slide-stat-label { font-size: 13px; line-height: 1.45; color: var(--muted); }

      .slide-conclusion {
        grid-column: 1 / -1;
        display: flex;
        align-items: baseline;
        gap: 24px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
      }
      .slide-tam {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: clamp(40px, 4vw, 64px);
        letter-spacing: -0.03em;
        line-height: 1;
        color: var(--accent);
      }

      /* Tabs */
      .slide-tabs {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 40px;
        padding: 20px 0;
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
      }
      .slide-tab {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 6px 12px;
        background: var(--fg);
        color: var(--bg);
        border-radius: 2px;
        white-space: nowrap;
      }
      .slide-problem-body { grid-column: 1 / 9; }
      .slide-body { font-size: clamp(16px, 1.2vw, 20px); line-height: 1.55; margin: 0 0 18px 0; }
      .slide-body-muted { color: var(--muted); }
      .slide-body strong { color: var(--accent); font-weight: 600; }

      /* Three-col */
      .slide-three-col {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 32px;
        margin-bottom: 32px;
      }
      .slide-col {
        border-top: 2px solid var(--fg);
        padding-top: 16px;
      }
      .slide-col-num {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 13px;
        font-weight: 600;
        color: var(--accent);
        margin-bottom: 10px;
      }
      .slide-col-title {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: 22px;
        letter-spacing: -0.02em;
        margin-bottom: 12px;
      }
      .slide-col-body {
        font-size: 14px;
        line-height: 1.5;
        margin: 0 0 12px 0;
      }
      .slide-col-body-sm { font-size: 12px; }
      .slide-col-body-muted { color: var(--muted); }
      .slide-col-body strong { color: var(--accent); font-weight: 600; }
      .slide-col-list {
        font-size: 13px;
        line-height: 1.7;
        margin: 0;
        padding-left: 18px;
        color: var(--fg);
      }
      .slide-col-list li { margin-bottom: 4px; }

      /* Deliverable grid (slide 04) */
      .slide-deliverable-grid {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
      }
      .slide-deliverable {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 6px 10px;
        border: 1px solid var(--fg);
        border-radius: 2px;
      }

      /* Cost decline (slide 05) */
      .slide-cost-decline {
        margin: 16px 0 16px 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .slide-cost-row {
        display: grid;
        grid-template-columns: 80px 1fr auto;
        align-items: center;
        gap: 8px;
        font-size: 11px;
      }
      .slide-cost-bar {
        height: 8px;
        display: block;
      }
      .slide-cost-bar-old { background: var(--fg); }
      .slide-cost-bar-new { background: var(--accent); min-width: 4px; }
      .slide-cost-val {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        font-weight: 600;
      }

      /* Big stat (slide 06 hero number) */
      .slide-big-stat {
        grid-column: 1 / -1;
        display: flex;
        align-items: baseline;
        gap: 24px;
        margin-bottom: 36px;
      }
      .slide-big-stat-n {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: clamp(80px, 10vw, 160px);
        line-height: 0.9;
        letter-spacing: -0.05em;
        color: var(--accent);
      }
      .slide-big-stat-label {
        font-size: clamp(16px, 1.4vw, 22px);
        color: var(--muted);
        max-width: 320px;
        line-height: 1.3;
      }

      /* Tables */
      .slide-table {
        grid-column: 1 / -1;
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 28px;
        font-size: 13px;
      }
      .slide-table thead th {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--muted);
        font-weight: 500;
        text-align: left;
        padding: 8px 12px 8px 0;
        border-bottom: 2px solid var(--fg);
      }
      .slide-table tbody td {
        padding: 12px 12px 12px 0;
        border-bottom: 1px solid var(--line);
        line-height: 1.4;
      }
      .slide-table tbody td:first-child {
        font-weight: 500;
        width: 38%;
      }
      .slide-table tbody td strong { color: var(--accent); font-weight: 700; }
      .slide-ratio {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 12px;
        color: var(--muted);
      }
      .slide-table-totals td {
        border-top: 2px solid var(--fg);
        font-weight: 600;
      }
      .slide-table-cost { font-size: 13px; }
      .slide-table-comp tbody td:first-child { width: 16%; }
      .slide-comp-player { font-weight: 600; }
      .slide-comp-weakness { color: var(--muted); font-size: 12px; }
      .slide-comp-win strong { color: var(--accent); }
      .slide-table-risks tbody td:first-child { width: 30%; }
      .slide-risk-r { font-weight: 500; }
      .slide-risk-m { font-size: 12px; line-height: 1.5; color: var(--muted); }
      .slide-risk-sev {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding: 3px 8px;
        border-radius: 2px;
        font-weight: 600;
      }
      .slide-risk-sev-low { background: var(--risk-low); color: var(--bg); }
      .slide-risk-sev-medium { background: var(--risk-med); color: var(--bg); }
      .slide-risk-sev-high { background: var(--risk-high); color: var(--bg); }

      /* Callout */
      .slide-callout {
        grid-column: 1 / -1;
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 20px 0;
        border-top: 2px solid var(--fg);
      }
      .slide-callout-text {
        font-size: 15px;
        line-height: 1.55;
        flex: 1;
      }
      .slide-callout-text strong { color: var(--accent); font-weight: 600; }

      /* Velocity chart — HTML overlay labels for crisp typography */
      .slide-velocity-chart {
        grid-column: 1 / -1;
        margin-bottom: 24px;
      }
      .slide-velocity-frame {
        display: grid;
        grid-template-columns: 24px 1fr;
        grid-template-rows: 1fr auto;
        gap: 8px 16px;
      }
      .slide-velocity-y-label {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--muted);
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        white-space: nowrap;
        align-self: center;
      }
      .slide-velocity-plot {
        position: relative;
        height: 280px;
        border-left: 1px solid var(--line-strong);
        border-bottom: 1px solid var(--line-strong);
      }
      .slide-velocity-svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .slide-velocity-grid {
        stroke: var(--line);
        stroke-width: 0.15;
      }
      .slide-velocity-grid-v { stroke-dasharray: 0.4 0.4; }
      .slide-velocity-curve {
        fill: none;
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .slide-velocity-curve-comp {
        stroke: var(--muted);
        stroke-dasharray: 4 3;
        stroke-width: 1.5;
      }
      .slide-velocity-curve-allonce {
        stroke: var(--accent);
        stroke-width: 2.5;
      }
      .slide-velocity-tag {
        position: absolute;
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 4px 8px;
        white-space: nowrap;
        border-radius: 2px;
      }
      .slide-velocity-tag-allonce {
        color: var(--bg);
        background: var(--accent);
      }
      .slide-velocity-tag-comp {
        color: var(--muted);
        background: var(--bg);
        border: 1px solid var(--line-strong);
      }
      .slide-velocity-annotation {
        position: absolute;
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-style: italic;
        color: var(--muted);
        max-width: 240px;
        line-height: 1.35;
      }
      .slide-velocity-x-axis {
        grid-column: 2;
        display: flex;
        justify-content: space-between;
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
        padding-top: 4px;
      }
      .slide-velocity-conclusion { grid-column: 1 / 9; }

      /* ROI grid (slide 09) */
      .slide-roi-grid {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 28px;
      }
      .slide-roi-row {
        display: grid;
        grid-template-columns: 32% 1fr 18%;
        align-items: center;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid var(--line);
      }
      .slide-roi-row-total { border-top: 2px solid var(--fg); border-bottom: 2px solid var(--fg); }
      .slide-roi-label { font-size: 14px; }
      .slide-roi-bar {
        height: 14px;
        background: var(--line);
        position: relative;
        display: block;
      }
      .slide-roi-bar-fill {
        height: 100%;
        background: var(--fg);
        display: block;
      }
      .slide-roi-bar-fill-accent { background: var(--accent); }
      .slide-roi-val {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 13px;
        font-weight: 600;
        text-align: right;
      }
      .slide-roi-math {
        grid-column: 1 / -1;
        padding: 16px 0;
        border-top: 2px solid var(--fg);
      }
      .slide-roi-math-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--line);
      }
      .slide-roi-math-row-emph { padding: 12px 0; }
      .slide-roi-math-val {
        font-size: 14px;
        font-weight: 500;
      }
      .slide-roi-math-row-emph .slide-roi-math-val {
        font-size: 18px;
        font-weight: 700;
      }

      /* Pricing tiers */
      .slide-pricing-grid {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 28px;
      }
      .slide-pricing-tier {
        border: 1px solid var(--fg);
        padding: 24px;
        position: relative;
      }
      .slide-pricing-tier-feat {
        border-color: var(--accent);
        border-width: 2px;
        background: var(--accent-soft-bg);
      }
      .slide-pricing-tier-label {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--muted);
        margin-bottom: 12px;
      }
      .slide-pricing-tier-price {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: 48px;
        line-height: 1;
        letter-spacing: -0.03em;
        margin-bottom: 16px;
      }
      .slide-pricing-tier-mo {
        font-family: 'Inter', sans-serif;
        font-size: 18px;
        font-weight: 400;
        color: var(--muted);
      }
      .slide-pricing-tier-list {
        font-size: 13px;
        line-height: 1.6;
        margin: 0;
        padding-left: 16px;
      }
      .slide-pricing-tier-tag {
        position: absolute;
        top: -10px;
        right: 12px;
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        background: var(--accent);
        color: var(--bg);
        padding: 4px 10px;
        border-radius: 2px;
      }
      .slide-pricing-anchor {
        grid-column: 1 / -1;
        display: flex;
        gap: 16px;
        align-items: flex-start;
        padding-top: 20px;
        border-top: 2px solid var(--fg);
      }
      .slide-pricing-anchor .slide-body { font-size: 14px; margin: 0; }

      /* TAM bars */
      .slide-tam-grid {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 28px;
      }
      .slide-tam-bar {
        display: grid;
        grid-template-columns: 100px 1fr;
        grid-template-rows: auto auto;
        gap: 4px 16px;
        align-items: center;
      }
      .slide-tam-bar-label {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 12px;
        font-weight: 600;
        grid-row: 1 / 3;
      }
      .slide-tam-bar-fill {
        height: 48px;
        background: var(--fg);
        display: flex;
        align-items: center;
        padding: 0 14px;
        position: relative;
      }
      .slide-tam-tam .slide-tam-bar-fill { background: var(--fg); }
      .slide-tam-sam .slide-tam-bar-fill { background: var(--accent); }
      .slide-tam-som .slide-tam-bar-fill { background: var(--accent-soft); min-width: 8px; }
      .slide-tam-bar-n {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: 22px;
        letter-spacing: -0.02em;
        color: var(--bg);
        white-space: nowrap;
      }
      .slide-tam-som .slide-tam-bar-n { color: var(--fg); position: absolute; left: calc(100% + 12px); }
      .slide-tam-bar-note {
        font-size: 11px;
        color: var(--muted);
        grid-column: 2;
      }
      .slide-vertical-breakdown {
        grid-column: 1 / -1;
        padding-top: 20px;
        border-top: 2px solid var(--fg);
      }
      .slide-vertical-title {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--muted);
        margin-bottom: 14px;
      }
      .slide-vertical-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 13px;
        border-bottom: 1px solid var(--line);
      }

      /* Traction */
      .slide-traction-now {
        grid-column: 1 / -1;
        margin-bottom: 32px;
      }
      .slide-traction-now-label {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--muted);
        margin-bottom: 14px;
      }
      .slide-traction-now-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
      }
      .slide-traction-now-grid .slide-stat-n { font-size: clamp(28px, 2.4vw, 40px); }
      .slide-timeline {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .slide-timeline-row {
        display: grid;
        grid-template-columns: 60px 50px 1fr 100px;
        align-items: center;
        gap: 16px;
        padding: 10px 0;
        border-bottom: 1px solid var(--line);
      }
      .slide-timeline-q {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 12px;
        font-weight: 600;
      }
      .slide-timeline-bar {
        height: 12px;
        background: var(--accent);
        min-width: 4px;
      }
      .slide-timeline-event { font-size: 13px; }
      .slide-timeline-arr {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 13px;
        font-weight: 600;
        text-align: right;
      }

      /* Use of funds */
      .slide-funds-bar {
        grid-column: 1 / -1;
        display: flex;
        height: 80px;
        margin-bottom: 24px;
        border: 1px solid var(--fg);
      }
      .slide-funds-segment {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 12px 16px;
        border-right: 1px solid var(--fg);
        position: relative;
        overflow: hidden;
      }
      .slide-funds-segment:last-child { border-right: none; }
      .slide-funds-eng { background: var(--fg); color: var(--bg); }
      .slide-funds-gtm { background: var(--accent); color: var(--bg); }
      .slide-funds-ai { background: var(--accent-soft); color: var(--fg); }
      .slide-funds-buf { background: var(--bg); color: var(--fg); }
      .slide-funds-pct {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: 24px;
        line-height: 1;
        letter-spacing: -0.02em;
      }
      .slide-funds-amt {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 13px;
        font-weight: 600;
        margin-top: 4px;
      }
      .slide-funds-cat {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-top: 6px;
        opacity: 0.85;
      }
      .slide-funds-detail {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .slide-funds-row {
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: 24px;
        padding: 12px 0;
        border-bottom: 1px solid var(--line);
        font-size: 13px;
      }
      .slide-funds-row-cat { font-weight: 600; }
      .slide-funds-row-detail { color: var(--muted); }

      /* Team */
      .slide-team-grid {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-bottom: 28px;
      }
      .slide-team-card {
        border: 1px solid var(--fg);
        padding: 20px;
      }
      .slide-team-card-founder {
        background: var(--accent-soft-bg);
        border-color: var(--accent);
        border-width: 2px;
      }
      .slide-team-role {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--muted);
        margin-bottom: 8px;
      }
      .slide-team-name {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: 20px;
        letter-spacing: -0.02em;
        margin-bottom: 12px;
      }
      .slide-team-bio { font-size: 13px; line-height: 1.5; color: var(--muted); margin: 0; }
      .slide-team-proof {
        grid-column: 1 / -1;
        display: flex;
        gap: 16px;
        align-items: flex-start;
        padding: 20px;
        background: var(--fg);
        color: var(--bg);
        border-radius: 2px;
      }
      .slide-team-proof .slide-mono { color: var(--bg); opacity: 0.6; }
      .slide-team-proof-text { font-size: 14px; line-height: 1.5; }
      .slide-team-proof-text strong { color: var(--accent-soft); }

      /* Moats */
      .slide-moats-grid {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
      }
      .slide-moat {
        border-top: 2px solid var(--fg);
        padding-top: 16px;
      }
      .slide-moat-num {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        font-weight: 600;
        color: var(--accent);
        margin-bottom: 6px;
      }
      .slide-moat-title {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: 22px;
        letter-spacing: -0.02em;
        margin-bottom: 6px;
      }
      .slide-moat-headline {
        font-size: 13px;
        font-weight: 500;
        color: var(--accent);
        margin-bottom: 10px;
      }
      .slide-moat-body { font-size: 13px; line-height: 1.5; color: var(--muted); margin: 0; }

      /* The ask */
      .slide-ask-headline {
        grid-column: 1 / -1;
        display: flex;
        align-items: baseline;
        gap: 24px;
        margin-bottom: 36px;
      }
      .slide-ask-amount {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: clamp(96px, 12vw, 192px);
        line-height: 0.9;
        letter-spacing: -0.05em;
        color: var(--accent);
      }
      .slide-ask-label {
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: clamp(28px, 3vw, 44px);
        letter-spacing: -0.02em;
        color: var(--fg);
      }
      .slide-ask-grid {
        grid-column: 1 / -1;
        margin-bottom: 28px;
      }
      .slide-ask-row {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        padding: 12px 0;
        border-bottom: 1px solid var(--line);
        align-items: center;
      }
      .slide-ask-val { font-size: 14px; font-weight: 500; }
      .slide-ask-investor-grid {
        grid-column: 1 / -1;
        padding: 20px;
        background: var(--fg);
        color: var(--bg);
      }
      .slide-ask-investor-title {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--accent-soft);
        margin-bottom: 16px;
      }
      .slide-ask-investor-list {
        font-size: 13px;
        line-height: 1.6;
        margin: 0;
        padding-left: 18px;
      }
      .slide-ask-investor-list li { margin-bottom: 6px; }
      .slide-ask-investor-list strong { color: var(--accent-soft); }

      /* Closing */
      .slide-closing { background: var(--fg); color: var(--bg); }
      .slide-closing .slide-mark-square { filter: invert(1); }
      .slide-closing .slide-mark-text { color: var(--bg); }
      .slide-vision-headline {
        grid-column: 1 / -1;
        font-family: 'Archivo Black', 'Inter', sans-serif;
        font-size: clamp(56px, 7vw, 112px);
        line-height: 0.92;
        letter-spacing: -0.04em;
        color: var(--bg);
        margin: 60px 0 32px 0;
      }
      .slide-vision-sub {
        grid-column: 1 / -1;
        font-size: clamp(18px, 1.4vw, 24px);
        line-height: 1.4;
        color: var(--bg);
        opacity: 0.7;
        max-width: 720px;
        margin: 0 0 80px 0;
      }
      .slide-closing-footer {
        grid-column: 1 / -1;
        display: flex;
        gap: 32px;
        padding-top: 20px;
        border-top: 1px solid #FFFFFF22;
      }
      .slide-closing-footer .slide-mono { color: var(--bg); opacity: 0.6; }

      /* Mono labels */
      .slide-mono {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--muted);
      }

      /* Nav chrome */
      .deck-nav {
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--bg);
        border: 1px solid var(--fg);
        border-radius: 2px;
        padding: 8px 12px;
        z-index: 50;
      }
      .deck-nav-btn {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 16px;
        background: transparent;
        border: none;
        color: var(--fg);
        cursor: pointer;
        padding: 4px 10px;
        line-height: 1;
      }
      .deck-nav-btn:disabled { opacity: 0.25; cursor: not-allowed; }
      .deck-nav-btn:hover:not(:disabled) { background: var(--fg); color: var(--bg); }
      .deck-nav-counter {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.1em;
        min-width: 48px;
        text-align: center;
      }
      .deck-nav-counter-total { color: var(--muted); }

      /* Print */
      @media print {
        .deck-screen { display: none; }
        .deck-print { display: block; }
        .deck-nav { display: none; }
        .slide {
          page-break-after: always;
          page-break-inside: avoid;
          min-height: 100vh;
        }
      }

      /* Mobile */
      @media (max-width: 768px) {
        .slide { padding: 32px 20px; }
        .slide-three-col,
        .slide-pricing-grid,
        .slide-team-grid,
        .slide-moats-grid,
        .slide-traction-now-grid { grid-template-columns: 1fr; gap: 16px; }
        .slide-stats { grid-template-columns: 1fr; gap: 16px; }
        .slide-conclusion { flex-direction: column; gap: 8px; align-items: flex-start; }
        .slide-callout { flex-direction: column; gap: 8px; }
        .slide-table { font-size: 11px; }
        .slide-funds-bar { flex-direction: column; height: auto; }
        .slide-funds-segment { border-right: none; border-bottom: 1px solid var(--fg); }
      }
    `}</style>
  );
}
