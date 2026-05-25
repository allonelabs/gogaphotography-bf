'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Cross-zone session check. Hits the next-auth session endpoint (which
// lives on the shell-zone but resolves on the same bf.allonelabs.com host
// so it's reachable from business-zone pages via the Vercel rewrite layer
// too). If there's no signed-in user, kick the operator to /admin/login so a
// signed-out tab can't reveal cached /app content after a refresh or a
// back-button visit. The check is idempotent across renders.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session', { cache: 'no-store', credentials: 'include' })
      .then((r) => r.json())
      .then((j: { user?: unknown } | null) => {
        if (cancelled) return;
        if (j && typeof j === 'object' && 'user' in j && j.user) setState('in');
        else setState('out');
      })
      .catch(() => {
        // If the endpoint is unreachable (offline / dev without auth wired),
        // err on the side of letting the operator through — we don't want
        // to hard-lock the dashboard on a transient network blip.
        if (!cancelled) setState('in');
      });
    return () => { cancelled = true; };
  }, [pathname]);

  useEffect(() => {
    if (state === 'out') {
      const next = encodeURIComponent(pathname ?? '/app');
      window.location.replace(`/admin/login?next=${next}`);
    }
  }, [state, pathname]);

  // While we don't yet know, render nothing — keeps cached SSR markup from
  // flashing to a signed-out user. As soon as the session resolves we either
  // render children or trigger the redirect above.
  if (state !== 'in') return null;
  return <>{children}</>;
}
