"use client";

/**
 * Contacts list for the 5 company-like verticals (avia, transfer, consul,
 * ensure/insurance, excursion). Uses the legacy column names: name, position,
 * mobile, phone, mail, main (no is_primary, no `role`).
 */
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/app/lib/i18n/useLocale";

interface Contact {
  id: number;
  name: string | null;
  company: string | null;
  position: string | null;
  mail: string | null;
  mobile: string | null;
  phone: string | null;
  info: string | null;
  main: boolean | null;
}

export function VerticalContactsList({
  basePath,
}: {
  /** e.g. `/api/avia/123` */
  basePath: string;
}) {
  const { t } = useLocale();
  const url = `${basePath}/contacts`;
  const [rows, setRows] = useState<Contact[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    position: "",
    phone: "",
    mobile: "",
    mail: "",
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
      setDraft({ name: "", position: "", phone: "", mobile: "", mail: "" });
      setAdding(false);
      void load();
    }
  }

  async function del(id: number) {
    if (!confirm(t("contacts.delete_confirm"))) return;
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
                {t("fields.name")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.position")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.phone")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.mobile")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.email")}
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-[var(--allonce-line)]">
                <td className="px-3 py-2 font-medium">{c.name ?? "—"}</td>
                <td className="px-3 py-2">{c.position ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-[12px]">
                  {c.phone ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[12px]">
                  {c.mobile ?? "—"}
                </td>
                <td className="px-3 py-2">{c.mail ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => del(c.id)}
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
                  {t("contacts.empty")}
                </td>
              </tr>
            )}
            {adding && (
              <tr className="border-t border-[var(--allonce-line)] bg-[var(--bg-app)]">
                <td className="px-3 py-2">
                  <input
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                    placeholder={t("fields.name")}
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={draft.position}
                    onChange={(e) =>
                      setDraft({ ...draft, position: e.target.value })
                    }
                    placeholder={t("fields.position")}
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={draft.phone}
                    onChange={(e) =>
                      setDraft({ ...draft, phone: e.target.value })
                    }
                    placeholder={t("fields.phone")}
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={draft.mobile}
                    onChange={(e) =>
                      setDraft({ ...draft, mobile: e.target.value })
                    }
                    placeholder={t("fields.mobile")}
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={draft.mail}
                    onChange={(e) =>
                      setDraft({ ...draft, mail: e.target.value })
                    }
                    placeholder={t("fields.email")}
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
          {t("contacts.add")}
        </button>
      </div>
    </div>
  );
}
