"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/app/lib/supabase/browser";

/**
 * Subscribe to one or more Postgres tables; on any INSERT/UPDATE/DELETE
 * call router.refresh() to re-render the server component above. We
 * debounce to coalesce a burst of changes into one refresh.
 *
 * Caveat: Realtime must be enabled on the project AND on each table
 * (replication set) for events to flow. If it isn't, this hook silently
 * never fires — no breakage.
 */
export function useRealtimeRefresh(tables: string[], debounceMs = 400) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let sb;
    try {
      sb = browserSupabase();
    } catch {
      return; // env vars missing — skip silently
    }
    const channel = sb.channel(`realtime-refresh-${tables.join(",")}`);
    for (const t of tables) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (channel as any).on(
        "postgres_changes",
        { event: "*", schema: "public", table: t },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            router.refresh();
          }, debounceMs);
        },
      );
    }
    channel.subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(","), debounceMs]);
}

/**
 * Drop into any server-rendered list page as a sibling client component
 * to enable live updates. Renders nothing.
 */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  useRealtimeRefresh(tables);
  return null;
}
