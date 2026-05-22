import type { ComponentType, SVGProps } from "react";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItem {
  /** Display label (Latin) */
  label: string;
  /** Optional Georgian label, rendered as secondary line in tooltip / collapsed views */
  labelKa?: string;
  /** Route — used for active matching */
  href: string;
  /** Lucide icon name (resolved in AppSidebar.tsx) */
  icon: string;
  /** Live row count, optional — rendered as mono badge on the right */
  count?: number | null;
  /** Sub-entities — shown indented when this item's route prefix is active */
  subEntities?: { label: string; segment: string }[];
}

export interface NavSection {
  /** Section header label (uppercase in UI) */
  label: string;
  items: NavItem[];
}

export interface NavConfig {
  /** Single top item — Home/dashboard */
  top: NavItem;
  sections: NavSection[];
}

/**
 * Photographer-studio nav. Symbol name kept as `tourismNav` so AppSidebar.tsx
 * works without modification — only the data is swapped. (This is the same
 * pattern travelplace-bf used when it forked BF.)
 */
export const tourismNav: NavConfig = {
  top: { label: "Home", href: "/app", icon: "home" },
  sections: [
    {
      label: "Pipeline",
      items: [
        {
          label: "Leads",
          labelKa: "კლიენტები",
          href: "/app/leads",
          icon: "users",
        },
        {
          label: "Bookings",
          labelKa: "ჯავშნები",
          href: "/app/bookings",
          icon: "book",
        },
        {
          label: "Calendar",
          labelKa: "კალენდარი",
          href: "/app/calendar",
          icon: "calendar",
        },
        {
          label: "Contracts",
          labelKa: "ხელშეკრულებები",
          href: "/app/contracts",
          icon: "scroll-text",
        },
        {
          label: "Deliveries",
          labelKa: "მიწოდებები",
          href: "/app/deliveries",
          icon: "image",
        },
      ],
    },
    {
      label: "Catalog",
      items: [
        {
          label: "Packages",
          labelKa: "პაკეტები",
          href: "/app/packages",
          icon: "tag",
        },
        {
          label: "Projects",
          labelKa: "პროექტები",
          href: "/app/projects",
          icon: "camera",
        },
        {
          label: "Services",
          labelKa: "სერვისები",
          href: "/app/services",
          icon: "grid",
        },
      ],
    },
    {
      label: "Site",
      items: [
        { label: "Homepage hero", href: "/app/hero", icon: "sparkles" },
        {
          label: "Pages",
          labelKa: "გვერდები",
          href: "/app/pages",
          icon: "file-text",
        },
      ],
    },
    {
      label: "Inbox",
      items: [
        { label: "Contact form", href: "/app/contact", icon: "mail" },
        { label: "Chatbot", href: "/app/chatbot", icon: "bot" },
      ],
    },
  ],
};

/** Footer items — preserved verbatim. */
export const tourismFooter = [
  { label: "Account", href: "/app/account" },
  { label: "Organization", href: "/app/organization" },
  { label: "Billing", href: "/app/billing" },
  { label: "Help", href: "/app/help" },
];
