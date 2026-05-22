"use client";

/**
 * Integration settings form for WhatsApp Business.
 *
 * - Loads `/api/integrations/whatsapp` on mount; secrets come back masked
 *   (`__access_token_set: true` if a value is stored), so the form shows
 *   "Token is set — click Update" UX instead of a populated password field.
 * - PUT only sends non-empty sensitive fields, so leaving them blank
 *   preserves the stored value.
 * - "Test send" opens a small inline panel + POSTs to the test route,
 *   which calls the same `sendWhatsApp` pipeline.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "@/app/components/app/Toast";
import { useLocale } from "@/app/lib/i18n/useLocale";

interface IntegrationData {
  id: number | null;
  enabled: boolean;
  config: {
    phone_number_id?: string;
    business_account_id?: string;
    phone_display?: string;
    webhook_verify_token?: string;
    __access_token_set?: boolean;
    __webhook_app_secret_set?: boolean;
  };
  updated_at?: string | null;
}

const EMPTY: IntegrationData = {
  id: null,
  enabled: false,
  config: {},
};

export function WhatsAppIntegrationForm({
  webhookUrl,
}: {
  webhookUrl: string;
}) {
  const { t } = useLocale();
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<IntegrationData>(EMPTY);

  // Editable form state
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [enabled, setEnabled] = useState(false);

  const [editAccessToken, setEditAccessToken] = useState(false);
  const [accessTokenDraft, setAccessTokenDraft] = useState("");

  const [editAppSecret, setEditAppSecret] = useState(false);
  const [appSecretDraft, setAppSecretDraft] = useState("");

  const [saving, setSaving] = useState(false);

  // Test send panel
  const [showTest, setShowTest] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testBody, setTestBody] = useState("Test from travelplace 👋");
  const [testSending, setTestSending] = useState(false);

  // Copy state for webhook url + verify token
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/integrations/whatsapp", {
      cache: "no-store",
    });
    const j = await res.json();
    if (!res.ok || !j.ok) {
      toast(
        j?.error?.message ?? `HTTP ${res.status}`,
        res.status === 403 ? "warn" : "err",
      );
      setLoaded(true);
      return;
    }
    const next: IntegrationData = j.data ?? EMPTY;
    setData(next);
    setPhoneNumberId(next.config.phone_number_id ?? "");
    setBusinessAccountId(next.config.business_account_id ?? "");
    setPhoneDisplay(next.config.phone_display ?? "");
    setVerifyToken(next.config.webhook_verify_token ?? "");
    setEnabled(!!next.enabled);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        enabled,
        phone_number_id: phoneNumberId,
        business_account_id: businessAccountId,
        phone_display: phoneDisplay,
        webhook_verify_token: verifyToken,
      };
      if (editAccessToken && accessTokenDraft.length > 0) {
        payload.access_token = accessTokenDraft;
      }
      if (editAppSecret && appSecretDraft.length > 0) {
        payload.webhook_app_secret = appSecretDraft;
      }
      const res = await fetch("/api/integrations/whatsapp", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast(
          `${t("whatsapp.integrations.save_error")} · ${
            j?.error?.message ?? `HTTP ${res.status}`
          }`,
          "err",
        );
      } else {
        toast(t("whatsapp.integrations.saved"), "ok");
        // Reset secret drafts so re-saves don't try to overwrite again
        setEditAccessToken(false);
        setAccessTokenDraft("");
        setEditAppSecret(false);
        setAppSecretDraft("");
        await refresh();
      }
    } catch (err) {
      toast(
        `${t("whatsapp.integrations.save_error")} · ${
          err instanceof Error ? err.message : "unknown"
        }`,
        "err",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyToClipboard(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1500);
    } catch {
      toast(t("whatsapp.integrations.save_error"), "warn");
    }
  }

  async function runTest() {
    if (testSending) return;
    if (!/^\+\d{8,15}$/.test(testTo.trim())) {
      toast("Recipient must be E.164 (e.g. +995555123456)", "warn");
      return;
    }
    setTestSending(true);
    try {
      const res = await fetch("/api/integrations/whatsapp/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: testTo.trim(), body: testBody }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast(
          `${t("whatsapp.integrations.test_failed")} · ${
            j?.error?.message ?? `HTTP ${res.status}`
          }`,
          "err",
        );
      } else {
        toast(
          t("whatsapp.integrations.test_queued", {
            id: j.messageId,
          }),
          "ok",
        );
      }
    } catch (err) {
      toast(
        `${t("whatsapp.integrations.test_failed")} · ${
          err instanceof Error ? err.message : "unknown"
        }`,
        "err",
      );
    } finally {
      setTestSending(false);
    }
  }

  const accessTokenIsSet = !!data.config.__access_token_set;
  const appSecretIsSet = !!data.config.__webhook_app_secret_set;
  const isFullyConfigured =
    enabled &&
    !!phoneNumberId &&
    (accessTokenIsSet || (editAccessToken && accessTokenDraft.length > 0));

  if (!loaded) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-6 text-[13px] text-[var(--ink-500)]">
        …
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup banner / help link */}
      <div className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <p className="text-[13px] text-[var(--ink-700)]">
          {t("whatsapp.integrations.intro")}
        </p>
        <Link
          href="/docs/integrations/whatsapp-setup.md"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-sky-700 hover:text-sky-900"
        >
          📖 {t("whatsapp.integrations.help_link")} →
        </Link>
      </div>

      {/* Credentials */}
      <section className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <header className="mb-4">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-500)]">
            Credentials
          </h2>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("whatsapp.integrations.field.phone_number_id")}>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="123456789012345"
              className="tp-input"
            />
          </Field>
          <Field label={t("whatsapp.integrations.field.business_account_id")}>
            <input
              type="text"
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
              placeholder="123456789012345"
              className="tp-input"
            />
          </Field>
          <Field
            label={t("whatsapp.integrations.field.phone_display")}
            hint={t("whatsapp.integrations.field.phone_display_hint")}
            full
          >
            <input
              type="text"
              value={phoneDisplay}
              onChange={(e) => setPhoneDisplay(e.target.value)}
              placeholder="+995 555 123 456"
              className="tp-input"
            />
          </Field>

          {/* Access token (sensitive) */}
          <Field label={t("whatsapp.integrations.field.access_token")} full>
            {accessTokenIsSet && !editAccessToken ? (
              <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[var(--bg-surface-alt)] px-3 py-2 text-[13px]">
                <span className="text-[var(--ink-500)]">
                  {t("whatsapp.integrations.field.access_token_set")}
                </span>
                <button
                  type="button"
                  onClick={() => setEditAccessToken(true)}
                  className="text-[12px] font-medium text-sky-700 hover:text-sky-900"
                >
                  {t("whatsapp.integrations.field.access_token_update")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={accessTokenDraft}
                  onChange={(e) => {
                    setAccessTokenDraft(e.target.value);
                    if (!editAccessToken) setEditAccessToken(true);
                  }}
                  placeholder="EAA…"
                  className="tp-input flex-1"
                  autoComplete="off"
                />
                {accessTokenIsSet && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditAccessToken(false);
                      setAccessTokenDraft("");
                    }}
                    className="text-[12px] font-medium text-[var(--ink-500)] hover:text-[var(--ink-900)]"
                  >
                    {t("whatsapp.integrations.field.access_token_cancel")}
                  </button>
                )}
              </div>
            )}
          </Field>
        </div>
      </section>

      {/* Webhook */}
      <section className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <header className="mb-4">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-500)]">
            Webhook
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--ink-400)]">
            {t("whatsapp.integrations.webhook_url_hint")}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("whatsapp.integrations.webhook_url")} full>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="tp-input flex-1 font-mono text-[12.5px]"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => copyToClipboard("webhook", webhookUrl)}
                className="h-10 shrink-0 rounded-[10px] bg-[var(--bg-surface-alt)] px-3 text-[12px] font-medium text-[var(--ink-700)] transition hover:bg-[var(--bg-sunken)]"
              >
                {copiedKey === "webhook"
                  ? t("whatsapp.integrations.copied")
                  : t("whatsapp.integrations.copy")}
              </button>
            </div>
          </Field>
          <Field label={t("whatsapp.integrations.field.webhook_verify_token")}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="some-opaque-string"
                className="tp-input flex-1 font-mono text-[12.5px]"
              />
              {verifyToken && (
                <button
                  type="button"
                  onClick={() => copyToClipboard("verify", verifyToken)}
                  className="h-10 shrink-0 rounded-[10px] bg-[var(--bg-surface-alt)] px-3 text-[12px] font-medium text-[var(--ink-700)] transition hover:bg-[var(--bg-sunken)]"
                >
                  {copiedKey === "verify"
                    ? t("whatsapp.integrations.copied")
                    : t("whatsapp.integrations.copy")}
                </button>
              )}
            </div>
          </Field>
          <Field label={t("whatsapp.integrations.field.webhook_app_secret")}>
            {appSecretIsSet && !editAppSecret ? (
              <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[var(--bg-surface-alt)] px-3 py-2 text-[13px]">
                <span className="text-[var(--ink-500)]">
                  {t("whatsapp.integrations.field.webhook_app_secret_set")}
                </span>
                <button
                  type="button"
                  onClick={() => setEditAppSecret(true)}
                  className="text-[12px] font-medium text-sky-700 hover:text-sky-900"
                >
                  {t("whatsapp.integrations.field.access_token_update")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={appSecretDraft}
                  onChange={(e) => {
                    setAppSecretDraft(e.target.value);
                    if (!editAppSecret) setEditAppSecret(true);
                  }}
                  placeholder="••••••••"
                  className="tp-input flex-1"
                  autoComplete="off"
                />
                {appSecretIsSet && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditAppSecret(false);
                      setAppSecretDraft("");
                    }}
                    className="text-[12px] font-medium text-[var(--ink-500)] hover:text-[var(--ink-900)]"
                  >
                    {t("whatsapp.integrations.field.access_token_cancel")}
                  </button>
                )}
              </div>
            )}
          </Field>
        </div>
      </section>

      {/* Enable + Save */}
      <section className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-3 text-[13px] text-[var(--ink-900)]">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[var(--ao-accent)]"
            />
            {t("whatsapp.integrations.field.enabled")}
          </label>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-10 rounded-full bg-[var(--ink-900)] px-6 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-40"
          >
            {saving
              ? t("whatsapp.integrations.saving")
              : t("whatsapp.integrations.save")}
          </button>
        </div>
      </section>

      {/* Test send — only useful once enabled + creds in place */}
      {isFullyConfigured && (
        <section className="rounded-[var(--radius-md)] border border-[var(--allonce-line)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-500)]">
                {t("whatsapp.integrations.test_title")}
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--ink-400)]">
                {t("whatsapp.integrations.test_desc")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTest((s) => !s)}
              className="h-9 rounded-full bg-[var(--bg-surface-alt)] px-4 text-[12.5px] font-medium text-[var(--ink-900)] transition hover:bg-[var(--bg-sunken)]"
            >
              {showTest ? "−" : "+"} {t("whatsapp.integrations.test_title")}
            </button>
          </header>

          {showTest && (
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <Field label={t("whatsapp.integrations.test_to")}>
                <input
                  type="text"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="+995555123456"
                  className="tp-input font-mono"
                />
              </Field>
              <Field label={t("whatsapp.integrations.test_body")}>
                <input
                  type="text"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="tp-input"
                />
              </Field>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={runTest}
                  disabled={testSending}
                  className="h-10 rounded-full bg-[var(--ink-900)] px-5 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-40"
                >
                  {testSending
                    ? t("whatsapp.integrations.test_sending")
                    : t("whatsapp.integrations.test_send")}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <style jsx>{`
        .tp-input {
          width: 100%;
          height: 40px;
          border-radius: 10px;
          background-color: var(--bg-surface-alt);
          padding: 0 12px;
          font-size: 13.5px;
          color: var(--ink-900);
          outline: none;
          border: 1px solid transparent;
          transition:
            border-color 150ms,
            background-color 150ms;
        }
        .tp-input:focus {
          background-color: var(--bg-surface);
          border-color: var(--ao-accent);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  full,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`grid gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-[var(--ink-500)]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[11.5px] text-[var(--ink-400)]">{hint}</span>
      )}
    </label>
  );
}
