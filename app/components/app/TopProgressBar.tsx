"use client";

// Top progress bar — slim 2px sliver under the topbar that appears during
// route transitions. Avoids the "page froze" feel between click and paint.
//
// App-Router has no built-in router events, so we approximate by:
//   1. patching <Link> click handlers via a global capture listener on <a>
//      tags whose href is an internal navigation,
//   2. listening for pathname/searchParams changes to fade out when the
//      destination commits.
//
// Net effect: a 150ms grace period to swallow instant cached navigations,
// then a continuous indeterminate sweep until the next page hydrates.

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SHOW_DELAY_MS = 150;

export function TopProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | null = null;

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;

      // Only internal, same-origin navigations
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Same path + same search = no nav, no progress bar
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (showTimer) clearTimeout(showTimer);
    };
  }, []);

  // When the route commits (pathname or search changes), hide the bar.
  useEffect(() => {
    setVisible(false);
  }, [pathname, search]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px] overflow-hidden"
      aria-hidden
    >
      <div
        className="ao-progress-bar h-full w-[40%]"
        style={{ background: "var(--ink-900)" }}
      />
    </div>
  );
}
