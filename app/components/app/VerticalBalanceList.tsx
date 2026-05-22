"use client";

/** Balance history list — read-only for the 5 company-like verticals. */
import { useCallback, useEffect, useState } from "react";

interface BalanceRow {
  id: number;
  set_date: string | null;
  c_pay_prescript: string | null;
  arrears: number | null;
  pay: number | null;
  document_number: string | null;
  invoice_number: string | null;
  currency_name: string | null;
}

export function VerticalBalanceList({ basePath }: { basePath: string }) {
  const url = `${basePath}/balance`;
  const [rows, setRows] = useState<BalanceRow[]>([]);

  const load = useCallback(async () => {
    const r = await fetch(url);
    const j = await r.json();
    if (j.ok) setRows(j.data);
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
      <table className="w-full text-[13px]">
        <thead className="bg-[var(--bg-sunken)] text-[11px] uppercase tracking-wider text-[var(--ink-500)]">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Date</th>
            <th className="px-3 py-2 text-left font-medium">Prescript</th>
            <th className="px-3 py-2 text-right font-medium">Arrears</th>
            <th className="px-3 py-2 text-right font-medium">Pay</th>
            <th className="px-3 py-2 text-left font-medium">Document</th>
            <th className="px-3 py-2 text-left font-medium">Invoice</th>
            <th className="px-3 py-2 text-left font-medium">Currency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[var(--allonce-line)]">
              <td className="px-3 py-2 font-mono text-[12px]">
                {r.set_date ?? "—"}
              </td>
              <td className="px-3 py-2">{r.c_pay_prescript ?? "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.arrears ?? "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.pay ?? "—"}
              </td>
              <td className="px-3 py-2">{r.document_number ?? "—"}</td>
              <td className="px-3 py-2">{r.invoice_number ?? "—"}</td>
              <td className="px-3 py-2">{r.currency_name ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-3 py-8 text-center text-[var(--ink-500)]"
              >
                No balance entries.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
