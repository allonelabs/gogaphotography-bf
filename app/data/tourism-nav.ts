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
  top: { label: "Home", href: "/admin", icon: "home" },
  sections: [
    {
      label: "Pipeline",
      items: [
        {
          label: "Dashboard",
          labelKa: "მთავარი",
          href: "/admin/dashboard",
          icon: "layout-dashboard",
        },
        {
          label: "Leads",
          labelKa: "კლიენტები",
          href: "/admin/leads",
          icon: "users",
        },
        {
          label: "Bookings",
          labelKa: "ჯავშნები",
          href: "/admin/bookings",
          icon: "book",
        },
        {
          label: "Calendar",
          labelKa: "კალენდარი",
          href: "/admin/calendar",
          icon: "calendar",
        },
        {
          label: "Contracts",
          labelKa: "ხელშეკრულებები",
          href: "/admin/contracts",
          icon: "scroll-text",
        },
        {
          label: "Deliveries",
          labelKa: "მიწოდებები",
          href: "/admin/deliveries",
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
          href: "/admin/packages",
          icon: "tag",
        },
        {
          label: "Projects",
          labelKa: "პროექტები",
          href: "/admin/projects",
          icon: "camera",
        },
        {
          label: "Services",
          labelKa: "სერვისები",
          href: "/admin/services",
          icon: "grid",
        },
        {
          label: "Store",
          labelKa: "მაღაზია",
          href: "/admin/store",
          icon: "shopping-bag",
        },
      ],
    },
    {
      label: "Site",
      items: [
        { label: "Homepage hero", href: "/admin/hero", icon: "sparkles" },
        {
          label: "Blog",
          labelKa: "ბლოგი",
          href: "/admin/blog",
          icon: "pen-tool",
        },
        {
          label: "Pinterest",
          labelKa: "Pinterest",
          href: "/admin/pinterest",
          icon: "share-2",
        },
        {
          label: "Pages",
          labelKa: "გვერდები",
          href: "/admin/pages",
          icon: "file-text",
        },
        {
          label: "Studio info",
          labelKa: "სტუდიის ინფო",
          href: "/admin/studio",
          icon: "user",
        },
      ],
    },
    {
      label: "Inbox",
      items: [
        {
          label: "Messages",
          labelKa: "მესიჯები",
          href: "/admin/messages",
          icon: "message-circle",
        },
        { label: "Contact form", href: "/admin/contact", icon: "mail" },
        { label: "Chatbot", href: "/admin/chatbot", icon: "bot" },
      ],
    },
    {
      label: "System",
      items: [
        {
          label: "Audit",
          labelKa: "აუდიტი",
          href: "/admin/audit",
          icon: "clipboard-list",
        },
      ],
    },
  ],
};

/**
 * Footer items. The BF multi-tenant routes (Organization, Billing) were
 * stripped — single-tenant photographer admin doesn't need them.
 */
export const tourismFooter: Array<{
  label: string;
  href: string;
  icon?: string;
}> = [
  { label: "Account", href: "/admin/account", icon: "user" },
  { label: "Help", href: "/admin/help", icon: "help-circle" },
];
