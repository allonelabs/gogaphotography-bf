"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateAutomationRule,
  sendTestAutomation,
  type AutomationRuleKey,
} from "@/app/lib/goga/actions-automations";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";

type RuleState = {
  enabled: boolean;
  delay_days: number;
  notify_studio: boolean;
  subject_en: string;
  subject_ka: string;
  subject_ru: string;
  body_en: string;
  body_ka: string;
  body_ru: string;
};

const LANGS: { key: "en" | "ka" | "ru"; label: string }[] = [
  { key: "en", label: "EN" },
  { key: "ka", label: "KA" },
  { key: "ru", label: "RU" },
];

export function RuleEditor({
  ruleKey,
  label,
  placeholders,
  initial,
}: {
  ruleKey: AutomationRuleKey;
  label: string;
  placeholders: string[];
  initial: RuleState;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "ka" | "ru">("en");
  const [state, setState] = useState<RuleState>(initial);
  const [pending, start] = useTransition();
  const [testPending, startTest] = useTransition();

  function patch(p: Partial<RuleState>) {
    setState((cur) => ({ ...cur, ...p }));
  }

  function onSave() {
    start(async () => {
      try {
        await updateAutomationRule(ruleKey, state);
        toast.show("Rule saved", "success");
        router.refresh();
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Save failed", "error");
      }
    });
  }

  function onTest() {
    startTest(async () => {
      try {
        await sendTestAutomation(ruleKey);
        toast.show("Test email sent to your inbox", "success");
      } catch (e) {
        toast.show(e instanceof Error ? e.message : "Send failed", "error");
      }
    });
  }

  const inputCls =
    "block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";
  const monoCls =
    "block w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[13px] font-mono leading-[1.6] text-[var(--ink-900)] outline-none transition focus:border-[var(--ink-900)]";

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full ${state.enabled ? "bg-slate-900" : "bg-slate-300"}`}
          />
          <span className="text-[14px] font-medium text-[var(--ink-900)]">
            {label}
          </span>
          <code className="text-[11px] text-[var(--ink-400)]">{ruleKey}</code>
        </div>
        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
          {open ? "Collapse" : "Edit"}
        </span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-black/5 px-5 py-5">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-[13px] text-[var(--ink-700)]">
              <input
                type="checkbox"
                checked={state.enabled}
                onChange={(e) => patch({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-black/20"
              />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[var(--ink-700)]">
              <input
                type="checkbox"
                checked={state.notify_studio}
                onChange={(e) => patch({ notify_studio: e.target.checked })}
                className="h-4 w-4 rounded border-black/20"
              />
              Also alert the studio
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[var(--ink-700)]">
              Delay (days)
              <input
                type="number"
                min={0}
                value={state.delay_days}
                onChange={(e) =>
                  patch({ delay_days: parseInt(e.target.value, 10) || 0 })
                }
                className={`${inputCls} w-20`}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {placeholders.map((p) => (
              <code
                key={p}
                className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-[var(--ink-700)]"
              >
                {"{{" + p + "}}"}
              </code>
            ))}
          </div>

          <div className="flex gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLang(l.key)}
                className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${
                  lang === l.key
                    ? "bg-[var(--ink-900)] text-white"
                    : "border border-black/10 text-[var(--ink-700)] hover:bg-slate-50"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
              Subject ({lang.toUpperCase()})
            </span>
            <input
              value={state[`subject_${lang}`]}
              onChange={(e) =>
                patch({
                  [`subject_${lang}`]: e.target.value,
                } as Partial<RuleState>)
              }
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-500)]">
              Body ({lang.toUpperCase()})
            </span>
            <textarea
              value={state[`body_${lang}`]}
              onChange={(e) =>
                patch({
                  [`body_${lang}`]: e.target.value,
                } as Partial<RuleState>)
              }
              rows={10}
              className={monoCls}
            />
          </label>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save rule"}
            </button>
            <button
              type="button"
              onClick={onTest}
              disabled={testPending}
              className="rounded-full border border-black/10 px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-700)] transition hover:bg-slate-50 disabled:opacity-50"
            >
              {testPending ? "Sending…" : "Send test to me"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
