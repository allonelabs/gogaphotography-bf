// AllOnce — wordmark + standalone mark
// Editorial-tech: Fraunces-style wordmark treatment with a blue accent dot.

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "wordmark" | "mark";
  className?: string;
}

export function AllOnceLogo({
  size = "md",
  variant = "wordmark",
  className = "",
}: LogoProps) {
  if (variant === "mark") {
    // Official AllOnce mark — three vertical bars (short / tall / medium)
    // per /Users/macintoshi/Desktop/Claude/allonce-pitch/allonce-brand-book.html
    const s = size === "sm" ? 20 : size === "lg" ? 36 : 28;
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="AllOnce"
      >
        <g fill="var(--ink-900)">
          <rect x="22" y="35" width="8" height="30" />
          <rect x="38" y="25" width="8" height="50" />
          <rect x="54" y="40" width="8" height="20" />
        </g>
      </svg>
    );
  }

  // Wordmark "AllOnce" — Geist sans, tight tracking, with a blue dot after.
  const height = size === "sm" ? 17 : size === "lg" ? 28 : 21;
  return (
    <span
      className={`inline-flex items-baseline ${className}`}
      style={{ lineHeight: 1 }}
      aria-label="AllOnce"
    >
      <span
        className="font-semibold"
        style={{
          fontSize: height,
          lineHeight: 1,
          color: "var(--ink-900)",
          letterSpacing: "-0.035em",
          fontFamily: "var(--font-sans)",
        }}
      >
        AllOnce
      </span>
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: height * 0.18,
          height: height * 0.18,
          marginLeft: height * 0.12,
          borderRadius: "50%",
          backgroundColor: "var(--ao-accent)",
          transform: `translateY(${-height * 0.04}px)`,
        }}
      />
    </span>
  );
}
