"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "./page";
import { useLocale } from "@/app/lib/i18n/useLocale";

const ACTION_COLORS: Record<string, string> = {
  insert: "var(--allonce-ok, #047857)",
  update: "var(--ink-700)",
  delete: "var(--allonce-warn, #b45309)",
};

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return d
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "Z");
  } catch {
    return iso;
  }
}

export function AuditTable({
  initialData,
}: {
  initialData: { data: AuditEntry[]; total: number };
}) {
  const { t } = useLocale();
  const [rows, setRows] = useState<AuditEntry[]>(initialData.data);
  const [total, setTotal] = useState(initialData.total);
  const [actor, setActor] = useState("");
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const pageSize = 50;

  useEffect(() => {
    const url = new URL("/api/audit", window.location.origin);
    if (actor) url.searchParams.set("actor", actor);
    if (table) url.searchParams.set("table", table);
    if (action) url.searchParams.set("action", action);
    if (from) url.searchParams.set("from", from);
    if (to) url.searchParams.set("to", to);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    fetch(url.toString())
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) {
          setRows(j.data);
          setTotal(j.total);
        }
      })
      .catch(() => {});
  }, [actor, table, action, from, to, page]);

  const actionLabel = (a: string) =>
    a === "insert"
      ? t("audit.action.insert")
      : a === "update"
        ? t("audit.action.update")
        : a === "delete"
          ? t("audit.action.delete")
          : a;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder={t("audit.filter.actor")}
          value={actor}
          onChange={(e) => {
            setActor(e.target.value);
            setPage(1);
          }}
          className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none placeholder:text-[var(--ink-400)] sm:w-56"
        />
        <input
          type="text"
          placeholder={t("audit.filter.table")}
          value={table}
          onChange={(e) => {
            setTable(e.target.value);
            setPage(1);
          }}
          className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none placeholder:text-[var(--ink-400)] sm:w-40"
        />
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none sm:w-36"
        >
          <option value="">{t("audit.filter.any_action")}</option>
          <option value="insert">{t("audit.action.insert")}</option>
          <option value="update">{t("audit.action.update")}</option>
          <option value="delete">{t("audit.action.delete")}</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
          className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none sm:w-40"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
          className="rounded-[var(--radius-xs)] bg-transparent px-3 py-1.5 text-[13px] outline-none sm:w-40"
        />
        <span className="font-mono text-[11px] tabular-nums text-[var(--ink-400)] sm:ml-auto">
          {t("audit.entries", { n: total })}
        </span>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead className="bg-[var(--bg-sunken)] text-[11px] uppercase tracking-wider text-[var(--ink-500)]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">
                {t("audit.col.when")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("audit.col.actor")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("audit.col.action")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("audit.col.table")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("audit.col.row")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("audit.col.changes")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const diffKeys = r.diff ? Object.keys(r.diff) : [];
              const summary =
                r.action === "update"
                  ? diffKeys.slice(0, 3).join(", ") +
                    (diffKeys.length > 3
                      ? ` ${t("audit.summary.more", { n: diffKeys.length - 3 })}`
                      : "")
                  : r.action === "insert"
                    ? t("audit.summary.new_row")
                    : t("audit.summary.deleted");
              return (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-t border-[var(--allonce-line)] hover:bg-[var(--bg-app)]"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-[var(--ink-700)]">
                    {fmtTime(r.occurred_at)}
                  </td>
                  <td className="px-3 py-2 text-[var(--ink-900)]">
                    {r.actor_email ?? (
                      <span className="text-[var(--ink-400)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      style={{ color: ACTION_COLORS[r.action] }}
                      className="font-mono text-[11px] uppercase"
                    >
                      {actionLabel(r.action)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] text-[var(--ink-900)]">
                    {r.table_name}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--ink-700)]">
                    {r.row_id ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[var(--ink-500)]">
                    {summary}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-12 text-center text-[var(--ink-500)]"
                >
                  {t("audit.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-[12px] text-[var(--ink-500)]">
        <span>
          {t("common.page_of", {
            page,
            total: Math.max(1, Math.ceil(total / pageSize)),
          })}
        </span>
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] px-2 py-0.5 disabled:opacity-40"
          aria-label={t("common.previous")}
        >
          ‹
        </button>
        <button
          disabled={page * pageSize >= total}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] px-2 py-0.5 disabled:opacity-40"
          aria-label={t("common.next")}
        >
          ›
        </button>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-[var(--radius-md)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--ink-900)]">
                  {actionLabel(selected.action).toUpperCase()} ·{" "}
                  {selected.table_name} · {selected.row_id ?? "—"}
                </h2>
                <p className="mt-1 text-[12px] text-[var(--ink-500)]">
                  {fmtTime(selected.occurred_at)} ·{" "}
                  {selected.actor_email ?? t("audit.anonymous")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-[var(--ink-500)] hover:text-[var(--ink-900)]"
                aria-label={t("common.dismiss")}
              >
                ✕
              </button>
            </div>
            {selected.diff && Object.keys(selected.diff).length > 0 && (
              <section className="mb-4">
                <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
                  {t("audit.section.diff")}
                </h3>
                <pre className="overflow-x-auto rounded-[var(--radius-xs)] bg-[var(--bg-sunken)] p-3 text-[11px] leading-[1.5] text-[var(--ink-900)]">
                  {JSON.stringify(selected.diff, null, 2)}
                </pre>
              </section>
            )}
            {selected.before && (
              <section className="mb-4">
                <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
                  {t("audit.section.before")}
                </h3>
                <pre className="overflow-x-auto rounded-[var(--radius-xs)] bg-[var(--bg-sunken)] p-3 text-[11px] leading-[1.5] text-[var(--ink-900)]">
                  {JSON.stringify(selected.before, null, 2)}
                </pre>
              </section>
            )}
            {selected.after && (
              <section>
                <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
                  {t("audit.section.after")}
                </h3>
                <pre className="overflow-x-auto rounded-[var(--radius-xs)] bg-[var(--bg-sunken)] p-3 text-[11px] leading-[1.5] text-[var(--ink-900)]">
                  {JSON.stringify(selected.after, null, 2)}
                </pre>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
