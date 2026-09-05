"use client";

import { useState } from "react";
import { useLocale } from "@/app/lib/i18n/useLocale";

type Row = { id: number; name: string };

export interface SimpleNameListProps {
  initial: Row[];
  endpoint: string;
  entityLabel: string;
  entityLabelPlural: string;
}

/**
 * Reusable inline-edit table for simple `{id, name}` catalogs.
 * Used for /api/catalogs/juridical-form and /api/catalogs/hotel-groups.
 */
export function SimpleNameList({
  initial,
  endpoint,
  entityLabel,
  entityLabelPlural,
}: SimpleNameListProps) {
  const { t } = useLocale();
  const [rows, setRows] = useState<Row[]>(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    const r = await fetch(endpoint);
    const j = await r.json();
    if (j.ok) setRows(j.data);
  }

  async function add() {
    if (!draft.trim()) return;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draft.trim() }),
    });
    if ((await r.json()).ok) {
      setDraft("");
      setAdding(false);
      load();
    }
  }

  async function saveEdit(id: number) {
    if (!editDraft.trim()) return;
    const r = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editDraft.trim() }),
    });
    if ((await r.json()).ok) {
      setEditId(null);
      load();
    }
  }

  async function del(id: number) {
    if (
      !confirm(
        t("catalog.delete_confirm_one", {
          singular: entityLabel.toLowerCase(),
        }),
      )
    )
      return;
    const r = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if ((await r.json()).ok) load();
  }

  const filtered = search
    ? rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-2 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder={t("catalog.search_one", {
            plural: entityLabelPlural.toLowerCase(),
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none placeholder:text-[var(--ink-400)] sm:flex-1"
        />
        <div className="flex items-center gap-2">
          <span className="flex-1 font-mono text-[11px] tabular-nums text-[var(--ink-400)] sm:flex-none">
            {t("catalog.count_one", {
              n: filtered.length,
              plural: entityLabelPlural.toLowerCase(),
            })}
          </span>
          <button
            onClick={() => setAdding(true)}
            disabled={adding}
            className="rounded-[var(--radius-xs)] bg-[var(--ao-accent)] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
          >
            {t("catalog.new_one", { singular: entityLabel.toLowerCase() })}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--bg-sunken)] text-[11px] uppercase tracking-wider text-[var(--ink-500)]">
            <tr>
              <th className="px-3 py-2 text-left font-medium w-16">
                {t("fields.id")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("fields.name")}
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="border-t border-[var(--allonce-line)] bg-[var(--bg-app)]">
                <td className="px-3 py-2 text-[var(--ink-400)]">
                  {t("crumb.new").toLowerCase()}
                </td>
                <td className="px-3 py-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") add();
                      if (e.key === "Escape") {
                        setAdding(false);
                        setDraft("");
                      }
                    }}
                    placeholder={t("catalog.new_placeholder")}
                    className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={add}
                    className="mr-3 text-[12px] font-medium text-[var(--ao-accent)]"
                  >
                    {t("common.save")}
                  </button>
                  <button
                    onClick={() => {
                      setAdding(false);
                      setDraft("");
                    }}
                    className="text-[12px] text-[var(--ink-500)]"
                  >
                    {t("common.cancel")}
                  </button>
                </td>
              </tr>
            )}
            {filtered.map((row) =>
              editId === row.id ? (
                <tr
                  key={row.id}
                  className="border-t border-[var(--allonce-line)] bg-[var(--bg-app)]"
                >
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--ink-400)]">
                    {String(row.id).padStart(3, "0")}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(row.id);
                        if (e.key === "Escape") setEditId(null);
                      }}
                      className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-white px-2 py-1 text-[12px]"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => saveEdit(row.id)}
                      className="mr-3 text-[12px] font-medium text-[var(--ao-accent)]"
                    >
                      {t("common.save")}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="text-[12px] text-[var(--ink-500)]"
                    >
                      {t("common.cancel")}
                    </button>
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.id}
                  className="border-t border-[var(--allonce-line)] hover:bg-[var(--bg-sunken)]"
                >
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--ink-400)]">
                    {String(row.id).padStart(3, "0")}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setEditId(row.id);
                        setEditDraft(row.name);
                      }}
                      className="mr-3 text-[12px] text-[var(--ink-700)]"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => del(row.id)}
                      className="text-[12px] text-[var(--allonce-err)]"
                    >
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              ),
            )}
            {filtered.length === 0 && !adding && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-12 text-center text-[var(--ink-500)]"
                >
                  {t("catalog.empty_one", {
                    plural: entityLabelPlural.toLowerCase(),
                  })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
