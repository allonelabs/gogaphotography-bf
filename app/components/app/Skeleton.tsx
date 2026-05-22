// Skeleton primitive — a shimmering rounded rectangle used by loading.tsx
// pages. Single CSS class (`ao-skel`) does all the work; this component is
// just a thin wrapper so route-level loading shells stay readable.

interface SkeletonProps {
  className?: string;
  /** Tailwind height utility, e.g. "h-6". Defaults to h-4. */
  h?: string;
  /** Tailwind width utility, e.g. "w-32" / "w-full". Defaults to w-full. */
  w?: string;
  /** Override the rounded corner via Tailwind, e.g. "rounded-full". */
  rounded?: string;
}

export function Skeleton({
  className = "",
  h = "h-4",
  w = "w-full",
  rounded,
}: SkeletonProps) {
  return (
    <div
      className={`ao-skel ${h} ${w} ${rounded ?? ""} ${className}`.trim()}
      aria-hidden
    />
  );
}
