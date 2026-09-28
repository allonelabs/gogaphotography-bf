"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSiteSettings } from "@/app/lib/goga/actions-site-settings";
import { useToast } from "@/app/admin/(dashboard)/_components/Toaster";
import { useLocale } from "@/app/lib/i18n/useLocale";

type Settings = {
  page_transitions: boolean;
  reveal_animations: boolean;
  caption_mode: "cursor" | "bottom" | "off";
  lightbox_captions: boolean;
  calculator_enabled: boolean;
  faq_photos: boolean;
};

export function SiteSettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const toast = useToast();
  const { tr } = useLocale();
  const [state, setState] = useState<Settings>(initial);
  const [pending, start] = useTransition();

  function onSave() {
    start(async () => {
      try {
        await updateSiteSettings(state);
        toast.show(
          tr("Site settings saved", "საიტის პარამეტრები შენახულია"),
          "success",
        );
        router.refresh();
      } catch (e) {
        toast.show(
          e instanceof Error
            ? e.message
            : tr("Save failed", "შენახვა ვერ მოხერხდა"),
          "error",
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <Toggle
        label={tr("Page transitions", "გვერდებს შორის გადასვლა")}
        hint={tr(
          "Cross-document View Transitions (fade/rise) between pages, with the 850ms fallback for browsers without support.",
          "დოკუმენტთაშორისი View Transitions (გაქრობა/აწევა) გვერდებს შორის, 850ms fallback-ით ბრაუზერებისთვის მხარდაჭერის გარეშე.",
        )}
        checked={state.page_transitions}
        onChange={(v) => setState((s) => ({ ...s, page_transitions: v }))}
      />
      <Toggle
        label={tr("Reveal animations", "გამოჩენის ანიმაციები")}
        hint={tr(
          "Headings, text blocks and images fade/rise into view on scroll.",
          "სათაურები, ტექსტის ბლოკები და სურათები ჩნდებიან სქროლისას.",
        )}
        checked={state.reveal_animations}
        onChange={(v) => setState((s) => ({ ...s, reveal_animations: v }))}
      />
      <Toggle
        label={tr("Lightbox captions", "ლაითბოქსის წარწერები")}
        hint={tr(
          "Show the photo's caption inside the lightbox.",
          "აჩვენე ფოტოს წარწერა ლაითბოქსში.",
        )}
        checked={state.lightbox_captions}
        onChange={(v) => setState((s) => ({ ...s, lightbox_captions: v }))}
      />
      <Toggle
        label={tr("Price calculator", "ფასის კალკულატორი")}
        hint={tr(
          "Enable the add-ons + extra-hours calculator on /book and /services.",
          "ჩართე დამატებებისა და დამატებითი საათების კალკულატორი გვერდებზე /book და /services.",
        )}
        checked={state.calculator_enabled}
        onChange={(v) => setState((s) => ({ ...s, calculator_enabled: v }))}
      />
      <Toggle
        label={tr("FAQ photos", "ხშირი კითხვების ფოტოები")}
        hint={tr(
          "Scatter a few very small photos around an answer when a question is opened. Photos come from the “FAQ page” album (homepage photos until you add some).",
          "პასუხის ირგვლივ გაფანტე რამდენიმე პატარა ფოტო კითხვის გახსნისას. ფოტოები მოდის „FAQ page“ ალბომიდან (მთავარი გვერდის ფოტოები, სანამ თავად არ დაამატებთ).",
        )}
        checked={state.faq_photos}
        onChange={(v) => setState((s) => ({ ...s, faq_photos: v }))}
      />

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h3 className="text-[14px] font-medium text-[var(--ink-900)]">
          {tr("Caption mode", "წარწერის რეჟიმი")}
        </h3>
        <p className="mt-1 text-[12px] text-[var(--ink-500)]">
          {tr(
            "How photo captions show on the grid — desktop only; touch devices always use a bottom overlay.",
            "როგორ ჩნდება ფოტოს წარწერა ბადეზე — მხოლოდ დესქტოპზე; სენსორულ მოწყობილობებზე ყოველთვის ქვედა ოვერლეი გამოიყენება.",
          )}
        </p>
        <div className="mt-3 flex gap-2">
          {(["cursor", "bottom", "off"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setState((s) => ({ ...s, caption_mode: mode }))}
              className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.18em] ${
                state.caption_mode === mode
                  ? "bg-[var(--ink-900)] text-white"
                  : "border border-black/10 text-[var(--ink-700)] hover:bg-slate-50"
              }`}
            >
              {mode === "cursor"
                ? tr("Follows cursor", "კურსორს მისდევს")
                : mode === "bottom"
                  ? tr("Bottom overlay", "ქვედა ოვერლეი")
                  : tr("Off", "გამორთული")}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ao-accent-hover)] disabled:opacity-50"
      >
        {pending ? tr("Saving…", "ინახება…") : tr("Save", "შენახვა")}
      </button>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-black/20"
      />
      <span>
        <span className="block text-[14px] font-medium text-[var(--ink-900)]">
          {label}
        </span>
        <span className="mt-0.5 block text-[12px] text-[var(--ink-500)]">
          {hint}
        </span>
      </span>
    </label>
  );
}
