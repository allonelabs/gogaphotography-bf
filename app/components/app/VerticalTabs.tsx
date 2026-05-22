"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";

const TABS: { segment: string; key: TranslationKey }[] = [
  { segment: "", key: "tabs.general" },
  { segment: "contacts", key: "tabs.contacts" },
  { segment: "banks", key: "tabs.banks" },
  { segment: "balance", key: "tabs.balance" },
];

export function VerticalTabs({
  slug,
  id,
}: {
  slug: string;
  id: string | number;
}) {
  const pathname = usePathname() ?? "";
  const { t } = useLocale();
  return (
    <div className="overflow-x-auto border-b border-[var(--allonce-line)]">
      <nav className="-mb-px flex min-w-max gap-1">
        {TABS.map((tab) => {
          const href = `/app/${slug}/${id}${tab.segment ? `/${tab.segment}` : ""}`;
          const active =
            tab.segment === ""
              ? pathname === href
              : pathname.endsWith("/" + tab.segment);
          return (
            <Link
              key={tab.key}
              href={href}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-[13px] transition sm:px-4 ${
                active
                  ? "border-[var(--ao-accent)] font-medium text-[var(--ink-900)]"
                  : "border-transparent text-[var(--ink-500)] hover:text-[var(--ink-900)]"
              }`}
            >
              {t(tab.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
