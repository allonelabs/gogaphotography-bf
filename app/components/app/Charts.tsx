// app/components/app/Charts.tsx
//
// Chart primitives for the admin. Plain SVG rather than a charting library:
// these are four small shapes over at most 30 points, and recharts or similar
// would add ~100kB to a dashboard that renders on the server and needs no
// interactivity beyond a tooltip the browser draws itself.
//
// Everything here is a server component - no client JS ships for any of it.
//
// Accessibility: a chart is non-text content, so every one carries role="img"
// with a label stating the actual figures, and the breakdown charts render a
// real list underneath rather than leaving the shape as the only source of the
// numbers. The shapes are an aid to reading the data, never the data itself.

import type { ReactNode } from "react";

/** Card shell shared by every panel, matching the dashboard's Stat cards. */
export function Card({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  // min-w-0 for the same reason as the rows inside: as a grid or flex item a
  // section defaults to min-width:auto, so one wide child - a donut beside its
  // legend, a long country name - stretches the whole track past the viewport
  // and clips every figure in the column.
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[10px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
            {title}
          </h2>
          {hint ? (
            <p className="mt-0.5 text-[11px] text-[var(--ink-500)]">{hint}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export interface Point {
  label: string;
  value: number;
  /** Optional second figure, shown in the tooltip only. */
  secondary?: number;
}

/**
 * Daily traffic. An area chart rather than bars because the question is the
 * shape of the trend, not the exact value of any one day.
 */
export function AreaChart({
  points,
  height = 132,
  label,
  secondaryLabel = "visitors",
}: {
  points: Point[];
  height?: number;
  label: string;
  secondaryLabel?: string;
}) {
  if (points.length === 0) {
    return <Empty>No data for this range yet.</Empty>;
  }

  const W = 600;
  const H = height;
  const pad = 4;
  const peak = Math.max(1, ...points.map((p) => p.value));
  // A single point has no line to draw; centre it so the card is not empty.
  const step = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;
  const x = (i: number) => (points.length > 1 ? pad + i * step : W / 2);
  const y = (v: number) => H - pad - (v / peak) * (H - pad * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${H} L${x(0)},${H} Z`;

  const total = points.reduce((n, p) => n + p.value, 0);
  const summary = `${label}: ${total.toLocaleString()} over ${points.length} days, peaking at ${peak.toLocaleString()} on ${
    points.find((p) => p.value === peak)?.label ?? "the busiest day"
  }.`;
  // Derived from the label so it is stable between server and client render;
  // useId would change the markup on hydration for a server component.
  const gradientId = `area-${label.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[132px] w-full"
        role="img"
        aria-label={summary}
      >
        <defs>
          {/* Unique per instance: two AreaCharts on one page would otherwise
              share one gradient id, and the second would inherit the first. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ao-accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--ao-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--ao-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          // Invisible hit area per day: the browser draws the tooltip, so no
          // client JS is needed for hover detail.
          <rect
            key={p.label}
            x={x(i) - step / 2}
            y={0}
            width={Math.max(step, 6)}
            height={H}
            fill="transparent"
          >
            <title>
              {p.label}: {p.value.toLocaleString()} {label.toLowerCase()}
              {p.secondary !== undefined
                ? `, ${p.secondary.toLocaleString()} ${secondaryLabel}`
                : ""}
            </title>
          </rect>
        ))}
      </svg>
      <figcaption className="mt-2 flex justify-between text-[10px] tabular-nums text-[var(--ink-500)]">
        <span>{points[0]?.label}</span>
        <span>peak {peak.toLocaleString()}</span>
        <span>{points[points.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Ranked breakdown. Horizontal bars, because the labels are page paths and
 * country names - text that needs room to be read, which a vertical axis
 * cannot give it.
 */
export function BarList({
  points,
  unit = "views",
  max = 6,
  empty = "Nothing recorded yet.",
}: {
  points: Point[];
  unit?: string;
  max?: number;
  empty?: string;
}) {
  if (points.length === 0) return <Empty>{empty}</Empty>;

  const rows = points.slice(0, max);
  const top = Math.max(1, ...rows.map((p) => p.value));
  const total = points.reduce((n, p) => n + p.value, 0);

  return (
    <ol className="space-y-2.5">
      {rows.map((p) => {
        const pct = Math.round((p.value / total) * 100);
        return (
          <li key={p.label}>
            {/* min-w-0 is load-bearing: a flex item defaults to min-width:auto,
                so without it `truncate` never engages, the label pushes the row
                past the card, and the figure on the right gets clipped off the
                screen on a phone. */}
            <div className="flex min-w-0 items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-[var(--ink-900)]" title={p.label}>
                {p.label || "direct"}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--ink-500)]">
                {p.value.toLocaleString()}
                <span className="ml-1.5 text-[11px]">{pct}%</span>
              </span>
            </div>
            {/* Track + fill. The number above is the accessible value; this bar
                is a visual aid, so it is hidden from assistive tech. */}
            <div
              aria-hidden
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-sunken)]"
            >
              <div
                className="h-full rounded-full bg-[var(--ao-accent)]"
                style={{ width: `${Math.max(2, (p.value / top) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
      <li className="sr-only">
        Total {total.toLocaleString()} {unit} across {points.length} entries.
      </li>
    </ol>
  );
}

/**
 * Single score as a ring. Used for the SEO total, where the question is "how
 * far from 100" - a proportion, which a ring reads faster than a number alone.
 */
export function ScoreRing({
  score,
  size = 116,
  caption,
}: {
  score: number;
  size?: number;
  caption?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const r = 48;
  const circumference = 2 * Math.PI * r;
  const filled = (clamped / 100) * circumference;

  // Three bands, not a gradient: the colour is a verdict, and a verdict should
  // not shift by one point. Every one of these clears 4.5:1 on white.
  const colour =
    clamped >= 80 ? "#15803d" : clamped >= 50 ? "#b45309" : "#b91c1c";

  return (
    <figure className="m-0 flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Score ${clamped} out of 100.${caption ? ` ${caption}` : ""}`}
        className="shrink-0"
      >
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--bg-sunken)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          // Start the arc at twelve o'clock instead of three.
          transform="rotate(-90 60 60)"
        />
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono tabular-nums"
          fontSize="30"
          fontWeight="500"
          fill="var(--ink-900)"
        >
          {clamped}
        </text>
      </svg>
      {caption ? (
        <figcaption className="text-[13px] text-[var(--ink-500)]">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/** Proportional split, for device type - two or three slices, no more. */
export function DonutSplit({ points }: { points: Point[] }) {
  const total = points.reduce((n, p) => n + p.value, 0);
  if (total === 0) return <Empty>No device data yet.</Empty>;

  // A stepped neutral ramp, not a colour scale: this admin's accent resolves
  // to near-black, so hues borrowed from a blue palette would read as a second,
  // unrelated theme. Each step is far enough apart to survive greyscale, and
  // the legend carries the share as text, so the ring is never the only way to
  // read the split.
  const shades = ["var(--ao-accent)", "#5f5f63", "#a0a0a6", "#d2d2d8"];
  const r = 44;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <figure className="m-0 flex flex-wrap items-center gap-5">
      <svg
        width="116"
        height="116"
        viewBox="0 0 120 120"
        role="img"
        aria-label={points
          .map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`)
          .join(", ")}
        className="shrink-0"
      >
        {points.map((p, i) => {
          const len = (p.value / total) * circumference;
          const seg = (
            <circle
              key={p.label}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={shades[i % shades.length]}
              strokeWidth="16"
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <figcaption>
        <ul className="space-y-1.5 text-[13px]">
          {points.map((p, i) => (
            <li key={p.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: shades[i % shades.length] }}
              />
              <span className="text-[var(--ink-900)]">{p.label}</span>
              <span className="tabular-nums text-[var(--ink-500)]">
                {Math.round((p.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

/** Tiny inline trend, for a stat card. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const W = 96;
  const H = 24;
  const peak = Math.max(1, ...values);
  const step = W / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${i * step},${H - (v / peak) * H}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-6 w-24"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <path
        d={d}
        fill="none"
        stroke="var(--ao-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-[var(--ink-500)]">{children}</p>;
}
