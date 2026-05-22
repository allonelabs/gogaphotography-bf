"use client";

import { useEffect, useRef, useState } from "react";

interface ChatAttachment {
  name: string;
  size: number;
  type: string;
  url: string;
}
import dynamic from "next/dynamic";

import type { AdConfig } from "@/app/lib/ad-config";
import { useVoiceAgent } from "@/app/lib/voice/useVoiceAgent";
import { AssistantThinking } from "./AssistantThinking";
import { StreamingText } from "./StreamingText";

// Sentinel text used to mark the placeholder system message inserted while
// /api/chat is in flight. Detected in render to swap in <AssistantThinking />
// (the multi-state labeled indicator) instead of the literal "Thinking…"
// string.
const THINKING_SENTINEL = "Thinking…";

// Live ad preview is heavy (Remotion player + composition) — load it on
// demand only when a generate-ad action lands in this chat session.
const AdChatPreview = dynamic(
  () => import("./AdChatPreview").then((m) => m.AdChatPreview),
  { ssr: false, loading: () => <div className="h-32 rounded-md bg-black/5" /> },
);

export interface ChatScope {
  level: "org" | "business" | "tool" | "artifact";
  org?: string;
  business?: string;
  tool?: string;
  artifact?: string;
}

interface AppChatPaneProps {
  scope: ChatScope;
  scopeLabel: string;
  starters?: string[];
  onClose?: () => void;
}

// ── Edit API types ──────────────────────────────────────────────────────
// Matches the shapes returned by /api/edit/preview and /api/edit/apply.

interface PreviewDiffItem {
  cellRef: string;
  diffText: string;
  summary: string;
}

interface PreviewResponse {
  resolvedCellRefs?: string[];
  previewedCellRefs?: string[];
  overflowCellCount?: number;
  editDirective?: string;
  kind?: "data" | "structural";
  confidence?: number;
  rationale?: string;
  diffs?: PreviewDiffItem[];
  costEstimateUsd?: number;
  error?: string;
}

interface ApplyResponse {
  appliedCellRefs?: string[];
  skippedCellRefs?: string[];
  skipDetails?: Array<{ cellRef: string; reason: string }>;
  materializations?: Array<{
    cellRef: string;
    found: boolean;
    modifiedPaths: readonly string[];
    error?: string;
  }>;
  structuralResults?: Array<{
    cellRef: string;
    prUrl?: string;
    prNumber?: number;
    error?: string;
  }>;
  error?: string;
}

interface EmailStylerProposal {
  rationale: string;
  themeOverride: unknown | null;
  nextBodyMd: string | null;
  nextSubject: string | null;
}

interface TeamEditProposal {
  target: "course" | "lesson" | "slide";
  lessonId?: string;
  slideId?: string;
  field: "title" | "summary" | "audience" | "body" | "kind";
  newValue: string;
  rationale: string;
  noChange?: boolean;
}

interface AutomationEditProposal {
  target: "workflow";
  workflowId: string;
  intent:
    | "rename"
    | "set-description"
    | "set-cap"
    | "pause"
    | "resume"
    | "delete";
  newValue?: string | number;
  rationale: string;
  noChange?: boolean;
}

interface SocialEditProposal {
  target: "post" | "account" | "campaign";
  intent:
    | "compose"
    | "schedule"
    | "archive"
    | "pause"
    | "resume"
    | "set-caption"
    | "set-hashtags"
    | "set-campaign-goal";
  targetId?: string;
  newValue?: string | number;
  platforms?: readonly string[];
  rationale: string;
  noChange?: boolean;
}

interface Message {
  role: "user" | "system" | "assistant";
  text: string;
  at: string;
  /** True when this message text just landed and should be revealed
   *  via the ChatGPT-cadence typewriter (StreamingText). Flipped false
   *  by the StreamingText onDone callback so the same message renders
   *  as static text on subsequent re-renders. */
  streaming?: boolean;
  preview?: PreviewResponse;
  previewStatus?: "idle" | "applying" | "applied" | "error";
  applyResult?: ApplyResponse;
  /** Email-template styler proposal (only set in email-template scope). */
  stylerProposal?: EmailStylerProposal;
  stylerApplied?: boolean;
  /** Team-LMS edit proposal (only set in academy-forge scope). */
  teamProposal?: TeamEditProposal;
  teamCourseId?: string;
  teamApplied?: boolean;
  /** Automation edit proposal (only set in automation-forge scope). */
  automationProposal?: AutomationEditProposal;
  automationApplied?: boolean;
  /** Social-forge edit proposal (only set in social-forge scope). */
  socialProposal?: SocialEditProposal;
  socialApplied?: boolean;
  /** Video-editor proposal (only set in video-editor sub-scope, heavy actions). */
  videoAction?: { kind: string; [k: string]: unknown };
  /** Help-command response — list of example phrases the operator can try. */
  helpEntries?: Array<{ phrase: string; description: string }>;
  /** list-renders response — past render jobs from the spawn's history. */
  rendersList?: Array<{
    id: string;
    status: string;
    outputFile?: string;
    finishedAt?: string;
    bytes?: number;
    error?: string;
    width?: number;
    height?: number;
  }>;
  /** list-locks response — pinned character + style labels on the project. */
  locksList?: { characters: string[]; styles: string[] };
  videoPreview?: {
    config?: AdConfig;
    durationFrames?: number;
    scriptHint?: string;
  };
  videoApplied?: boolean;
  /** Set when Run is clicked; correlates the bf:video-result event back to this message. */
  videoActionId?: string;
  /** Progress state — 'pending' between Run and result, then one of the outcomes. */
  videoStatus?: "pending" | "applied" | "queued" | "rendered" | "failed";
  videoOutputFile?: string;
  videoError?: string;
  rating?: "up" | "down";
}

