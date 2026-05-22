"use client";

import { useState } from "react";
import { useLocale } from "@/app/lib/i18n/useLocale";

export type OrderTab = "general" | "items" | "tourists";

export function OrderTabs({
  active,
  onChange,
}: {
  active: OrderTab;
  onChange: (t: OrderTab) => void;
}) {
  const { t } = useLocale();
  const tabs: { id: OrderTab; label: string }[] = [
    { id: "general", label: t("tabs.general") },
    { id: "items", label: t("tabs.items") },
    { id: "tourists", label: t("tabs.tourists") },
  ];
  return (
    <div className="overflow-x-auto border-b border-[var(--allonce-line)]">
      <nav className="-mb-px flex min-w-max gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-[13px] transition sm:px-4 ${
              active === tab.id
                ? "border-[var(--ao-accent)] font-medium text-[var(--ink-900)]"
                : "border-transparent text-[var(--ink-500)] hover:text-[var(--ink-900)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function useOrderTab(initial: OrderTab = "general") {
  return useState<OrderTab>(initial);
}
