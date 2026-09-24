type LogRow = {
  id: string;
  rule_key: string;
  entity_id: string;
  recipient: string | null;
  status: string;
  error: string | null;
  created_at: string;
};

export function RecentLog({ rows }: { rows: LogRow[] }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--ink-500)]">
        Recent sends
      </h2>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-400)]">Nothing sent yet.</p>
      ) : (
        <ul className="divide-y divide-black/5">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]"
            >
              <div className="min-w-0">
                <span className="font-medium text-[var(--ink-900)]">
                  {r.rule_key}
                </span>
                <span className="ml-2 text-[var(--ink-500)]">
                  → {r.recipient ?? "—"}
                </span>
                {r.error ? (
                  <span className="ml-2 text-[12px] text-slate-700">
                    {r.error}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--ink-400)]">
                <span
                  className={`rounded-full px-2 py-0.5 uppercase tracking-[0.12em] ${
                    r.status === "sent"
                      ? "bg-slate-100 text-slate-700"
                      : "bg-slate-200 text-slate-900"
                  }`}
                >
                  {r.status}
                </span>
                <time dateTime={r.created_at}>
                  {new Date(r.created_at).toLocaleString()}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
