"use client";

import { ReactNode, useEffect, useState } from "react";
import { AppTopbar } from "./AppTopbar";
import { AppSidebar } from "./AppSidebar";
import { AppChatPane, type ChatScope } from "./AppChatPane";
import { AuthGuard } from "./AuthGuard";
import { CommandPalette } from "./CommandPalette";
import { PreferencesBoot } from "./PreferencesBoot";
import { LocaleBoot } from "./LocaleBoot";
import { ToastHost } from "./Toast";
import { TopProgressBar } from "./TopProgressBar";

interface AppShellProps {
  breadcrumb?: Array<{ label: string; href?: string }>;
  chatScope: ChatScope;
  chatScopeLabel: string;
  chatStarters?: string[];
  children: ReactNode;
  /** Hide the topbar Chat toggle (use when chat IS the page, e.g. /app/spawn). */
  hideChatToggle?: boolean;
}

const STORAGE_KEY_CHAT = "allonce.chat.open";
const STORAGE_KEY_SIDEBAR = "allonce.sidebar.open";
const STORAGE_KEY_TOPBAR = "allonce.topbar.open";

// Tailwind `md` breakpoint
const MOBILE_BREAKPOINT = "(max-width: 767px)";

export function AppShell({
  breadcrumb,
  chatScope,
  chatScopeLabel,
  chatStarters,
  children,
  hideChatToggle = false,
}: AppShellProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [topbarOpen, setTopbarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile + listen for viewport changes
    const mql = window.matchMedia(MOBILE_BREAKPOINT);
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);

    try {
      const rawChat = localStorage.getItem(STORAGE_KEY_CHAT);
      if (rawChat !== null) setChatOpen(rawChat === "true");
      const rawSidebar = localStorage.getItem(STORAGE_KEY_SIDEBAR);
      // On mobile, default sidebar closed regardless of stored desktop pref
      if (mql.matches) {
        setSidebarOpen(false);
      } else if (rawSidebar !== null) {
        setSidebarOpen(rawSidebar === "true");
      }
      const rawTopbar = localStorage.getItem(STORAGE_KEY_TOPBAR);
      if (rawTopbar !== null) setTopbarOpen(rawTopbar === "true");
    } catch {}
    setHydrated(true);

    return () => mql.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_CHAT, String(chatOpen));
      // Don't persist the mobile-forced-closed state — it would override desktop pref
      if (!isMobile) {
        localStorage.setItem(STORAGE_KEY_SIDEBAR, String(sidebarOpen));
      }
      localStorage.setItem(STORAGE_KEY_TOPBAR, String(topbarOpen));
    } catch {}
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setChatOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setTopbarOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen, sidebarOpen, topbarOpen, hydrated, isMobile]);

  // Desktop grid: optional sidebar | content | optional chat
  // Mobile grid: just content (sidebar/chat are overlays)
  const gridCols = isMobile
    ? "1fr"
    : [
        sidebarOpen ? "260px" : null,
        "1fr",
        chatOpen && !hideChatToggle ? "380px" : null,
      ]
        .filter(Boolean)
        .join(" ");

  // On mobile, chat pane uses overlay too (fullscreen when open)
  const mobileChatOpen = isMobile && chatOpen && !hideChatToggle;

  return (
    <AuthGuard>
      <div
        className="flex h-screen flex-col"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <PreferencesBoot />
        <LocaleBoot />
        <TopProgressBar />
        {/* Topbar */}
        <div
          className="relative z-50 overflow-visible"
          style={{
            maxHeight: topbarOpen ? "88px" : "0px",
            opacity: topbarOpen ? 1 : 0,
            paddingTop: topbarOpen ? 8 : 0,
            paddingLeft: 8,
            paddingRight: 8,
            pointerEvents: topbarOpen ? "auto" : "none",
            transition:
              "max-height 360ms cubic-bezier(0.32, 0.72, 0, 1), " +
              "opacity 220ms cubic-bezier(0.32, 0.72, 0, 1), " +
              "padding-top 360ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          <AppTopbar
            breadcrumb={breadcrumb}
            chatOpen={chatOpen}
            onToggleChat={
              hideChatToggle ? undefined : () => setChatOpen((v) => !v)
            }
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            hideChatToggle={hideChatToggle}
            onCollapseTopbar={() => setTopbarOpen(false)}
            isMobile={isMobile}
          />
        </div>

        {!topbarOpen && (
          <button
            type="button"
            onClick={() => setTopbarOpen(true)}
            aria-label="Show topbar · ⌘."
            title="Show topbar · ⌘."
            className="absolute left-1/2 top-1.5 z-50 inline-block h-[2px] w-8 -translate-x-1/2 rounded-full bg-[var(--ink-500)]"
            style={{ opacity: 0.35, transition: "opacity 180ms ease" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.35";
            }}
          />
        )}

        {/* Main grid */}
        <div
          className="grid flex-1 overflow-hidden gap-2 px-2 pt-2 pb-2 transition-[grid-template-columns] duration-200"
          style={{ gridTemplateColumns: gridCols }}
        >
          {/* Sidebar — desktop column OR mobile overlay drawer */}
          {sidebarOpen && !isMobile && (
            <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] shadow-[var(--shadow-sm)] overflow-hidden">
              <AppSidebar />
            </div>
          )}

          <main className="overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] shadow-[var(--shadow-sm)]">
            {children}
          </main>

          {/* Chat pane — desktop column */}
          {chatOpen && !hideChatToggle && !isMobile && (
            <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] shadow-[var(--shadow-sm)] overflow-hidden">
              <AppChatPane
                scope={chatScope}
                scopeLabel={chatScopeLabel}
                starters={chatStarters}
                onClose={() => setChatOpen(false)}
              />
            </div>
          )}
        </div>

        {/* MOBILE — sidebar as overlay drawer with backdrop */}
        {isMobile && sidebarOpen && (
          <>
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
            />
            <div className="fixed inset-y-2 left-2 z-50 w-[78vw] max-w-[300px] animate-tp-slide-in overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] shadow-[var(--shadow-lg)]">
              <AppSidebar />
            </div>
          </>
        )}

        {/* MOBILE — chat pane as fullscreen overlay */}
        {mobileChatOpen && (
          <div className="fixed inset-2 z-50 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] shadow-[var(--shadow-lg)]">
            <AppChatPane
              scope={chatScope}
              scopeLabel={chatScopeLabel}
              starters={chatStarters}
              onClose={() => setChatOpen(false)}
            />
          </div>
        )}

        <CommandPalette />
        <ToastHost />
      </div>
    </AuthGuard>
  );
}