function nowHHMM(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Sub-scope shape published by editors via window.__bfSubScope + the
// 'bf:subscope' custom event. Lets the chat know which sub-page or
// sub-element the operator is currently editing — and route prose to
// the right specialized endpoint instead of the generic narrative-edit.
interface SubScope {
  surface: string; // 'logo' | 'tokens' | 'voice' | …
  detail?: string; // e.g. frame name, route path, selected token
  context?: Record<string, unknown>;
}

// Persistence key + caps. Chat history survives F5 so iterative-refinement
// chains aren't lost. Heavy AdConfig is stripped from videoPreview before
// persist (~30KB per ad preview × 30 messages = 900KB hits quotas) — only
// durationFrames + scriptHint kept for display, config re-derives on next
// generate-ad. videoAction is kept (lightweight) so refinement still works.
const PERSIST_VERSION = 2;
const PERSIST_MESSAGE_CAP = 30;
function persistKey(
  business: string | undefined,
  _surface: string | undefined,
): string | null {
  // 2026-05-14 — drop the surface suffix so a single chat thread follows
  // the operator across every sub-surface of a business (website → shop →
  // brand → settings, etc.).  The backend already receives scope.tool /
  // scope.level from the request so it knows which tools to expose; the
  // thread doesn't need to fork per surface.
  if (!business) return `bf-chat-v${PERSIST_VERSION}-org`;
  return `bf-chat-v${PERSIST_VERSION}-${business}`;
}
function stripHeavy(messages: Message[]): Message[] {
  return messages.slice(-PERSIST_MESSAGE_CAP).map((m) => {
    if (!m.videoPreview?.config) return m;
    const { config: _config, ...lightPreview } = m.videoPreview;
    void _config;
    return { ...m, videoPreview: lightPreview };
  });
}

// Translate internal forge slugs + URL-path scope labels into Apple-style
// plain English. 2026-05-14 — operator reported chat headers showing raw
// path jargon like "account/api-keys", "settings/brand", "settings/team".
const FORGE_SLUG_FRIENDLY: Record<string, string> = {
  "site-forge": "Website",
  "ecom-forge": "Shop",
  "brand-forge": "Brand",
  "email-forge": "Mail",
  "legal-forge": "Legal",
  "automation-forge": "Automations",
  "social-forge": "Social",
  "academy-forge": "Team",
  "content-forge": "Content",
  "content-factory": "Content",
  "app-forge": "App",
  "analytics-forge": "Analytics",
  "customer-forge": "Customers",
  "financial-forge": "Financial",
  "infrastructure-forge": "Infrastructure",
};

// URL-path leaf → premium label.  Covers the per-business settings pages
// and the account/* / organization/* trees.
const PATH_LEAF_FRIENDLY: Record<string, string> = {
  identity: "Identity",
  brand: "Brand",
  team: "Team",
  billing: "Billing",
  integrations: "Integrations",
  domain: "Domain",
  danger: "Danger zone",
  security: "Security",
  preferences: "Preferences",
  profile: "Profile",
  "api-keys": "API keys",
  members: "Members",
  roles: "Roles",
  audit: "Audit log",
  webhooks: "Webhooks",
  tools: "Tools",
  artifacts: "Artifacts",
  inbox: "Inbox",
  cells: "Elements",
  crm: "CRM",
  customers: "Customers",
  social: "Social",
  content: "Content",
  mails: "Mail",
  shop: "Shop",
  website: "Website",
  analytics: "Analytics",
  financial: "Financial",
  automations: "Automations",
  legal: "Legal",
  spawn: "Launch",
  "not-found": "Not found",
};

function prettifyOnePart(p: string): string {
  if (FORGE_SLUG_FRIENDLY[p]) return FORGE_SLUG_FRIENDLY[p]!;
  // If it looks like a URL path (contains '/'), take the last segment + map.
  if (p.includes("/")) {
    const seg = p.split("/").filter(Boolean).pop() ?? p;
    if (PATH_LEAF_FRIENDLY[seg]) return PATH_LEAF_FRIENDLY[seg]!;
    // Title-case the leaf segment as a fallback.
    return seg.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (PATH_LEAF_FRIENDLY[p]) return PATH_LEAF_FRIENDLY[p]!;
  return p;
}

function prettifyScopeLabel(raw: string): string {
  if (!raw) return raw;
  if (FORGE_SLUG_FRIENDLY[raw]) return FORGE_SLUG_FRIENDLY[raw]!;
  if (PATH_LEAF_FRIENDLY[raw]) return PATH_LEAF_FRIENDLY[raw]!;
  const parts = raw.split(" · ");
  return parts.map(prettifyOnePart).join(" · ");
}

export function AppChatPane({
  scope,
  scopeLabel: rawScopeLabel,
  starters = [],
  onClose,
}: AppChatPaneProps) {
  const scopeLabel = prettifyScopeLabel(rawScopeLabel);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [subScope, setSubScope] = useState<SubScope | null>(null);
  // Chat file-upload (paperclip).  Attachments prefix the message text on
  // send so the LLM sees them, then clear.
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [lastVoiceReply, setLastVoiceReply] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Autoscroll to the latest message when the list grows or the assistant
  // streams new text. Without this, longer chats hide new replies below the
  // fold.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Use rAF so the scroll happens after layout settles (avoids fighting
    // StreamingText's per-frame updates).
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);
  const voiceDialogueRef = useRef(false);
  const voiceReplyResolverRef = useRef<((text: string) => void) | null>(null);

  const voice = useVoiceAgent({
    lang: "en-US",
    whisperLang: "en",
    onTranscript: async (text) => {
      if (voiceDialogueRef.current) {
        const replyPromise = new Promise<string>((resolve) => {
          voiceReplyResolverRef.current = resolve;
        });
        void submit(text);
        const reply = await Promise.race([
          replyPromise,
          new Promise<string>((r) => setTimeout(() => r(""), 60_000)),
        ]);
        voiceReplyResolverRef.current = null;
        if (reply) setLastVoiceReply(reply);
        return reply || null;
      }
      // Push-to-talk: drop transcript into the textarea so operator can edit/send
      setInput((cur) => (cur ? `${cur} ${text}` : text));
      return null;
    },
  });
  voiceDialogueRef.current = voice.dialogueActive;

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (last.role === "user") return;
    if (last.streaming) return;
    if (last.text === THINKING_SENTINEL) return;
    if (voiceReplyResolverRef.current) {
      voiceReplyResolverRef.current(last.text);
      voiceReplyResolverRef.current = null;
    }
  }, [messages]);

  function copyMessage(idx: number, text: string) {
    void navigator.clipboard.writeText(text).then(
      () => {
        setCopiedIdx(idx);
        window.setTimeout(
          () => setCopiedIdx((c) => (c === idx ? null : c)),
          1400,
        );
      },
      () => {},
    );
  }

  function rateMessage(idx: number, rating: "up" | "down") {
    setMessages((curr) => {
      const next = [...curr];
      const m = next[idx];
      if (!m) return curr;
      next[idx] = { ...m, rating: m.rating === rating ? undefined : rating };
      return next;
    });
  }

  function regenerateMessage(idx: number) {
    if (busy) return;
    let userText = "";
    for (let j = idx - 1; j >= 0; j--) {
      if (messages[j]?.role === "user") {
        userText = messages[j]!.text;
        break;
      }
    }
    if (!userText) return;
    void submit(userText);
  }

  async function handleFilePicked(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files ?? []);
    ev.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        if (scope.business) fd.append("businessId", scope.business);
        const r = await fetch("/api/chat-upload", { method: "POST", body: fd });
        const body = (await r.json().catch(() => ({}))) as {
          ok?: boolean;
          url?: string;
          name?: string;
          size?: number;
          type?: string;
          error?: string;
        };
        if (!r.ok || !body.ok || !body.url) {
          setMessages((m) => [
            ...m,
            {
              role: "system",
              text: `Couldn't attach ${f.name}: ${body.error ?? `HTTP ${r.status}`}`,
              at: nowHHMM(),
              previewStatus: "idle",
            },
          ]);
          continue;
        }
        setAttachments((a) => [
          ...a,
          {
            name: body.name ?? f.name,
            size: body.size ?? f.size,
            type: body.type ?? f.type,
            url: body.url!,
          },
        ]);
      }
    } finally {
      setUploading(false);
    }
  }

  // Restore chat history on mount / scope change. Re-runs when subScope
  // changes so switching tabs doesn't bleed state across surfaces.
  useEffect(() => {
    const key = persistKey(scope.business, subScope?.surface);
    if (!key) {
      setMessages([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setMessages([]);
        return;
      }
      const parsed = JSON.parse(raw) as { v: number; messages: Message[] };
      if (parsed?.v === PERSIST_VERSION && Array.isArray(parsed.messages)) {
        setMessages(parsed.messages);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [scope.business, subScope?.surface]);

  // Persist on every messages change. Debounce-free — setItem is sync but
  // cheap on stripped payloads (≤30 messages × ≤2KB after stripHeavy).
  useEffect(() => {
    const key = persistKey(scope.business, subScope?.surface);
    if (!key) return;
    try {
      if (messages.length === 0) {
        window.localStorage.removeItem(key);
      } else {
        const payload = JSON.stringify({
          v: PERSIST_VERSION,
          messages: stripHeavy(messages),
        });
        window.localStorage.setItem(key, payload);
      }
    } catch {
      // Quota exceeded or storage disabled — fail open. Chat still works
      // in-session, just won't survive reload.
    }
  }, [messages, scope.business, subScope?.surface]);

  // Subscribe to editor scope updates. Editors set window.__bfSubScope =
  // { surface, detail, context } and dispatch a 'bf:subscope' event each
  // time the operator changes sub-page or selection.
  useEffect(() => {
    const initial =
      (window as unknown as { __bfSubScope?: SubScope }).__bfSubScope ?? null;
    setSubScope(initial);
    function onScope(e: Event) {
      const detail = (e as CustomEvent<SubScope | null>).detail;
      setSubScope(detail ?? null);
    }
    window.addEventListener("bf:subscope", onScope);
    return () => window.removeEventListener("bf:subscope", onScope);
  }, []);

  const defaultStarters: Record<ChatScope["level"], string[]> = {
    org: [
      "Summarize health across all my businesses",
      "Which business has the most unresolved proposals?",
    ],
    business: [
      "Make the hero more formal",
      "Shorten the about section",
      "Warmer tone on the FAQ",
    ],
    tool: ["Tighten the outputs", "Shorter copy"],
    artifact: ["Make it agile", "Shorter", "Warmer tone"],
  };

  // Video-editor subscope gets its own starter set so operators discover the
  // chat's vocabulary without typing into the void. Beats the generic
  // 'Make the hero more formal' suggestions when the video timeline is open.
  const videoEditorStarters: string[] = [
    "Generate an ad from my brand",
    "Insert stock of mountains",
    "Use the explainer template",
    "Razor at playhead",
    "Add audio track",
    "Render",
    "help",
  ];
  const isVideoEditorSubScopeForStarters =
    subScope?.surface === "video-editor" && scope.business !== undefined;
  const suggestions = isVideoEditorSubScopeForStarters
    ? videoEditorStarters
    : starters.length
      ? starters
      : defaultStarters[scope.level];
  // Edit API lives at the business level; tool + artifact scopes ride the
  // same endpoint but pre-seed the anchor so resolveEditIntent narrows to
  // that slug. Only the org scope has no edit semantics today.
  const editable =
    (scope.level === "business" ||
      scope.level === "tool" ||
      scope.level === "artifact") &&
    scope.business !== undefined;
  const anchor: string | undefined =
    scope.level === "tool"
      ? scope.tool
      : scope.level === "artifact"
        ? scope.artifact
        : undefined;

  // Email-template scope routes through the email styler instead of the
  // generic edit-intent resolver — the seed templates aren't yet wired into
  // the cellRecord pipeline (follow-up slice). The styler returns a proposal
  // the editor (rendered as a sibling) can apply via window event.
  const isEmailTemplateScope =
    scope.tool === "email-forge" &&
    typeof scope.artifact === "string" &&
    scope.artifact.length > 0;

  // Academy/Team scope: route prose through the team-edit composer at
  // /api/team/edit. Returns a structured proposal (course/lesson/slide
  // field change) the operator confirms; apply writes through the
  // existing course cell.
  const isTeamScope =
    scope.tool === "academy-forge" && scope.business !== undefined;

  // Automation scope: route prose through the automation-edit composer
  // at /api/automation/edit. Returns a workflow-level proposal
  // (rename / set-description / set-cap / pause / resume / delete).
  const isAutomationScope =
    scope.tool === "automation-forge" && scope.business !== undefined;
  // Social-forge scope routes prose through the social-edit composer at
  // /api/social/edit. Returns a structured proposal (post / account /
  // campaign) the operator confirms; apply patches the corresponding cell.
  const isSocialScope =
    scope.tool === "social-forge" && scope.business !== undefined;

  // Logo sub-scope: editors set window.__bfSubScope.surface === 'logo'
  // when on the LOGO tab. Prose is routed to /api/brand/[id]/logo/chat
  // (deterministic shape patcher), bypassing the cell-pipeline.
  const isLogoSubScope =
    subScope?.surface === "logo" && scope.business !== undefined;

  // Video-editor sub-scope: EditorTab publishes 'video-editor' surface
  // while the operator is editing the timeline. Prose is routed to
  // /api/spawn/[id]/site/video-chat which classifies it into a typed
  // action (insert-stock, generate-seedance, generate-ad, razor, …).
  // The editor listens for `bf:video-applied` to perform the action.
  const isVideoEditorSubScope =
    subScope?.surface === "video-editor" && scope.business !== undefined;

  async function submit(text: string) {
    const prose = text.trim();
    if ((!prose && attachments.length === 0) || busy) return;
    setInput("");
    const attachmentText =
      attachments.length > 0
        ? attachments
            .map(
              (a) =>
                `[${a.type.startsWith("image/") ? "image" : "file"}: ${a.name} — ${a.url}]`,
            )
            .join("\n")
        : "";
    const composed = [attachmentText, prose].filter(Boolean).join("\n\n");
    setAttachments([]);

    const userMsg: Message = { role: "user", text: composed, at: nowHHMM() };
    setMessages((m) => [...m, userMsg]);

    // ALL chat scopes (org, business, tool, artifact) route to /api/chat
    // for the general LLM-backed conversation. The edit-loop's intent
    // matching is unreliable in practice ("why is there only one page,
    // add more" matched "add" → empty cells → "Nothing to change for
    // that scope") and the operator deserves a real answer regardless.
    // Future: surface an explicit "Apply edit" button when the LLM's
    // response is itself a structural mutation suggestion.
    if (true) {
      setBusy(true);
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text: "Thinking…",
          at: nowHHMM(),
          previewStatus: "idle",
        },
      ]);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scope: scope.level,
            business: scope.business,
            messages: [...messages, userMsg].map((mm) => ({
              role: mm.role === "user" ? "user" : "assistant",
              content: mm.text,
            })),
          }),
        });
        const data = await res.json();
        // Per chunks 100-108: response can be {kind:'text'|'tool_use'|'tool_executed', ...}.
        // For 'tool_executed' append a compact footer summarizing what the tool did so
        // the operator sees the visible artifacts alongside the model's reply.
        let reply =
          data && typeof data.text === "string" ? data.text : "No reply.";
        if (data && data.kind === "tool_executed" && data.execution) {
          const exec = data.execution as {
            ok?: boolean;
            summary?: string;
            artifacts?: Array<{ path: string; bytes: number; kind: string }>;
            persistence?: "tmp" | "disk";
            note?: string;
          };
          const tool = typeof data.tool === "string" ? data.tool : "tool";
          const artifactBits = (exec.artifacts ?? [])
            .slice(0, 5)
            .map((a) => `${a.path} (${(a.bytes / 1024).toFixed(1)}KB)`)
            .join(", ");
          const footer = [
            `\n\n— ran ${tool} ${exec.ok ? "✓" : "✗"}${exec.persistence === "tmp" ? " [ephemeral /tmp]" : ""}`,
            exec.summary ? `  ${exec.summary}` : null,
            artifactBits ? `  artifacts: ${artifactBits}` : null,
            exec.note ? `  ${exec.note}` : null,
          ]
            .filter(Boolean)
            .join("\n");
          reply = reply + footer;
        } else if (data && data.kind === "tool_use") {
          // Tool intent surfaced but execution path not wired from this scope.
          // Keep the model's text and add a hint.
          reply =
            reply +
            `\n\n— model wanted to call ${data.tool} but execution didn't run.`;
        } else if (
          data &&
          data.kind === "text" &&
          data.toolsAvailable === false &&
          data.toolsUnavailableReason === "no-anthropic-key"
        ) {
          // Honest signal (chunk 124): operator is on a business and asked
          // for hands-on action but ANTHROPIC_API_KEY isn't set, so the
          // chat fell back to plain text via Gemini/Groq. Tell them — silent
          // degrade is a lie about what just happened.
          reply =
            reply +
            `\n\n— tool-use unavailable (ANTHROPIC_API_KEY not set; reply came from ${typeof data.provider === "string" ? data.provider : "fallback"} as plain text)`;
        }
        setMessages((m) => {
          const next = [...m];
          // replace the trailing thinking placeholder with the assistant
          // reply; mark streaming:true so the bubble reveals char-by-char
          // via StreamingText, then onDone flips streaming back to false.
          for (let i = next.length - 1; i >= 0; i--) {
            if (
              next[i]?.role === "system" &&
              next[i]?.text === THINKING_SENTINEL
            ) {
              next[i] = {
                role: "assistant",
                text: reply,
                at: nowHHMM(),
                previewStatus: "idle",
                streaming: true,
              };
              return next;
            }
          }
          next.push({
            role: "assistant",
            text: reply,
            at: nowHHMM(),
            previewStatus: "idle",
            streaming: true,
          });
          return next;
        });
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            role: "system",
            text: `Chat failed: ${err instanceof Error ? err.message : String(err)}`,
            at: nowHHMM(),
            previewStatus: "idle",
          },
        ]);
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    const thinkingIdx = messages.length + 1; // position where the response will land
    setMessages((m) => [
      ...m,
      {
        role: "system",
        text: isEmailTemplateScope
          ? "Asking the email styler…"
          : "Resolving edit intent…",
        at: nowHHMM(),
        previewStatus: "idle",
      },
    ]);

    if (isLogoSubScope) {
      try {
        const liveFrame = (window as unknown as { __bfLogoFrame?: unknown })
          .__bfLogoFrame;
        const livePaths =
          (window as unknown as { __bfFlatPaths?: string[] }).__bfFlatPaths ??
          [];
        const res = await fetch(`/api/brand/${scope.business}/logo/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prose,
            frameId: subScope?.detail ?? "primary",
            frame: liveFrame,
            flatPaths: livePaths,
          }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          nextFrame?: unknown;
          explanation?: string;
          error?: string;
        };
        if (json.nextFrame) {
          // Editor listens for this and merges back into its frames state.
          window.dispatchEvent(
            new CustomEvent("bf:logo-applied", { detail: json.nextFrame }),
          );
        }
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text: json.error
              ? `Logo edit failed: ${json.error}`
              : (json.explanation ?? "Done."),
            previewStatus: json.nextFrame ? "applied" : "idle",
          };
          return copy;
        });
      } catch (err) {
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text: `Logo chat failed: ${(err as Error).message}`,
            previewStatus: "error",
          };
          return copy;
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isVideoEditorSubScope) {
      try {
        const live = (
          window as unknown as {
            __bfVideoEditor?: {
              activeProjectId: string | null;
              playhead: number;
              selection: Array<{ trackId: string; clipId: string }>;
              selectedTrackKind?: "video" | "audio" | "text";
              project?: {
                lockedCharacters?: Array<{ label: string }>;
                lockedStyles?: Array<{ label: string }>;
              } | null;
            };
          }
        ).__bfVideoEditor;
        // Slice 76: ship locked-asset labels so the Claude composer
        // fallback can resolve "match the spokesperson" / "use the
        // cinematic vibe" by looking up labels in the project.
        const lockedCharacters = (live?.project?.lockedCharacters ?? [])
          .map((c) => c.label)
          .filter(Boolean);
        const lockedStyles = (live?.project?.lockedStyles ?? [])
          .map((s) => s.label)
          .filter(Boolean);
        // Find the most recent videoAction in the convo so the route can
        // refine it on prose like "shorter" / "more vertical" / "60fps"
        // without the operator re-typing the whole prompt.
        const lastVideoAction = [...messages]
          .reverse()
          .find((mm) => mm.videoAction)?.videoAction;
        const res = await fetch(
          `/api/spawn/${scope.business}/site/video-chat`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              prose,
              activeProjectId: live?.activeProjectId ?? null,
              playhead: live?.playhead ?? 0,
              selection: live?.selection ?? [],
              ...(live?.selectedTrackKind
                ? { hint: { selectedTrackKind: live?.selectedTrackKind } }
                : {}),
              ...(lastVideoAction ? { lastAction: lastVideoAction } : {}),
              ...(lockedCharacters.length ? { lockedCharacters } : {}),
              ...(lockedStyles.length ? { lockedStyles } : {}),
            }),
          },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          action?: { kind: string; reason?: string; [k: string]: unknown };
          rationale?: string;
          explanation?: string;
          requiresConfirmation?: boolean;
          preview?: {
            config?: AdConfig;
            durationFrames?: number;
            scriptHint?: string;
          };
          renders?: Array<{
            id: string;
            status: string;
            outputFile?: string;
            finishedAt?: string;
            bytes?: number;
            error?: string;
            width?: number;
            height?: number;
          }>;
          error?: string;
        };
        // Heavy actions wait for an explicit "Run" click; light actions
        // dispatch immediately. The classifier returns requiresConfirmation
        // per action.kind — see HEAVY_KINDS in the route. Help is purely
        // informational and never dispatches.
        const isHeavy = json.requiresConfirmation === true;
        const isHelp = json.action?.kind === "help";
        const isInfoOnly =
          isHelp ||
          json.action?.kind === "list-renders" ||
          json.action?.kind === "list-locks";
        if (
          json.ok &&
          json.action &&
          json.action?.kind !== "unknown" &&
          !isHeavy &&
          !isInfoOnly
        ) {
          window.dispatchEvent(
            new CustomEvent("bf:video-applied", { detail: json.action }),
          );
        }
        const helpEntries = isHelp
          ? (
              json.action as unknown as {
                entries?: Array<{ phrase: string; description: string }>;
              }
            ).entries
          : undefined;
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text: json.error
              ? `Video chat failed: ${json.error}`
              : (json.explanation ?? "Done."),
            previewStatus:
              json.ok && !isHeavy && !isInfoOnly ? "applied" : "idle",
            ...(json.ok && isHeavy && json.action
              ? {
                  videoAction: json.action,
                  videoPreview: json.preview,
                }
              : {}),
            ...(helpEntries ? { helpEntries } : {}),
            ...(json.renders ? { rendersList: json.renders } : {}),
            ...(json.action?.kind === "list-locks"
              ? {
                  locksList: {
                    characters:
                      (json.action as unknown as { characters?: string[] })
                        .characters ?? [],
                    styles:
                      (json.action as unknown as { styles?: string[] })
                        .styles ?? [],
                  },
                }
              : {}),
          };
          return copy;
        });
      } catch (err) {
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text: `Video chat failed: ${(err as Error).message}`,
            previewStatus: "error",
          };
          return copy;
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isEmailTemplateScope) {
      try {
        // Read the editor's current draft from the global bridge so the styler
        // sees the live subject + body, not the seed values.
        const draft = (
          window as unknown as {
            __bfEmailDraft?: { subject: string; bodyMd: string };
          }
        ).__bfEmailDraft;
        const res = await fetch("/api/email/style", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            businessId: scope.business,
            templateSlug: scope.artifact,
            intent: prose,
            subject: draft?.subject ?? "",
            bodyMd: draft?.bodyMd ?? "",
          }),
        });
        const json = (await res.json()) as {
          proposal?: EmailStylerProposal;
          error?: string;
        };
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text: json.error
              ? `Styler failed: ${json.error}`
              : (json.proposal?.rationale ?? "No suggestions."),
            stylerProposal: json.proposal,
            previewStatus: "idle",
          };
          return copy;
        });
      } catch (err) {
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text: `Request failed: ${(err as Error).message}`,
            previewStatus: "error",
          };
          return copy;
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isTeamScope) {
      try {
        const res = await fetch("/api/team/edit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            phase: "preview",
            spawnId: scope.business,
            prose,
            ...(scope.artifact && { anchor: scope.artifact }),
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          proposal?: TeamEditProposal;
          courseId?: string;
          courseTitle?: string;
          source?: string;
          error?: string;
        };
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text:
              !json.ok || json.error
                ? `Edit failed: ${json.error ?? "unknown"}`
                : json.proposal?.noChange
                  ? json.proposal.rationale
                  : `Proposed: ${describeTeamProposal(json.proposal!)} — ${json.proposal!.rationale}`,
            ...(json.proposal &&
              !json.proposal.noChange && {
                teamProposal: json.proposal,
                ...(json.courseId && { teamCourseId: json.courseId }),
              }),
            previewStatus: "idle",
          };
          return copy;
        });
      } catch (err) {
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text: `Request failed: ${(err as Error).message}`,
            previewStatus: "error",
          };
          return copy;
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isAutomationScope) {
      try {
        const res = await fetch("/api/automation/edit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            phase: "preview",
            spawnId: scope.business,
            prose,
            ...(scope.artifact && { anchor: scope.artifact }),
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          proposal?: AutomationEditProposal;
          source?: string;
          error?: string;
        };
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text:
              !json.ok || json.error
                ? `Edit failed: ${json.error ?? "unknown"}`
                : json.proposal?.noChange
                  ? json.proposal.rationale
                  : `Proposed: ${describeAutomationProposal(json.proposal!)} — ${json.proposal!.rationale}`,
            ...(json.proposal &&
              !json.proposal.noChange && {
                automationProposal: json.proposal,
              }),
            previewStatus: "idle",
          };
          return copy;
        });
      } catch (err) {
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text: `Request failed: ${(err as Error).message}`,
            previewStatus: "error",
          };
          return copy;
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isSocialScope) {
      try {
        const res = await fetch("/api/social/edit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            phase: "preview",
            spawnId: scope.business,
            prose,
            ...(scope.artifact && { anchor: scope.artifact }),
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          proposal?: SocialEditProposal;
          source?: string;
          error?: string;
        };
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text:
              !json.ok || json.error
                ? `Edit failed: ${json.error ?? "unknown"}`
                : json.proposal?.noChange
                  ? json.proposal.rationale
                  : `Proposed: ${describeSocialProposal(json.proposal!)} — ${json.proposal!.rationale}`,
            ...(json.proposal &&
              !json.proposal.noChange && {
                socialProposal: json.proposal,
              }),
            previewStatus: "idle",
          };
          return copy;
        });
      } catch (err) {
        setMessages((m) => {
          const copy = [...m];
          copy[thinkingIdx] = {
            role: "system",
            at: nowHHMM(),
            text: `Request failed: ${(err as Error).message}`,
            previewStatus: "error",
          };
          return copy;
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/edit/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          briefId: scope.business,
          prose,
          scope: "cell",
          ...(anchor !== undefined ? { anchor } : {}),
        }),
      });
      const preview = (await res.json()) as PreviewResponse;
      setMessages((m) => {
        const copy = [...m];
        copy[thinkingIdx] = {
          role: "system",
          at: nowHHMM(),
          text: preview.error
            ? `Preview failed: ${preview.error}`
            : previewSummary(preview),
          preview: preview.error ? undefined : preview,
          previewStatus: "idle",
        };
        return copy;
      });
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[thinkingIdx] = {
          role: "system",
          at: nowHHMM(),
          text: `Request failed: ${(err as Error).message}`,
          previewStatus: "error",
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  function applyStyler(msgIdx: number) {
    const msg = messages[msgIdx];
    if (!msg?.stylerProposal || !scope.artifact) return;
    const detail = { ...msg.stylerProposal, templateSlug: scope.artifact };
    window.dispatchEvent(new CustomEvent("bf:email-styler-apply", { detail }));
    setMessages((m) => {
      const copy = [...m];
      copy[msgIdx] = { ...copy[msgIdx]!, stylerApplied: true };
      return copy;
    });
  }

  async function applyTeamProposal(msgIdx: number) {
    const msg = messages[msgIdx];
    if (!msg?.teamProposal || !msg.teamCourseId || !scope.business) return;
    setBusy(true);
    try {
      const res = await fetch("/api/team/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phase: "apply",
          spawnId: scope.business,
          courseId: msg.teamCourseId,
          proposal: msg.teamProposal,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      setMessages((m) => {
        const copy = [...m];
        copy[msgIdx] = {
          ...copy[msgIdx]!,
          teamApplied: json.ok === true,
          text:
            json.ok === true
              ? `Applied: ${describeTeamProposal(msg.teamProposal!)}.`
              : `Apply failed: ${json.error ?? "unknown"}`,
        };
        return copy;
      });
      // Trigger a refresh of the surrounding page so it re-renders the
      // updated cell. The chat pane sits in AppShell so a global event
      // is the cleanest way to nudge listeners (course pages already
      // hot-reload on router.refresh — this hint forces it).
      window.dispatchEvent(
        new CustomEvent("bf:team-edit-applied", {
          detail: { courseId: msg.teamCourseId, proposal: msg.teamProposal },
        }),
      );
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[msgIdx] = {
          ...copy[msgIdx]!,
          text: `Apply failed: ${(err as Error).message}`,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  function applyVideoAction(msgIdx: number) {
    const msg = messages[msgIdx];
    if (!msg?.videoAction) return;
    const _id = `va-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    window.dispatchEvent(
      new CustomEvent("bf:video-applied", {
        detail: { ...msg.videoAction, _id },
      }),
    );
    setMessages((m) => {
      const copy = [...m];
      copy[msgIdx] = {
        ...copy[msgIdx]!,
        videoApplied: true,
        videoActionId: _id,
        videoStatus: "pending",
      };
      return copy;
    });
  }

  // Listen for outcome events from EditorTab — flips pending → rendered/queued/failed.
  useEffect(() => {
    function onResult(e: Event) {
      const detail = (
        e as CustomEvent<{
          _id?: string;
          ok?: boolean;
          outcome?: "applied" | "queued" | "rendered";
          outputFile?: string;
          error?: string;
        }>
      ).detail;
      if (!detail || !detail._id) return;
      setMessages((m) =>
        m.map((mm) =>
          mm.videoActionId === detail._id
            ? {
                ...mm,
                videoStatus:
                  detail.ok === false
                    ? "failed"
                    : (detail.outcome ?? "applied"),
                ...(detail.outputFile
                  ? { videoOutputFile: detail.outputFile }
                  : {}),
                ...(detail.error ? { videoError: detail.error } : {}),
              }
            : mm,
        ),
      );
    }
    window.addEventListener("bf:video-result", onResult);
    return () => window.removeEventListener("bf:video-result", onResult);
  }, []);

  async function applyAutomationProposal(msgIdx: number) {
    const msg = messages[msgIdx];
    if (!msg?.automationProposal || !scope.business) return;
    setBusy(true);
    try {
      const res = await fetch("/api/automation/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phase: "apply",
          spawnId: scope.business,
          proposal: msg.automationProposal,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      setMessages((m) => {
        const copy = [...m];
        copy[msgIdx] = {
          ...copy[msgIdx]!,
          automationApplied: json.ok === true,
          text:
            json.ok === true
              ? `Applied: ${describeAutomationProposal(msg.automationProposal!)}.`
              : `Apply failed: ${json.error ?? "unknown"}`,
        };
        return copy;
      });
      window.dispatchEvent(
        new CustomEvent("bf:automation-edit-applied", {
          detail: { proposal: msg.automationProposal },
        }),
      );
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[msgIdx] = {
          ...copy[msgIdx]!,
          text: `Apply failed: ${(err as Error).message}`,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  async function applySocialProposal(msgIdx: number) {
    const msg = messages[msgIdx];
    if (!msg?.socialProposal || !scope.business) return;
    setBusy(true);
    try {
      const res = await fetch("/api/social/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phase: "apply",
          spawnId: scope.business,
          proposal: msg.socialProposal,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      setMessages((m) => {
        const copy = [...m];
        copy[msgIdx] = {
          ...copy[msgIdx]!,
          socialApplied: json.ok === true,
          text:
            json.ok === true
              ? `Applied: ${describeSocialProposal(msg.socialProposal!)}.`
              : `Apply failed: ${json.error ?? "unknown"}`,
        };
        return copy;
      });
      window.dispatchEvent(
        new CustomEvent("bf:social-edit-applied", {
          detail: { proposal: msg.socialProposal },
        }),
      );
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[msgIdx] = {
          ...copy[msgIdx]!,
          text: `Apply failed: ${(err as Error).message}`,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  async function apply(msgIdx: number) {
    const msg = messages[msgIdx];
    if (!msg?.preview || !scope.business) return;
    const cellRefs = msg.preview.previewedCellRefs ?? [];
    if (cellRefs.length === 0) return;

    setBusy(true);
    setMessages((m) => {
      const copy = [...m];
      copy[msgIdx] = { ...copy[msgIdx]!, previewStatus: "applying" };
      return copy;
    });

    try {
      const res = await fetch("/api/edit/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          briefId: scope.business,
          cellRefs,
          editDirective: msg.preview.editDirective ?? "",
          kind: msg.preview.kind ?? "data",
        }),
      });
      const result = (await res.json()) as ApplyResponse;
      setMessages((m) => {
        const copy = [...m];
        const applied = result.appliedCellRefs?.length ?? 0;
        const skipped = result.skippedCellRefs?.length ?? 0;
        copy[msgIdx] = {
          ...copy[msgIdx]!,
          previewStatus: result.error ? "error" : "applied",
          applyResult: result,
          text: result.error
            ? `Apply failed: ${result.error}`
            : `Applied ${applied} cell${applied === 1 ? "" : "s"}${skipped > 0 ? ` · skipped ${skipped}` : ""}.`,
          preview: undefined,
        };
        return copy;
      });
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[msgIdx] = {
          ...copy[msgIdx]!,
          previewStatus: "error",
          text: `Apply failed: ${(err as Error).message}`,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-[var(--ink-900)]">
            {scopeLabel}
          </span>
          {subScope && (
            <span className="mt-1 inline-flex h-5 w-fit items-center rounded-full bg-[var(--allonce-bg-soft,#f7f4ee)] px-2 text-[10.5px] font-medium uppercase tracking-wider text-[var(--ink-900)]">
              ● {subScope.surface}
              {subScope.detail ? ` · ${subScope.detail}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              title="Clear conversation"
              className="text-[10.5px] uppercase tracking-wider text-[var(--ink-400)] transition hover:text-[var(--ink-900)]"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close · ⌘/"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--ink-400)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-900)]"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 ? (
          <div className="space-y-5">
            <p className="text-[13.5px] leading-relaxed text-[var(--ink-500)]">
              How can I help with {scopeLabel}?
            </p>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => submit(s)}
                  className="group w-full rounded-2xl bg-[var(--bg-surface-alt)] px-4 py-3 text-left text-[13.5px] text-[var(--ink-800)] transition hover:bg-[var(--bg-sunken)] disabled:opacity-60"
                >
                  <span className="mr-2 text-[var(--ink-400)] group-hover:text-[var(--ink-700)]">
                    ›
                  </span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m, i) => (
              <li key={i} className="group/msg space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] text-[var(--ink-400)]">
                  <span className="font-medium text-[var(--ink-500)]">
                    {m.role === "user" ? "You" : "AllOnce"}
                  </span>
                  <span>·</span>
                  <span>{m.at}</span>
                </div>
                <div
                  className={`whitespace-pre-wrap break-words text-[13.5px] leading-relaxed ${
                    m.role === "user"
                      ? "inline-block max-w-full rounded-[28px] bg-[var(--bg-sunken)] px-4 py-2.5 text-[var(--ink-900)]"
                      : "px-0 py-1 text-[var(--ink-900)]"
                  }`}
                  style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                >
                  {m.role !== "user" && m.text === THINKING_SENTINEL ? (
                    <AssistantThinking />
                  ) : m.role !== "user" && m.streaming ? (
                    <StreamingText
                      text={m.text}
                      charsPerSecond={55}
                      onDone={() =>
                        setMessages((curr) => {
                          const next = [...curr];
                          if (next[i] && next[i]!.streaming) {
                            next[i] = { ...next[i]!, streaming: false };
                          }
                          return next;
                        })
                      }
                    />
                  ) : (
                    m.text
                  )}
                </div>

                {m.role !== "user" &&
                  !m.streaming &&
                  m.text !== THINKING_SENTINEL &&
                  m.text.trim().length > 0 && (
                    <div className="opacity-0 transition group-hover/msg:opacity-100 focus-within:opacity-100">
                      <div className="-mt-0.5 flex items-center gap-0.5 text-[var(--ink-400)]">
                        <button
                          type="button"
                          aria-label="Copy message"
                          onClick={() => copyMessage(i, m.text)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-[var(--bg-surface-alt)] hover:text-[var(--ink-900)]"
                        >
                          {copiedIdx === i ? (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <rect x="9" y="9" width="11" height="11" rx="2" />
                              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Good response"
                          aria-pressed={m.rating === "up"}
                          onClick={() => rateMessage(i, "up")}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-[var(--bg-surface-alt)] hover:text-[var(--ink-900)] ${m.rating === "up" ? "text-[var(--ink-900)]" : ""}`}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={m.rating === "up" ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M7 22V11" />
                            <path d="M14 9V5a3 3 0 0 0-6 0v6" />
                            <path d="M3 11h4v11H5a2 2 0 0 1-2-2v-9z" />
                            <path d="M7 11h9.6a2 2 0 0 1 2 2.3l-1.1 6a2 2 0 0 1-2 1.7H7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label="Bad response"
                          aria-pressed={m.rating === "down"}
                          onClick={() => rateMessage(i, "down")}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-[var(--bg-surface-alt)] hover:text-[var(--ink-900)] ${m.rating === "down" ? "text-[var(--ink-900)]" : ""}`}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={m.rating === "down" ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M17 2v11" />
                            <path d="M10 15v4a3 3 0 0 0 6 0v-6" />
                            <path d="M21 13h-4V2h2a2 2 0 0 1 2 2v9z" />
                            <path d="M17 13H7.4a2 2 0 0 1-2-2.3l1.1-6A2 2 0 0 1 8.5 3H17" />
                          </svg>
                        </button>
                        {i === messages.length - 1 && (
                          <button
                            type="button"
                            aria-label="Regenerate"
                            disabled={busy}
                            onClick={() => regenerateMessage(i)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-[var(--bg-surface-alt)] hover:text-[var(--ink-900)] disabled:opacity-40"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                              <path d="M21 3v5h-5" />
                              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                              <path d="M3 21v-5h5" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                {m.preview?.diffs && m.preview.diffs.length > 0 && (
                  <div className="space-y-2">
                    {m.preview.diffs.map((d) => (
                      <details
                        key={d.cellRef}
                        className="rounded-xl border border-[var(--allonce-line)] bg-white px-3 py-2 text-[12px]"
                      >
                        <summary className="cursor-pointer list-none">
                          <span className="font-mono text-[11px] text-[var(--ink-900)]">
                            {d.cellRef}
                          </span>
                          <span className="ml-2 text-[var(--ink-500)]">
                            {d.summary}
                          </span>
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-[var(--bg-surface-alt)] p-2 font-mono text-[11px] leading-snug text-[var(--ink-900)]">
                          {d.diffText}
                        </pre>
                      </details>
                    ))}
                    {m.previewStatus !== "applied" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy || m.previewStatus === "applying"}
                          onClick={() => apply(i)}
                          className="inline-flex h-8 items-center rounded-lg bg-[var(--ink-900)] px-3 text-[12px] font-medium text-white transition hover:bg-black disabled:opacity-60"
                        >
                          {m.previewStatus === "applying"
                            ? "Applying…"
                            : "Apply"}
                        </button>
                        {typeof m.preview.costEstimateUsd === "number" && (
                          <span className="font-mono text-[11px] text-[var(--ink-400)]">
                            est. ${m.preview.costEstimateUsd.toFixed(4)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {m.stylerProposal && (
                  <div className="space-y-2 rounded-xl border border-[var(--allonce-line)] bg-white px-3 py-2 text-[12px]">
                    <div className="space-y-1.5">
                      {m.stylerProposal.themeOverride !== null && (
                        <details className="rounded-md bg-[var(--bg-surface-alt)] px-2 py-1.5">
                          <summary className="cursor-pointer text-[11.5px] font-medium text-[var(--ink-700)]">
                            Theme override
                          </summary>
                          <pre className="mt-1.5 max-h-48 overflow-auto font-mono text-[10.5px] leading-snug text-[var(--ink-900)]">
                            {JSON.stringify(
                              m.stylerProposal.themeOverride,
                              null,
                              2,
                            )}
                          </pre>
                        </details>
                      )}
                      {m.stylerProposal.nextSubject && (
                        <div className="rounded-md bg-[var(--bg-surface-alt)] px-2 py-1.5">
                          <div className="text-[10.5px] uppercase tracking-wider text-[var(--ink-400)]">
                            New subject
                          </div>
                          <div className="mt-0.5 text-[12px] text-[var(--ink-900)]">
                            {m.stylerProposal.nextSubject}
                          </div>
                        </div>
                      )}
                      {m.stylerProposal.nextBodyMd && (
                        <details className="rounded-md bg-[var(--bg-surface-alt)] px-2 py-1.5">
                          <summary className="cursor-pointer text-[11.5px] font-medium text-[var(--ink-700)]">
                            New body
                          </summary>
                          <pre className="mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] leading-snug text-[var(--ink-900)]">
                            {m.stylerProposal.nextBodyMd}
                          </pre>
                        </details>
                      )}
                    </div>
                    {!m.stylerApplied &&
                      (m.stylerProposal.themeOverride !== null ||
                        m.stylerProposal.nextBodyMd !== null ||
                        m.stylerProposal.nextSubject !== null) && (
                        <button
                          type="button"
                          onClick={() => applyStyler(i)}
                          className="inline-flex h-8 items-center rounded-lg bg-[var(--ink-900)] px-3 text-[12px] font-medium text-white transition hover:bg-black"
                        >
                          Apply to editor
                        </button>
                      )}
                    {m.stylerApplied && (
                      <span className="text-[11.5px] text-[var(--allonce-ok)]">
                        ✓ Applied to editor
                      </span>
                    )}
                  </div>
                )}

                {m.teamProposal && (
                  <div className="mt-2 space-y-2 rounded-md border border-[var(--allonce-line)] bg-white p-3">
                    <div className="text-[11.5px]">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--allonce-ink-faint)]">
                        Proposed change
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--allonce-ink)]">
                        {describeTeamProposal(m.teamProposal)}
                      </p>
                      <p className="mt-2 text-[11.5px] leading-snug text-[var(--allonce-ink-muted)]">
                        {m.teamProposal.rationale}
                      </p>
                    </div>
                    {!m.teamApplied && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => applyTeamProposal(i)}
                          disabled={busy}
                          className="inline-flex h-8 items-center rounded-md bg-[var(--allonce-ink)] px-3 text-[12px] font-medium text-white transition hover:bg-black disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    {m.teamApplied && (
                      <span className="text-[11px] font-mono text-[var(--allonce-ok)]">
                        Applied — refresh to see the change.
                      </span>
                    )}
                  </div>
                )}

                {m.automationProposal && (
                  <div className="mt-2 space-y-2 rounded-md border border-[var(--allonce-line)] bg-white p-3">
                    <div className="text-[11.5px]">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--allonce-ink-faint)]">
                        Proposed change
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--allonce-ink)]">
                        {describeAutomationProposal(m.automationProposal)}
                      </p>
                      <p className="mt-2 text-[11.5px] leading-snug text-[var(--allonce-ink-muted)]">
                        {m.automationProposal.rationale}
                      </p>
                    </div>
                    {!m.automationApplied && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => applyAutomationProposal(i)}
                          disabled={busy}
                          className="inline-flex h-8 items-center rounded-md bg-[var(--allonce-ink)] px-3 text-[12px] font-medium text-white transition hover:bg-black disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    {m.automationApplied && (
                      <span className="text-[11px] font-mono text-[var(--allonce-ok)]">
                        Applied — refresh to see the change.
                      </span>
                    )}
                  </div>
                )}

                {m.socialProposal && (
                  <div className="mt-2 space-y-2 rounded-md border border-[var(--allonce-line)] bg-white p-3">
                    <div className="text-[11.5px]">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--allonce-ink-faint)]">
                        Proposed change
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--allonce-ink)]">
                        {describeSocialProposal(m.socialProposal)}
                      </p>
                      <p className="mt-2 text-[11.5px] leading-snug text-[var(--allonce-ink-muted)]">
                        {m.socialProposal.rationale}
                      </p>
                    </div>
                    {!m.socialApplied && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => applySocialProposal(i)}
                          disabled={busy}
                          className="inline-flex h-8 items-center rounded-md bg-[var(--allonce-ink)] px-3 text-[12px] font-medium text-white transition hover:bg-black disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    {m.socialApplied && (
                      <span className="text-[11px] font-mono text-[var(--allonce-ok)]">
                        Applied — refresh to see the change.
                      </span>
                    )}
                  </div>
                )}

                {m.locksList && (
                  <div className="mt-2 rounded-md border border-[var(--allonce-ink-muted)]/15 bg-[var(--bg-surface-alt)] p-2">
                    {m.locksList.characters.length === 0 &&
                    m.locksList.styles.length === 0 ? (
                      <p className="text-[11.5px] text-[var(--allonce-ink-muted)]">
                        Nothing pinned yet — try &quot;lock this character as
                        &lt;name&gt;&quot;.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {m.locksList.characters.length > 0 && (
                          <div>
                            <p className="text-[10.5px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                              Characters
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {m.locksList.characters.map((label) => (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => {
                                    setInput(
                                      `generate a clip of … with ${label}`,
                                    );
                                  }}
                                  className="rounded-full bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-900)] transition hover:bg-[var(--bg-sunken)]"
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {m.locksList.styles.length > 0 && (
                          <div>
                            <p className="text-[10.5px] uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                              Styles
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {m.locksList.styles.map((label) => (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => {
                                    setInput(`apply ${label} style`);
                                  }}
                                  className="rounded-full bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-900)] transition hover:bg-[var(--bg-sunken)]"
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {m.rendersList && (
                  <div className="mt-2 rounded-md border border-[var(--allonce-ink-muted)]/15 bg-[var(--bg-surface-alt)] p-2">
                    {m.rendersList.length === 0 ? (
                      <p className="text-[11.5px] text-[var(--allonce-ink-muted)]">
                        No renders yet — try "generate ad" or "render".
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {m.rendersList.map((r) => (
                          <li
                            key={r.id}
                            className="flex items-baseline justify-between gap-2 text-[11px]"
                          >
                            <div className="flex flex-col">
                              <span className="font-mono text-[var(--ink-900)]">
                                {r.outputFile ?? r.id}
                              </span>
                              <span className="text-[10px] text-[var(--allonce-ink-muted)]">
                                {r.status}
                                {r.width && r.height
                                  ? ` · ${r.width}×${r.height}`
                                  : ""}
                                {r.bytes
                                  ? ` · ${(r.bytes / 1024 / 1024).toFixed(1)}MB`
                                  : ""}
                                {r.finishedAt
                                  ? ` · ${new Date(r.finishedAt).toLocaleString()}`
                                  : ""}
                              </span>
                              {r.error && (
                                <span className="text-[10px] text-rose-600">
                                  {r.error.slice(0, 80)}
                                </span>
                              )}
                            </div>
                            {r.outputFile &&
                              r.status === "done" &&
                              scope.business && (
                                <a
                                  href={`/api/spawn/${scope.business}/site/asset/exports/${r.outputFile}`}
                                  download
                                  className="text-[11px] font-mono text-[var(--allonce-ok)] underline-offset-2 hover:underline"
                                >
                                  download
                                </a>
                              )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {m.helpEntries && m.helpEntries.length > 0 && (
                  <div className="mt-2 rounded-md border border-[var(--allonce-ink-muted)]/15 bg-[var(--bg-surface-alt)] p-2">
                    <ul className="space-y-1.5">
                      {m.helpEntries.map((entry) => (
                        <li key={entry.phrase} className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              setInput(entry.phrase);
                            }}
                            className="self-start rounded-sm bg-[var(--bg-surface)] px-2 py-0.5 text-left font-mono text-[11.5px] text-[var(--ink-900)] transition hover:bg-[var(--bg-sunken)]"
                          >
                            {entry.phrase}
                          </button>
                          <span className="text-[11px] leading-snug text-[var(--allonce-ink-muted)]">
                            {entry.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.videoAction && (
                  <div className="mt-2 rounded-md border border-[var(--allonce-ink-muted)]/15 bg-[var(--bg-surface-alt)] p-2">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--allonce-ink-muted)]">
                      {m.videoAction.kind}
                    </p>
                    {m.videoPreview?.config?.brand?.name && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
                        <span className="font-medium text-[var(--ink-900)]">
                          {m.videoPreview.config.brand.name}
                        </span>
                        {m.videoPreview.config.colors?.accent && (
                          <span className="inline-flex items-center gap-1 text-[var(--allonce-ink-muted)]">
                            <span
                              className="inline-block h-3 w-3 rounded-sm"
                              style={{
                                background: m.videoPreview.config.colors.accent,
                              }}
                            />
                            {m.videoPreview.config.colors.accent}
                          </span>
                        )}
                        {m.videoPreview.config.fonts?.display && (
                          <span className="text-[var(--allonce-ink-muted)]">
                            {m.videoPreview.config.fonts.display.split(",")[0]}
                          </span>
                        )}
                        {typeof m.videoPreview.durationFrames === "number" && (
                          <span className="text-[var(--allonce-ink-muted)]">
                            ~{Math.round(m.videoPreview.durationFrames / 30)}s
                          </span>
                        )}
                      </div>
                    )}
                    {m.videoPreview?.scriptHint && (
                      <p className="mt-1.5 text-[11.5px] leading-snug text-[var(--allonce-ink-muted)]">
                        Script: {m.videoPreview.scriptHint.slice(0, 140)}
                        {m.videoPreview.scriptHint.length > 140 ? "…" : ""}
                      </p>
                    )}
                    {m.videoAction.kind === "generate-ad" &&
                      m.videoPreview?.config &&
                      typeof m.videoPreview.durationFrames === "number" && (
                        <div className="mt-2">
                          <AdChatPreview
                            config={m.videoPreview.config}
                            durationFrames={m.videoPreview.durationFrames}
                          />
                        </div>
                      )}
                    {!m.videoApplied && (
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => applyVideoAction(i)}
                          className="inline-flex h-8 items-center rounded-md bg-[var(--allonce-ink)] px-3 text-[12px] font-medium text-white transition hover:bg-black"
                        >
                          Run
                        </button>
                      </div>
                    )}
                    {m.videoApplied && m.videoStatus === "pending" && (
                      <span className="text-[11px] font-mono text-[var(--allonce-ink-muted)]">
                        rendering…
                      </span>
                    )}
                    {m.videoStatus === "rendered" &&
                      m.videoOutputFile &&
                      scope.business && (
                        <a
                          href={`/api/spawn/${scope.business}/site/asset/exports/${m.videoOutputFile}`}
                          download
                          className="text-[11px] font-mono text-[var(--allonce-ok)] underline-offset-2 hover:underline"
                        >
                          done · {m.videoOutputFile}
                        </a>
                      )}
                    {m.videoStatus === "rendered" && !m.videoOutputFile && (
                      <span className="text-[11px] font-mono text-[var(--allonce-ok)]">
                        rendered.
                      </span>
                    )}
                    {m.videoStatus === "queued" && (
                      <span className="text-[11px] font-mono text-[var(--allonce-ok)]">
                        queued · check the media rail when it lands.
                      </span>
                    )}
                    {m.videoStatus === "applied" && (
                      <span className="text-[11px] font-mono text-[var(--allonce-ok)]">
                        applied.
                      </span>
                    )}
                    {m.videoStatus === "failed" && (
                      <span className="text-[11px] font-mono text-rose-600">
                        failed: {m.videoError ?? "unknown error"}
                      </span>
                    )}
                  </div>
                )}

                {m.applyResult?.materializations &&
                  m.applyResult.materializations.length > 0 && (
                    <ul className="space-y-0.5 font-mono text-[11px] text-[var(--ink-500)]">
                      {m.applyResult.materializations.flatMap((mm) =>
                        mm.modifiedPaths.map((p) => (
                          <li key={`${mm.cellRef}-${p}`}>✓ wrote {p}</li>
                        )),
                      )}
                    </ul>
                  )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="px-3 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        {attachments.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <li
                key={a.url}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--allonce-line)] bg-[var(--bg-surface)] py-1 pl-1.5 pr-2 text-[11.5px] text-[var(--ink-900)]"
              >
                {a.type.startsWith("image/") ? (
                  <span className="inline-block h-5 w-5 overflow-hidden rounded-full bg-[var(--bg-surface-alt)]">
                    <img
                      src={a.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-surface-alt)] text-[var(--ink-700)]">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 3v5h5M9 13h6M9 17h6M15 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                    </svg>
                  </span>
                )}
                <span className="max-w-[140px] truncate font-medium">
                  {a.name}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${a.name}`}
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="-mr-0.5 text-[var(--ink-400)] transition hover:text-[var(--ink-900)]"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        {/* ChatGPT-style composer — same shape as /app/spawn page composer.
            2026-05-14 — operator: "side chat textbox is still cheap, use
            spawning chat style". White pill, light border + subtle shadow,
            paperclip bottom-left, send bottom-right. */}
        <div className="relative rounded-[1.625rem] border border-[var(--allonce-line)] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_4px_16px_-4px_rgba(0,0,0,0.06)]">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const ta = e.currentTarget;
              ta.style.height = "auto";
              ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
            }}
            rows={1}
            placeholder={`Message ${scopeLabel}…`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            disabled={busy}
            className="block w-full resize-none rounded-[1.625rem] bg-transparent px-4 pt-3 pb-11 text-[14.5px] leading-[1.5] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] no-ring outline-none disabled:opacity-60 max-h-60 overflow-y-auto"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,text/*"
            onChange={handleFilePicked}
            className="hidden"
          />
          <button
            type="button"
            aria-label="Attach file"
            disabled={busy || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-500)] transition hover:bg-black/[0.06] hover:text-[var(--ink-900)] disabled:opacity-50"
          >
            {uploading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
          <button
            type="button"
            aria-label={
              voice.state === "listening" ? "Stop recording" : "Record"
            }
            onClick={() => {
              if (voice.state === "listening") voice.stopListening();
              else voice.startListening();
            }}
            className={`absolute bottom-2 right-[5.25rem] inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
              voice.state === "listening"
                ? "bg-[var(--allonce-err)] text-white"
                : "text-[var(--ink-500)] hover:bg-[var(--bg-surface-alt)] hover:text-[var(--ink-900)]"
            }`}
          >
            <svg
              width="16"
              height="16"
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
                ? "End voice conversation"
                : "Start voice conversation"
            }
            aria-pressed={voice.dialogueActive}
            onClick={() => {
              if (voice.dialogueActive) {
                voice.endConversation();
              } else {
                setLastVoiceReply("");
                voice.startConversation();
              }
            }}
            className={`absolute bottom-2 right-[2.75rem] inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
              voice.dialogueActive
                ? "bg-[var(--allonce-success)] text-white"
                : "text-[var(--ink-500)] hover:bg-[var(--bg-surface-alt)] hover:text-[var(--ink-900)]"
            }`}
          >
            <svg
              width="16"
              height="16"
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
            aria-label="Send"
            disabled={
              busy || (input.trim().length === 0 && attachments.length === 0)
            }
            className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink-900)] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#d7d7d7]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-[11px] text-[var(--ink-400)]">
          AllOnce can make mistakes. Verify before applying changes.
        </p>
      </form>
    </aside>
  );
}

function describeTeamProposal(p: TeamEditProposal): string {
  const target =
    p.target === "course"
      ? "course"
      : p.target === "lesson"
        ? `lesson ${p.lessonId}`
        : `slide ${p.slideId} in lesson ${p.lessonId}`;
  return `${target}.${p.field} → "${p.newValue.length > 60 ? p.newValue.slice(0, 60) + "…" : p.newValue}"`;
}

function describeAutomationProposal(p: AutomationEditProposal): string {
  const wf = `workflow ${p.workflowId}`;
  switch (p.intent) {
    case "rename":
      return `${wf}.name → "${typeof p.newValue === "string" ? truncate(p.newValue, 60) : ""}"`;
    case "set-description":
      return `${wf}.description → "${typeof p.newValue === "string" ? truncate(p.newValue, 60) : ""}"`;
    case "set-cap":
      return `${wf}.capUsd → $${typeof p.newValue === "number" ? p.newValue : "?"}/mo`;
    case "pause":
      return `${wf} → pause`;
    case "resume":
      return `${wf} → resume`;
    case "delete":
      return `${wf} → delete`;
    default:
      return wf;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function describeSocialProposal(p: SocialEditProposal): string {
  if (p.intent === "compose") {
    const where = p.platforms?.length ? p.platforms.join(" + ") : "platforms";
    const body = typeof p.newValue === "string" ? truncate(p.newValue, 50) : "";
    return `compose for ${where} → "${body}"`;
  }
  const targetLabel =
    p.target === "post"
      ? `post ${p.targetId}`
      : p.target === "account"
        ? `account ${p.targetId}`
        : `campaign ${p.targetId}`;
  switch (p.intent) {
    case "schedule":
      return `${targetLabel} → schedule ${typeof p.newValue === "string" ? p.newValue : "?"}`;
    case "archive":
      return `${targetLabel} → archive`;
    case "pause":
      return `${targetLabel} → pause`;
    case "resume":
      return `${targetLabel} → resume`;
    case "set-caption":
      return `${targetLabel}.caption → "${typeof p.newValue === "string" ? truncate(p.newValue, 50) : ""}"`;
    case "set-hashtags":
      return `${targetLabel}.hashtags → ${typeof p.newValue === "string" ? truncate(p.newValue, 60) : ""}`;
    case "set-campaign-goal":
      return `${targetLabel}.goal → ${typeof p.newValue === "number" ? p.newValue : "?"}`;
    default:
      return targetLabel;
  }
}

function previewSummary(p: PreviewResponse): string {
  const affected = p.resolvedCellRefs?.length ?? 0;
  const shown = p.previewedCellRefs?.length ?? 0;
  const overflow = p.overflowCellCount ?? 0;
  if (affected === 0) {
    return p.rationale
      ? `Nothing to change: ${p.rationale}`
      : "Nothing to change for that scope.";
  }
  const parts = [
    `${affected} cell${affected === 1 ? "" : "s"} affected`,
    shown < affected ? `previewing ${shown}` : null,
    overflow > 0 ? `${overflow} more not previewed` : null,
    p.kind === "structural" ? "structural (PR-gated)" : null,
    typeof p.confidence === "number"
      ? `${Math.round(p.confidence * 100)}% confidence`
      : null,
  ].filter(Boolean);
  return `${parts.join(" · ")}.`;
}
