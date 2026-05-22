"use client";

import { useState } from "react";
import { useLocale } from "@/app/lib/i18n/useLocale";

interface AutomationRuleRow {
  id: number;
  name: string;
  description: string | null;
  trigger_event: string;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  actions: Array<Record<string, unknown>>;
}

export function AutomationsTable({
  initialRules,
}: {
  initialRules: AutomationRuleRow[];
}) {
  const [rules, setRules] = useState<AutomationRuleRow[]>(initialRules);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { t } = useLocale();

  async function toggle(rule: AutomationRuleRow) {
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/automations/${rule.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const j = await res.json();
      if (j?.ok) {
        setRules((prev) =>
          prev.map((r) =>
            r.id === rule.id ? { ...r, enabled: !rule.enabled } : r,
          ),
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(rule: AutomationRuleRow) {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/automations/${rule.id}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (j?.ok) {
        setRules((prev) => prev.filter((r) => r.id !== rule.id));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--allonce-line-soft)] px-6 py-12 text-center">
        <p className="text-[13px] text-[var(--ink-500)]">
          {t("automation.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--allonce-line-soft)] bg-[var(--bg-app)]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[var(--allonce-line-soft)] text-left text-[11px] uppercase tracking-wider text-[var(--ink-400)]">
            <th className="px-4 py-2 font-medium">
              {t("automation.col.name")}
            </th>
            <th className="px-4 py-2 font-medium">
              {t("automation.col.trigger")}
            </th>
            <th className="px-4 py-2 font-medium">
              {t("automation.col.actions")}
            </th>
            <th className="px-4 py-2 font-medium">
              {t("automation.col.created")}
            </th>
            <th className="px-4 py-2 font-medium">
              {t("automation.col.enabled")}
            </th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr
              key={r.id}
              className="border-b border-[var(--allonce-line-soft)] last:border-b-0"
            >
              <td className="px-4 py-2">
                <div className="font-medium text-[var(--ink-900)]">
                  {r.name}
                </div>
                {r.description && (
                  <div className="text-[11px] text-[var(--ink-500)]">
                    {r.description}
                  </div>
                )}
              </td>
              <td className="px-4 py-2 font-mono text-[12px] text-[var(--ink-700)]">
                {r.trigger_event}
              </td>
              <td className="px-4 py-2 font-mono text-[12px] text-[var(--ink-700)]">
                {r.actions.map((a) => String(a.kind ?? "?")).join(", ")}
              </td>
              <td className="px-4 py-2 text-[var(--ink-500)]">
                {r.created_by ?? "—"}
                <div className="text-[11px]">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </td>
              <td className="px-4 py-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => toggle(r)}
                  className={`rounded-[var(--radius-xs)] px-2 py-0.5 text-[12px] ${
                    r.enabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[var(--bg-sunken)] text-[var(--ink-500)]"
                  }`}
                >
                  {r.enabled
                    ? t("automation.enabled")
                    : t("automation.disabled")}
                </button>
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => remove(r)}
                  className="text-[12px] text-red-600 hover:underline"
                >
                  {t("automation.delete")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
