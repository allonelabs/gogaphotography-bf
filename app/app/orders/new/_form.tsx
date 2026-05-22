"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/app/lib/i18n/useLocale";

type Admin = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  mail: string | null;
};

export function NewOrderForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [clientQuery, setClientQuery] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState<Admin[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<Record<string, any>>({
    client_id: null,
    client_first_name: "",
    client_last_name: "",
    client_phone: "",
    c_semblance: "",
    order_date: new Date().toISOString().slice(0, 10),
    c_pay_type: "",
    all_sell_price: null,
    days: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientQuery || clientQuery.length < 2) {
      setClientSuggestions([]);
      return;
    }
    const ctl = new AbortController();
    const url = new URL("/api/account/administration", window.location.origin);
    url.searchParams.set("search", clientQuery);
    url.searchParams.set("pageSize", "8");
    fetch(url.toString(), { signal: ctl.signal })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setClientSuggestions(j.data ?? []);
      })
      .catch(() => {});
    return () => ctl.abort();
  }, [clientQuery]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await res.json();
    setSaving(false);
    if (j.ok) {
      router.push(`/app/orders/${j.data.id}`);
    } else {
      setError(j.error?.message ?? t("common.failed"));
    }
  }

  function pickClient(a: Admin) {
    setForm((s) => ({
      ...s,
      client_id: a.id,
      client_first_name: a.first_name ?? "",
      client_last_name: a.last_name ?? "",
    }));
    setClientQuery(
      [a.first_name, a.last_name].filter(Boolean).join(" ") ||
        t("items.id_label", { id: a.id }),
    );
    setShowSuggestions(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={containerRef} className="relative flex flex-col gap-1">
        <label className="text-[12px] text-[var(--ink-500)]">
          {t("orders.client_search_label")}
        </label>
        <input
          type="text"
          value={clientQuery}
          onChange={(e) => {
            setClientQuery(e.target.value);
            setShowSuggestions(true);
            setForm((s) => ({ ...s, client_id: null }));
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={t("orders.type_name")}
          className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
        />
        {showSuggestions && clientSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)]">
            {clientSuggestions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => pickClient(a)}
                className="block w-full px-3 py-1.5 text-left text-[13px] text-[var(--ink-900)] hover:bg-[var(--bg-sunken)]"
              >
                {[a.first_name, a.last_name].filter(Boolean).join(" ") ||
                  t("items.id_label", { id: a.id })}
                {a.mail && (
                  <span className="ml-2 text-[11px] text-[var(--ink-400)]">
                    {a.mail}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]">
          <span>{t("fields.first_name")}</span>
          <input
            type="text"
            value={form.client_first_name ?? ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, client_first_name: e.target.value }))
            }
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]">
          <span>{t("fields.last_name")}</span>
          <input
            type="text"
            value={form.client_last_name ?? ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, client_last_name: e.target.value }))
            }
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]">
          <span>{t("fields.phone")}</span>
          <input
            type="text"
            value={form.client_phone ?? ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, client_phone: e.target.value }))
            }
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]">
          <span>{t("orders.col.status")}</span>
          <input
            type="text"
            value={form.c_semblance ?? ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, c_semblance: e.target.value }))
            }
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]">
          <span>{t("orders.field.order_date")}</span>
          <input
            type="date"
            value={form.order_date ?? ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, order_date: e.target.value || null }))
            }
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ink-500)]">
          <span>{t("orders.field.pay_type")}</span>
          <input
            type="text"
            value={form.c_pay_type ?? ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, c_pay_type: e.target.value }))
            }
            className="rounded-[var(--radius-xs)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] px-2 py-1.5 text-[13px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-[var(--radius-xs)] bg-[var(--ao-accent)] px-4 py-1.5 text-[13px] font-medium text-white disabled:opacity-60"
        >
          {saving ? t("common.saving") : t("orders.create_order")}
        </button>
        {error && (
          <span className="text-[12px] text-[var(--error,#dc2626)]">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
