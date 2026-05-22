"use client";

/**
 * Bank-accounts list shared by the 5 company-like verticals.
 * Legacy column names: bank_code, a_a (account), currency, bank_name, swift, main.
 */
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/app/lib/i18n/useLocale";

interface Bank {
  id: number;
  bank_code: string | null;
  a_a: string | null;
  currency: string | null;
  bank_name: string | null;
  swift: string | null;
  main: boolean | null;
}

export function VerticalBanksList({ basePath }: { basePath: string }) {
  const { t } = useLocale();
  const url = `${basePath}/banks`;
  const [rows, setRows] = useState<Bank[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    bank_name: "",
    bank_code: "",
    a_a: "",
    swift: "",
    currency: "GEL",
  });

  const load = useCallback(async () => {
    const r = await fetch(url);
    const j = await r.json();
    if (j.ok) setRows(j.data);
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if ((await r.json()).ok) {
      setDraft({
        bank_name: "",
        bank_code: "",
        a_a: "",
        swift: "",
        currency: "GEL",
      });
      setAdding(false);
      void load();
    }
  }

  async function del(id: number) {
    if (!confirm(t("banks.delete_confirm_vertical"))) return;
    const r = await fetch(`${url}/${id}`, { method: "DELETE" });
    if ((await r.json()).ok) void load();
  }

  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--bg-sunken)] text-[11px] uppercase tracking-wider text-[var(--ink-500)]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.bank")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.bank_code")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.account")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.swift")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.currency")}
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-[var(--allonce-line)]">
                <td className="px-3 py-2 font-medium">{b.bank_name ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-[12px]">
                  {b.bank_code ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[12px]">
                  {b.a_a ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[12px]">
                  {b.swift ?? "—"}
                </td>
                <td className="px-3 py-2">{b.currency ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => del(b.id)}
                    className="text-[12px] text-[var(--allonce-err)]"
                  >
                    {t("common.delete")}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !adding && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-[var(--ink-500)]"
                >
                  {t("banks.empty")}
                </td>
              </tr>
            )}
            {adding && (
              <tr className="border-t border-[var(--allonce-line)] bg-[var(--bg-app)]">
                <td className="px-3 py-2">
                  <input
                    value={draft.bank_name}
                    onChange={(e) =>
                      setDraft({ ...draft, bank_name: e.target.value })
                    }
                    placeholder={t("fields.bank")}
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={draft.bank_code}
                    onChange={(e) =>
                      setDraft({ ...draft, bank_code: e.target.value })
                    }
                    placeholder={t("fields.bank_code")}
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={draft.a_a}
                    onChange={(e) =>
                      setDraft({ ...draft, a_a: e.target.value })
                    }
                    placeholder={t("fields.account")}
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={draft.swift}
                    onChange={(e) =>
                      setDraft({ ...draft, swift: e.target.value })
                    }
                    placeholder={t("fields.swift")}
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={draft.currency}
                    onChange={(e) =>
                      setDraft({ ...draft, currency: e.target.value })
                    }
                    placeholder="GEL"
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={add}
                    className="text-[12px] font-medium text-[var(--ao-accent)]"
                  >
                    {t("common.save")}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <button
          onClick={() => setAdding(true)}
          disabled={adding}
          className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] px-3 py-1.5 text-[12px]"
        >
          {t("banks.add_account")}
        </button>
      </div>
    </div>
  );
}
