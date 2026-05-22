"use client";

import Link from "next/link";
import { AllOnceLogo } from "../AllOnceLogo";
import { NotificationsMenu } from "./NotificationsMenu";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

interface AppTopbarProps {
  breadcrumb?: Array<{ label: string; href?: string }>;
  chatOpen?: boolean;
  onToggleChat?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  hideChatToggle?: boolean;
  /** Collapse the entire topbar (e.g. for the designer canvas). */
  onCollapseTopbar?: () => void;
  /** Compact controls for narrow viewports. */
  isMobile?: boolean;
}

export function AppTopbar({
  breadcrumb = [],
  chatOpen = false,
  onToggleChat,
  sidebarOpen = true,
  onToggleSidebar,
  hideChatToggle = false,
  onCollapseTopbar,
  isMobile = false,
}: AppTopbarProps) {
  function openPalette() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("allonce.openPalette"));
    }
  }

  return (
    <header className="relative flex h-14 items-center justify-between rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] shadow-[var(--shadow-sm)] px-3 sm:px-5">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            title={sidebarOpen ? "Hide sidebar · ⌘\\" : "Show sidebar · ⌘\\"}
            onClick={onToggleSidebar}
            className="group inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--ink-700)]"
          >
            {isMobile ? (
              // hamburger
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.7, transition: "opacity 180ms ease" }}
                className="group-hover:!opacity-100"
              >
                {sidebarOpen ? (
                  <path d="M15 6l-6 6 6 6" />
                ) : (
                  <path d="M9 6l6 6-6 6" />
                )}
              </svg>
            )}
          </button>
        )}
        <Link href="/app" className="flex items-center pr-1">
          <AllOnceLogo size="lg" variant="mark" />
        </Link>

        {breadcrumb.length > 0 && (
          <>
            <span className="hidden h-4 w-px bg-[var(--allonce-line)] sm:inline-block" />
            <nav
              aria-label="breadcrumb"
              className="hidden min-w-0 items-center gap-1.5 truncate sm:flex"
            >
              {breadcrumb.map((c, i) => (
                <span key={c.label} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="text-[var(--ink-300)]"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                  {c.href ? (
                    <Link
                      href={c.href}
                      className="text-[13.5px] text-[var(--ink-900)] transition hover:text-[var(--ink-900)]"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-[13.5px] font-medium text-[var(--ink-900)]">
                      {c.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Search"
          onClick={openPalette}
          className="flex h-8 items-center gap-2.5 rounded-full bg-white px-3.5 text-[13px] text-[var(--ink-900)] transition hover:text-[var(--ink-900)]"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded bg-[var(--bg-sunken)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-700)] sm:inline-block">
            ⌘K
          </kbd>
        </button>

        {!hideChatToggle && (
          <button
            type="button"
            aria-label={chatOpen ? "Hide chat" : "Show chat"}
            title="Chat · ⌘/"
            onClick={onToggleChat}
            data-chat-pill
            data-state={chatOpen ? "open" : "closed"}
            className="relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="hidden font-medium sm:inline">Chat</span>
            <kbd
              data-chat-pill-kbd
              className="hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline-block"
            >
              ⌘/
            </kbd>
          </button>
        )}

        <LanguageToggle />
        <ThemeToggle />
        <div className="hidden sm:flex sm:items-center sm:gap-2">
          <NotificationsMenu />
          <AccountMenu />
        </div>
        <div className="flex items-center sm:hidden">
          <AccountMenu />
        </div>
      </div>

      {/* Collapse handle — minimal drawer-pull, fixed size, subtle opacity
          shift on hover only. No size jump, no colour swap. */}
      {onCollapseTopbar && (
        <button
          type="button"
          onClick={onCollapseTopbar}
          aria-label="Collapse topbar · ⌘."
          title="Collapse topbar · ⌘."
          className="absolute bottom-1.5 left-1/2 inline-block h-[2px] w-8 -translate-x-1/2 rounded-full bg-[var(--ink-500)]"
          style={{ opacity: 0.35, transition: "opacity 180ms ease" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.35";
          }}
        />
      )}
    </header>
  );
}
