"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tourismFooter, tourismNav } from "@/app/data/tourism-nav";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";
import {
  BarChart3,
  Building,
  Calendar,
  Car,
  Compass,
  FileText,
  GitBranch,
  Globe,
  Home,
  MapPin,
  MessageCircle,
  Plane,
  Plug,
  Receipt,
  RotateCcw,
  Scale,
  Scroll,
  Shield,
  Tag,
  Tags,
  Truck,
  UserCheck,
  Wallet,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  home: Home,
  plane: Plane,
  building: Building,
  truck: Truck,
  "user-check": UserCheck,
  "file-text": FileText,
  shield: Shield,
  compass: Compass,
  car: Car,
  receipt: Receipt,
  "rotate-ccw": RotateCcw,
  wallet: Wallet,
  globe: Globe,
  "git-branch": GitBranch,
  "map-pin": MapPin,
  scale: Scale,
  scroll: Scroll,
  tags: Tags,
  tag: Tag,
  "bar-chart-3": BarChart3,
  calendar: Calendar,
  "message-circle": MessageCircle,
  plug: Plug,
};

// href → translation key (e.g. "/app/avia" → "nav.avia",
// "/app/juridical-form" → "nav.juridical_form",
// "/app/reports/hotel-directory" → "nav.hotel_directory")
const HREF_KEY_OVERRIDE: Record<string, TranslationKey> = {
  "/app/reports/hotel-directory": "nav.hotel_directory",
  "/app/reports/hotel-price": "nav.hotel_price",
};

function navKey(href: string): TranslationKey {
  if (href === "/app") return "nav.home";
  if (HREF_KEY_OVERRIDE[href]) return HREF_KEY_OVERRIDE[href];
  const slug = href
    .replace(/^\/app\//, "")
    .replace(/\//g, "_")
    .replace(/-/g, "_");
  return ("nav." + slug) as TranslationKey;
}

const SECTION_KEY: Record<string, TranslationKey> = {
  Bookings: "nav.section.bookings",
  Operations: "nav.section.operations",
  Catalog: "nav.section.catalog",
  Reports: "nav.section.reports",
};

const SUB_KEY: Record<string, TranslationKey> = {
  contacts: "tabs.contacts",
  banks: "tabs.banks",
  balance: "tabs.balance",
  prices: "tabs.prices",
};

const FOOTER_KEY: Record<string, TranslationKey> = {
  "/app/account": "nav.account",
  "/app/organization": "nav.organization",
  "/app/billing": "nav.billing",
  "/app/help": "nav.help",
};

function Icon({ name }: { name: string }) {
  const I = ICONS[name];
  if (!I) return null;
  return <I className="h-4 w-4 shrink-0" strokeWidth={1.75} />;
}

function NavRow({
  href,
  label,
  iconName,
  count,
  active,
}: {
  href: string;
  label: string;
  iconName: string;
  count?: number | null;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[var(--radius-xs)] px-3 py-1.5 text-[13px] transition ${
        active
          ? "bg-[var(--bg-sunken)] text-[var(--ink-900)] font-medium"
          : "text-[var(--ink-900)] hover:bg-[var(--bg-app)]"
      }`}
    >
      <Icon name={iconName} />
      <span className="flex-1 truncate">{label}</span>
      {count != null && (
        <span className="font-mono text-[11px] tabular-nums text-[var(--ink-400)]">
          {count}
        </span>
      )}
    </Link>
  );
}

function SubRow({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-[var(--radius-xs)] px-3 py-1 pl-10 text-[12px] transition ${
        active
          ? "bg-[var(--bg-sunken)] text-[var(--ink-900)] font-medium"
          : "text-[var(--ink-500)] hover:bg-[var(--bg-app)] hover:text-[var(--ink-900)]"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname() ?? "";
  const { t } = useLocale();

  const matchesItem = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isOnDetailFor = (itemHref: string) =>
    new RegExp(`^${itemHref}/[^/]+`).test(pathname);

  return (
    <aside className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {/* Top — Home */}
        <ul className="space-y-0.5">
          <li>
            <NavRow
              href={tourismNav.top.href}
              label={t(navKey(tourismNav.top.href))}
              iconName={tourismNav.top.icon}
              active={pathname === tourismNav.top.href}
            />
          </li>
        </ul>

        {/* Sections */}
        {tourismNav.sections.map((section) => (
          <div key={section.label} className="mt-6 px-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-400)]">
              {SECTION_KEY[section.label]
                ? t(SECTION_KEY[section.label])
                : section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = matchesItem(item.href);
                const expandSub =
                  !!item.subEntities && isOnDetailFor(item.href);
                const key = navKey(item.href);
                const translated = t(key);
                // Safety: if the dict didn't have it, t() returns the key
                // itself — fall back to the raw label from the nav config.
                const label = translated === key ? item.label : translated;
                return (
                  <li key={item.href}>
                    <NavRow
                      href={item.href}
                      label={label}
                      iconName={item.icon}
                      count={item.count}
                      active={active}
                    />
                    {expandSub && item.subEntities && (
                      <ul className="mt-0.5 space-y-0.5">
                        {item.subEntities.map((sub) => {
                          const subHref = `${item.href}/${pathname.split("/")[3] ?? ""}/${sub.segment}`;
                          const subActive = pathname.endsWith(
                            "/" + sub.segment,
                          );
                          const subLabel = SUB_KEY[sub.segment]
                            ? t(SUB_KEY[sub.segment])
                            : sub.label;
                          return (
                            <li key={sub.segment}>
                              <SubRow
                                href={subHref}
                                label={subLabel}
                                active={subActive}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — BF defaults, translated */}
      <div className="border-t border-[var(--allonce-line-soft)] px-2 py-3">
        <ul className="space-y-0.5">
          {tourismFooter.map((item) => {
            const label = FOOTER_KEY[item.href]
              ? t(FOOTER_KEY[item.href])
              : item.label;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[var(--radius-xs)] px-3 py-1.5 text-[13px] transition ${
                    matchesItem(item.href)
                      ? "bg-[var(--bg-sunken)] text-[var(--ink-900)] font-medium"
                      : "text-[var(--ink-700)] hover:bg-[var(--bg-app)] hover:text-[var(--ink-900)]"
                  }`}
                >
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
