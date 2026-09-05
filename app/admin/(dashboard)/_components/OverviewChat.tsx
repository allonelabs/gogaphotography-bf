"use client";

// Tourism Home — chat-first. Adapted verbatim from BF's OverviewChat
// (deployed-snapshot-2026-05-19) with copy + starters re-scoped to a
// travel-agency operator. Empty state has the big centered greeting;
// once a conversation starts it falls into the bubble layout
// (user = soft pill, assistant = plain text). Routes to /api/chat.

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { AssistantThinking } from "@/app/components/app/AssistantThinking";
import { StreamingText } from "@/app/components/app/StreamingText";
import { useVoiceAgent } from "@/app/lib/voice/useVoiceAgent";
import { useLocale } from "@/app/lib/i18n/useLocale";
import type { TranslationKey } from "@/app/lib/i18n/dict";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface ChatAttachment {
  name: string;
  size: number;
  type: string;
  url: string;
  /** Storage path returned by /api/chat/upload (server-side reference). */
  path?: string;
}

interface OverviewChatProps {
  operatorFirstName: string;
  /** Translation keys for the starter suggestion buttons. */
  starters: TranslationKey[];
}

export function OverviewChat({
  operatorFirstName,
  starters,
}: OverviewChatProps) {
  const { t } = useLocale();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streamingSay, setStreamingSay] = useState("");
  const [streamClosed, setStreamClosed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [turns, streamingSay, pending]);

  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  const voice = useVoiceAgent({
    lang: "en-US",
    whisperLang: "en",
    onTranscript: async (text) => {
      setInput((cur) => (cur ? `${cur} ${text}` : text));
      return null;
    },
    chatHandler: async (text) => {
      try {
        const history = [
          ...turnsRef.current.map((t) => ({
            role: t.role,
            content: t.content,
          })),
          { role: "user" as const, content: text },
        ];
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as {
          text?: string;
        } | null;
        return (data?.text ?? "").trim() || null;
      } catch {
        return null;
      }
    },
    onUserTurn: (text) => {
      setTurns((prev) => [...prev, { role: "user", content: text }]);
    },
    onAssistantTurn: (text) => {
      setTurns((prev) => [...prev, { role: "assistant", content: text }]);
    },
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const next: ChatAttachment[] = [];
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        try {
          const res = await fetch("/api/chat/upload", {
            method: "POST",
            body: fd,
            credentials: "include",
          });
          const j = (await res.json().catch(() => null)) as {
            ok?: boolean;
            data?: { path: string; signedUrl: string; mimeType: string };
            error?: { message?: string };
          } | null;
          if (!j?.ok || !j.data) {
            setError(j?.error?.message ?? `Upload failed: ${f.name}`);
            continue;
          }
          next.push({
            name: f.name,
            size: f.size,
            type: f.type || j.data.mimeType,
            url: j.data.signedUrl,
            path: j.data.path,
          });
        } catch {
          setError(`Upload failed: ${f.name}`);
        }
      }
      if (next.length > 0) setAttachments((cur) => [...cur, ...next]);
    } finally {
      setUploading(false);
    }
  }
  function removeAttachment(i: number) {
    setAttachments((cur) => cur.filter((_, idx) => idx !== i));
  }

  async function send(text: string): Promise<string | null> {
    const prose = text.trim();
    if ((!prose && attachments.length === 0) || pending) return null;
    setInput("");
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const attachmentLine =
      attachments.length > 0
        ? attachments
            .map(
              (a) =>
                `[${a.type.startsWith("image/") ? "image" : "file"}: ${a.name}]`,
            )
            .join("\n")
        : "";
    const composed = [attachmentLine, prose].filter(Boolean).join("\n\n");
    // Snapshot attachments for THIS turn before clearing the composer.
    const turnAttachments = attachments
      .filter((a) => !!a.path)
      .map((a) => ({ name: a.name, type: a.type, path: a.path as string }));
    setAttachments([]);

    const nextTurns: Turn[] = [...turns, { role: "user", content: composed }];
    setTurns(nextTurns);
    setPending(true);
    setStreamingSay("");
    setStreamClosed(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextTurns.map((t) => ({
            role: t.role,
            content: t.content,
          })),
          attachments: turnAttachments,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setError(
          errText && errText.length < 300
            ? errText
            : t("errors.something_went_wrong"),
        );
        return null;
      }

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        text?: string;
        error?: string;
      } | null;
      const reply =
        (data && typeof data.text === "string" && data.text.trim()) ||
        t("errors.didnt_catch");

      setStreamingSay(reply);
      setStreamClosed(true);
      return reply;
    } catch {
      setError(t("errors.network"));
      return null;
    } finally {
      setPending(false);
    }
  }

  function finalizeAssistantReveal() {
    if (!streamingSay) return;
    setTurns((prev) => [...prev, { role: "assistant", content: streamingSay }]);
    setStreamingSay("");
    setStreamClosed(false);
  }

  const empty = turns.length === 0 && !streamingSay && !pending;

  return (
    <div className="flex h-full flex-col">
      {/* Conversation OR centered empty state */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8">
        {empty ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-8 pb-10 text-center">
            <h1
              className="text-[var(--ink-900)]"
              style={{
                fontSize: "clamp(34px, 4vw, 48px)",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {greeting()}, {operatorFirstName}.
            </h1>
            {starters.length > 0 && (
              <ul className="flex w-full max-w-md flex-col gap-1.5 text-left">
                {starters.map((key) => {
                  const label = t(key);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => send(label)}
                        disabled={pending}
                        className="group flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] leading-[1.5] text-[var(--ink-700)] transition hover:bg-[var(--bg-surface-alt)] hover:text-[var(--ink-900)] disabled:opacity-60"
                      >
                        <span className="mt-[2px] text-[var(--ink-400)] group-hover:text-[var(--ink-700)]">
                          ›
                        </span>
                        <span>{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 py-6">
            {turns.map((t, i) => (
              <Bubble key={i} turn={t} />
            ))}
            {pending && !streamingSay && (
              <div aria-label="Assistant is thinking">
                <AssistantThinking />
              </div>
            )}
            {streamingSay && (
              <div className="whitespace-pre-wrap text-[15px] leading-[1.65] text-[var(--ink-900)]">
                <StreamingText
                  text={streamingSay}
                  streaming={!streamClosed}
                  onDone={finalizeAssistantReveal}
                  charsPerSecond={32}
                />
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-black/20 bg-slate-200/70 px-4 py-3 text-[13px] text-slate-900">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-8 pb-6">
        <form
          className="mx-auto max-w-3xl"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="relative rounded-[1.625rem] border border-[var(--allonce-line)] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_4px_16px_-4px_rgba(0,0,0,0.06)]">
            {(attachments.length > 0 || uploading) && (
              <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
                {attachments.map((a, i) => (
                  <span
                    key={i}
                    title={a.name}
                    className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-[var(--allonce-line-soft)] bg-[var(--bg-surface-alt)] px-2.5 py-1 text-[11px] text-[var(--ink-900)]"
                  >
                    {/* Truncate long filenames: keep extension, ellipsize middle */}
                    <span className="truncate">
                      {a.name.length > 30 ? truncateMiddle(a.name, 30) : a.name}
                    </span>
                    <button
                      type="button"
                      aria-label={t("home.aria.remove_attachment")}
                      onClick={() => removeAttachment(i)}
                      className="text-[var(--ink-500)] hover:text-[var(--ink-900)]"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {uploading && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--allonce-line-soft)] bg-[var(--bg-surface-alt)] px-2.5 py-1 text-[11px] text-[var(--ink-500)]"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent"
                    />
                    {t("home.uploading")}
                  </span>
                )}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const ta = e.currentTarget;
                ta.style.height = "auto";
                ta.style.height = Math.min(ta.scrollHeight, 288) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={t("home.composer_placeholder")}
              rows={1}
              className="block w-full resize-none rounded-[1.625rem] bg-transparent pl-12 pr-32 pt-3.5 pb-12 text-[16px] leading-[1.5] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] no-ring outline-none disabled:opacity-60 max-h-72 overflow-y-auto"
              disabled={pending}
            />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="*/*"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />
            <button
              type="button"
              aria-label={t("home.aria.attach_files")}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-2 left-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-500)] transition hover:bg-black/[0.06] hover:text-[var(--ink-900)] disabled:opacity-50"
            >
              {uploading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              )}
            </button>

            <button
              type="button"
              aria-label={
                voice.state === "listening"
                  ? t("home.aria.stop_recording")
                  : t("home.aria.record")
              }
              onClick={() => {
                if (voice.state === "listening") voice.stopListening();
                else voice.startListening();
              }}
              className={`absolute bottom-2 right-[5.75rem] inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                voice.state === "listening"
                  ? "bg-[var(--allonce-err)] text-white"
                  : "text-[var(--ink-500)] hover:bg-black/[0.06] hover:text-[var(--ink-900)]"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
              </svg>
            </button>

            <button
              type="button"
              aria-label={
                voice.dialogueActive
                  ? t("home.aria.end_voice")
                  : t("home.aria.start_voice")
              }
              aria-pressed={voice.dialogueActive}
              onClick={() => {
                if (voice.dialogueActive) voice.endConversation();
                else void voice.startConversation();
              }}
              className={`absolute bottom-2 right-[3rem] inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                voice.dialogueActive
                  ? "bg-[var(--allonce-success)] text-white"
                  : "text-[var(--ink-500)] hover:bg-black/[0.06] hover:text-[var(--ink-900)]"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 10v4" />
                <path d="M8 6v12" />
                <path d="M12 3v18" />
                <path d="M16 6v12" />
                <path d="M20 10v4" />
              </svg>
            </button>

            <button
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || pending}
              aria-label={t("home.aria.send")}
              className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink-900)] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[var(--bg-sunken)] disabled:text-[var(--ink-400)]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-[12px] text-[var(--ink-400)]">
            {t("home.footer_disclaimer")}
          </p>
        </form>
      </div>
    </div>
  );

  function greeting(): string {
    const h = new Date().getHours();
    if (h < 5) return t("home.greeting.late_night");
    if (h < 12) return t("home.greeting.morning");
    if (h < 18) return t("home.greeting.afternoon");
    return t("home.greeting.evening");
  }
}

/**
 * Truncate a filename keeping the leading characters and the extension so the
 * user can still see what kind of file it is. e.g.
 *   `very-long-quarterly-financial-report-2026.xlsx` (30) →
 *   `very-long-quarterly-fin…2026.xlsx`
 */
function truncateMiddle(name: string, max: number): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  // No extension or hidden file like `.env` — just lop the tail.
  if (dot <= 0 || dot >= name.length - 1) {
    return name.slice(0, max - 1) + "…";
  }
  const ext = name.slice(dot); // includes the dot
  // Keep extension; budget the rest. Reserve 1 char for the ellipsis.
  const headBudget = Math.max(3, max - ext.length - 1);
  return name.slice(0, headBudget) + "…" + ext;
}

function Bubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === "user";
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(turn.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] whitespace-pre-wrap rounded-[1.5rem] bg-[var(--bg-sunken)] px-5 py-2.5 text-[15px] leading-[1.55] text-[var(--ink-900)]">
          {turn.content}
        </div>
      </div>
    );
  }
  return (
    <div className="group relative">
      <article
        className="prose prose-sm max-w-none text-[15px] leading-[1.65] text-[var(--ink-900)]
                   prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
                   prose-headings:font-medium prose-headings:tracking-[-0.012em] prose-headings:text-[var(--ink-900)]
                   prose-h1:text-[18px] prose-h2:text-[16px] prose-h3:text-[15px]
                   prose-strong:text-[var(--ink-900)] prose-strong:font-semibold
                   prose-a:text-[var(--ao-accent)] prose-a:no-underline hover:prose-a:underline
                   prose-code:rounded prose-code:bg-[var(--bg-sunken)] prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
                   prose-pre:rounded-[var(--radius-sm)] prose-pre:bg-[var(--bg-sunken)] prose-pre:text-[13px] prose-pre:text-[var(--ink-900)]
                   prose-table:text-[13px] prose-th:font-semibold prose-th:text-[var(--ink-700)] prose-td:border-b prose-td:border-[var(--allonce-line)]
                   prose-blockquote:border-l-2 prose-blockquote:border-[var(--allonce-line)] prose-blockquote:pl-3 prose-blockquote:text-[var(--ink-700)] prose-blockquote:font-normal prose-blockquote:not-italic"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words"
              >
                {children}
              </a>
            ),
          }}
        >
          {turn.content}
        </ReactMarkdown>
      </article>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy"}
        title={copied ? "Copied" : "Copy"}
        className="absolute -right-1 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--ink-400)] opacity-0 transition hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-900)] group-hover:opacity-100"
      >
        {copied ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
