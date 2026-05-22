"use client";

/**
 * Client side of the conversation page — handles the composer + scroll
 * pinning. Server component renders the message list (so we can server
 * render the bulk of the conversation); this just owns the textarea,
 * Send button state, and a post-send router refresh.
 */
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/app/lib/i18n/useLocale";
import { toast } from "@/app/components/app/Toast";

export function Composer({
  threadId,
  canSend,
}: {
  threadId: number;
  canSend: boolean;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  async function onSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/whatsapp/send/${threadId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        const msg = j?.error?.message ?? `HTTP ${res.status}`;
        toast(`${t("whatsapp.send_error")} · ${msg}`, "err");
      } else {
        setBody("");
        router.refresh();
      }
    } catch (err) {
      toast(
        `${t("whatsapp.send_error")} · ${
          err instanceof Error ? err.message : "unknown"
        }`,
        "err",
      );
    } finally {
      setSending(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl+Enter sends; plain Enter inserts newline (matches WA web).
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void onSend();
    }
  }

  if (!canSend) {
    return (
      <div className="border-t border-[var(--allonce-line)] bg-[var(--bg-surface)] px-4 py-3 text-[12px] text-[var(--ink-500)] sm:px-6">
        {t("whatsapp.send_disabled")}
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 border-t border-[var(--allonce-line)] bg-[var(--bg-surface)] px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKey}
          placeholder={t("whatsapp.send_placeholder")}
          rows={1}
          className="min-h-[40px] max-h-40 flex-1 resize-none rounded-[12px] border border-[var(--allonce-line)] bg-[var(--bg-surface-alt)] px-3 py-2 text-[14px] text-[var(--ink-900)] outline-none focus:border-[var(--ao-accent)]"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !body.trim()}
          className="h-10 shrink-0 rounded-full bg-[var(--ink-900)] px-5 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-40"
        >
          {sending ? t("whatsapp.sending") : t("whatsapp.send")}
        </button>
      </div>
    </div>
  );
}

/**
 * Tiny status-icon helper rendered next to outbound message timestamps.
 * Pure presentational — text + color. Keeps the server-render path simple.
 */
export function StatusGlyph({ status }: { status: string | null }) {
  // status set is queued | sent | delivered | read | failed
  if (status === "failed") {
    return (
      <span className="text-rose-500" title="failed">
        ⚠
      </span>
    );
  }
  if (status === "read") {
    return (
      <span className="text-sky-500" title="read">
        ✓✓
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span className="text-[var(--ink-400)]" title="delivered">
        ✓✓
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="text-[var(--ink-400)]" title="sent">
        ✓
      </span>
    );
  }
  // queued or unknown
  return (
    <span className="text-[var(--ink-300)]" title="queued">
      ⏱
    </span>
  );
}

/**
 * Auto-scroll-to-bottom helper. Mounted at the end of the message list so
 * the page lands on the newest message instead of the top.
 */
export function AutoScrollAnchor({ messageCount }: { messageCount: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [messageCount]);
  return <div ref={ref} aria-hidden />;
}
