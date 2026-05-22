"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/lib/i18n/useLocale";

interface Props {
  triggers: Array<{ event: string; label: string }>;
  actions: Array<{ kind: string; label: string; required: string[] }>;
}

export function NewAutomationForm({ triggers, actions }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState(triggers[0]?.event ?? "");
  const [conditionsJson, setConditionsJson] = useState("{}");
  const [actionsJson, setActionsJson] = useState(
    JSON.stringify(
      [
        {
          kind: "send_email",
          to_field: "client_email",
          subject: "Booking received",
          body: "Hello {{order.client_first_name}}, we have received your booking #{{order.id}}.",
        },
      ],
      null,
      2,
    ),
  );
  const [enabled, setEnabled] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      let conditions: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(conditionsJson);
        conditions =
          parsed && typeof parsed === "object" && Object.keys(parsed).length > 0
            ? parsed
            : null;
      } catch {
        setErr("conditions JSON is invalid");
        setBusy(false);
        return;
      }
      let parsedActions: Array<Record<string, unknown>>;
      try {
        const parsed = JSON.parse(actionsJson);
        if (!Array.isArray(parsed)) {
          setErr("actions must be a JSON array");
          setBusy(false);
          return;
        }
        parsedActions = parsed;
      } catch {
        setErr("actions JSON is invalid");
        setBusy(false);
        return;
      }
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          trigger_event: triggerEvent,
          conditions,
          actions: parsedActions,
          enabled,
        }),
      });
      const j = await res.json();
      if (!j?.ok) {
        setErr(j?.error?.message ?? "create failed");
        if (j?.error?.issues) {
          setErr(
            j.error.issues
              .filter((i: { level: string }) => i.level === "error")
              .map(
                (i: { field: string; message: string }) =>
                  `${i.field}: ${i.message}`,
              )
              .join(" · "),
          );
        }
        setBusy(false);
        return;
      }
      router.push("/app/automations");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--ink-700)]">
          {t("automation.form.name")}
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line-soft)] bg-[var(--bg-app)] px-3 py-1.5 text-[13px]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--ink-700)]">
          {t("automation.form.description")}
        </span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line-soft)] bg-[var(--bg-app)] px-3 py-1.5 text-[13px]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--ink-700)]">
          {t("automation.form.trigger")}
        </span>
        <select
          value={triggerEvent}
          onChange={(e) => setTriggerEvent(e.target.value)}
          className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line-soft)] bg-[var(--bg-app)] px-3 py-1.5 text-[13px]"
        >
          {triggers.map((tr) => (
            <option key={tr.event} value={tr.event}>
              {tr.label} ({tr.event})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--ink-700)]">
          {t("automation.form.conditions")}{" "}
          <span className="font-normal text-[var(--ink-400)]">
            (JSON; e.g. {'{ "order.all_sell_price_gt": 1000 }'})
          </span>
        </span>
        <textarea
          value={conditionsJson}
          onChange={(e) => setConditionsJson(e.target.value)}
          rows={3}
          className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line-soft)] bg-[var(--bg-app)] px-3 py-1.5 font-mono text-[12px]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--ink-700)]">
          {t("automation.form.actions")}{" "}
          <span className="font-normal text-[var(--ink-400)]">
            ({t("automation.form.actions.hint")}:{" "}
            {actions.map((a) => a.kind).join(", ")})
          </span>
        </span>
        <textarea
          value={actionsJson}
          onChange={(e) => setActionsJson(e.target.value)}
          rows={10}
          className="w-full rounded-[var(--radius-xs)] border border-[var(--allonce-line-soft)] bg-[var(--bg-app)] px-3 py-1.5 font-mono text-[12px]"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span className="text-[13px]">{t("automation.form.enabled")}</span>
      </label>

      {err && <div className="text-[13px] text-red-600">{err}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push("/app/automations")}
          className="rounded-[var(--radius-xs)] border border-[var(--allonce-line-soft)] px-3 py-1.5 text-[13px]"
        >
          {t("automation.form.cancel")}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-[var(--radius-xs)] bg-[var(--ink-900)] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : t("automation.form.save")}
        </button>
      </div>
    </form>
  );
}
