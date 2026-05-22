"use client";

// u31 — Class 4. This page used to fake everything:
//   • Password change toasted "Password changed" without any API call.
//   • 2FA toggle wrote { twoFA: true } to localStorage and displayed a
//     hardcoded grid of "recovery codes" the operator could save. They
//     never worked — the codes were never registered anywhere.
//   • Add passkey created a fake `pk-${Date.now()}` row without any
//     WebAuthn handshake; toasted "Passkey registered".
//   • Active sessions was a hardcoded SESSIONS array including a
//     "MacBook Pro · Chrome · Berlin, DE" entry — the kind of thing a
//     paranoid operator would freak out about. Revoke / Log out all
//     just dropped rows from local state.
//
// All of it removed for now. Real auth flows ship with multi-tenant
// auth; until then the page renders an honest "Coming soon" header
// with disabled inputs so the operator can see the shape without
// being misled.

import { AppShell } from "@/app/components/app/AppShell";
import { useLocale } from "@/app/lib/i18n/useLocale";

export default function Page() {
  const { t } = useLocale();
  return (
    <AppShell
      breadcrumb={[
        { label: t("security.crumb.account"), href: "/app/account" },
        { label: t("security.crumb.security") },
      ]}
      chatScope={{ level: "org" }}
      chatScopeLabel="account/security"
    >
      <div className="px-10 py-12">
        <div className="mx-auto max-w-[720px]">
          <h1
            className="text-[var(--ink-900)]"
            style={{
              fontSize: "clamp(22px, 2.4vw, 28px)",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            {t("security.title")}
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--ink-500)]">
            {t("security.subtitle")}
          </p>

          <p className="mt-4 text-[12.5px] text-[var(--ink-400)]">
            {t("security.coming_soon")}
          </p>

          <Section label={t("security.section.password")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                placeholder={t("security.password.current")}
                disabledTooltip={t("security.disabled_tooltip")}
                disabled
              />
              <Input
                placeholder={t("security.password.new")}
                disabledTooltip={t("security.disabled_tooltip")}
                disabled
              />
              <Input
                placeholder={t("security.password.confirm")}
                disabledTooltip={t("security.disabled_tooltip")}
                disabled
              />
            </div>
            <div className="mt-4 flex justify-end">
              <DisabledButton tooltip={t("security.disabled_tooltip")}>
                {t("security.password.change")}
              </DisabledButton>
            </div>
          </Section>

          <Section label={t("security.section.two_factor")}>
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-[14px] text-[var(--ink-900)]">
                  {t("security.two_factor.none")}
                </p>
                <p className="mt-1 text-[12.5px] text-[var(--ink-500)]">
                  {t("security.two_factor.hint")}
                </p>
              </div>
              <DisabledToggle tooltip={t("security.disabled_tooltip")} />
            </div>
          </Section>

          <Section label={t("security.section.passkeys")}>
            <p className="text-[13px] text-[var(--ink-500)]">
              {t("security.passkeys.empty")}
            </p>
            <div className="mt-4 flex justify-end">
              <DisabledButton tooltip={t("security.disabled_tooltip")}>
                {t("security.passkeys.register")}
              </DisabledButton>
            </div>
          </Section>

          <Section label={t("security.section.sessions")}>
            <p className="text-[13px] text-[var(--ink-500)]">
              {t("security.sessions.empty")}
            </p>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-[var(--allonce-line-soft)] pt-6">
      <h2
        className="text-[12.5px] text-[var(--ink-400)]"
        style={{ fontWeight: 500 }}
      >
        {label}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Input({
  placeholder,
  disabled,
  disabledTooltip,
}: {
  placeholder: string;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  return (
    <input
      type="password"
      placeholder={placeholder}
      disabled={disabled}
      title={disabled ? disabledTooltip : undefined}
      className="h-10 w-full rounded-[12px] border border-[var(--allonce-line)] bg-white px-3.5 text-[13.5px] text-[var(--ink-400)] outline-none transition placeholder:text-[var(--ink-400)] cursor-not-allowed"
    />
  );
}

function DisabledButton({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <button
      type="button"
      disabled
      title={tooltip}
      className="inline-flex h-9 items-center rounded-full bg-[var(--bg-surface-alt)] px-5 text-[12.5px] text-[var(--ink-400)] cursor-not-allowed"
      style={{ fontWeight: 500 }}
    >
      {children}
    </button>
  );
}

function DisabledToggle({ tooltip }: { tooltip?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={false}
      disabled
      title={tooltip}
      className="relative h-6 w-11 rounded-full cursor-not-allowed"
      style={{ backgroundColor: "var(--bg-sunken)" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
        style={{ left: "2px" }}
      />
    </button>
  );
}
