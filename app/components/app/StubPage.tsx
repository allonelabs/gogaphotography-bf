// Placeholder content for unbuilt dashboard pages. Premium aesthetic
// matches the account/org/billing pages: hairlines on page background,
// quiet greys, no uppercase eyebrows.

interface StubPageProps {
  eyebrow: string;
  title: string;
  body?: string;
  phase?: number;
  features?: string[];
}

export function StubPage({ title, body, phase, features = [] }: StubPageProps) {
  return (
    <div className="px-10 py-12">
      <div className="mx-auto max-w-[720px]">
        <h1
          className="text-[var(--ink-900)]"
          style={{
            fontSize: "clamp(22px, 2.4vw, 28px)",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {body && (
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--ink-500)]">
            {body}
          </p>
        )}

        {phase && (
          <p className="mt-6 text-[12.5px] text-[var(--ink-400)]">
            Scaffolded · full UI lands in Phase {phase}.
          </p>
        )}

        {features.length > 0 && (
          <section className="mt-10">
            <h2
              className="text-[12.5px] text-[var(--ink-400)]"
              style={{ fontWeight: 500 }}
            >
              Planned
            </h2>
            <ul className="mt-3">
              {features.map((f, i, arr) => (
                <li
                  key={f}
                  className={`py-3 text-[13.5px] text-[var(--ink-900)] ${
                    i < arr.length - 1 ? "border-b border-[var(--allonce-line-soft)]" : ""
                  }`}
                >
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
