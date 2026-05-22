/**
 * Travelplace operator chat — POST /api/chat
 *
 * Bilingual (EN / KA), permission-aware, org-scoped, and agentic via the
 * multi-provider LLM fallback chain in `app/lib/llm-fallback.ts`. The chain
 * tries Anthropic API (if `ANTHROPIC_API_KEY` is set), then the Claude CLI
 * subprocess in dev, then Vertex AI Gemini (if `GCP_SA_JSON_B64` +
 * `GCP_PROJECT_ID`), then Groq. In production we run on Vertex via the
 * solid-heaven GCP project (gemini-2.5-flash) — Anthropic credits are
 * shared / depleted, Vertex bills GCP.
 *
 * Contract:
 *   Request : { messages: [{ role: "user" | "assistant", content: string }] }
 *   Response: { ok: true, text: string } | { ok: false, error: string }
 *   Status  : always 200 (the chat UI reads `ok`/`text` from the body).
 *             Exception: anonymous callers get 401 because that's the only
 *             case where the UI explicitly checks `res.ok`.
 *
 * The system prompt embeds the caller's identity, role, permissions, org
 * name, and today's date so the model can answer "who am I", "what can I
 * do", "what's today" without a tool call. The tool registry (_tools.ts)
 * only ever sees the org-scoped Supabase client — there's no escape-hatch
 * to cross-org data.
 *
 * Tool-use loop: `callLLMWithTools` returns one of {text, tool_use} per
 * call. The route drives the multi-turn loop itself, capped at
 * MAX_TOOL_ITERATIONS so a misbehaving model can't spin forever. Between
 * iterations we append a synthetic assistant turn describing the call
 * and a synthetic user turn carrying the tool result — that shape works
 * across all providers in the fallback chain (Anthropic, Gemini-Vertex,
 * Groq) without needing each provider's native tool-result wire format.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import {
  callLLMWithTools,
  type ChatMessage,
  type ToolDef,
} from "@/app/lib/llm-fallback";
import {
  TOOLS,
  loadOrgMemories,
  type ToolContext,
  type ToolResult,
} from "./_tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_TOOL_ITERATIONS = 6;
const MAX_TOKENS = 2048;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface IncomingAttachment {
  name: string;
  type: string;
  path: string;
}

interface RequestBody {
  messages?: IncomingMessage[];
  attachments?: IncomingAttachment[];
}

function buildSystemPrompt(args: {
  userName: string;
  userEmail: string;
  role: string;
  permissions: string[];
  orgName: string;
  orgId: number;
  todayDate: string;
  memories?: Array<{ type: string; description: string; body: string }>;
}): string {
  const permissionsList =
    args.permissions.length > 0 ? args.permissions.join(", ") : "(none)";
  const memorySection =
    args.memories && args.memories.length > 0
      ? `

ORGANIZATION MEMORY — these are things the operator has explicitly told you in past conversations. Treat them as ground truth unless contradicted by current data. If the user asks you to update one, use \`remember_memory\` with the same slug. If they ask to forget one, use \`forget_memory\`.

${args.memories
  .map(
    (m) => `- [${m.type}] ${m.description}\n  ${m.body.replace(/\n/g, "\n  ")}`,
  )
  .join("\n")}
`
      : "";
  return `You are the Travelplace operator assistant — embedded inside a multi-tenant
travel-agency CRM. The CURRENT user is ${args.userName} (${args.userEmail}). Their role
is "${args.role}" with permissions: ${permissionsList}. They belong to organization
"${args.orgName}". Today is ${args.todayDate}.

You operate inside the user's organization only. The tools provided are
already scoped to org ${args.orgId} — never ask the user for an org id, never
mention org isolation unless they explicitly ask. Other orgs' data is
invisible to you.

BEHAVIOR:
- Be concise and professional. The user is operating their travel agency
  in real time. No fluff.
- When the user asks you to take an action, take it without asking
  permission unless the action is destructive (delete) or affects another
  user — in which case confirm first.
- After taking an action, briefly confirm what you did (include the row
  id when relevant). E.g. "Added 'Hotel Iota' in Batumi — id 412."
- If you don't have permission for an action, explain which permission
  would be needed (e.g. "I need \`hotels.write\` to add a new hotel —
  contact your admin.").
- For free-form questions, use the read tools to find facts before
  answering. Don't make up numbers.

EMPTY RESULTS: If a list_* tool returns 0 results, don't just say "I
couldn't find anything." Explain WHY (the org has no rows yet) and offer
the operator concrete next steps:
- For empty hotels: offer to import from Excel ("drop an Excel into chat
  with 'import these'") OR create one with create_hotel.
- For empty orders: explain orders are created in /app/orders/new or via
  create_order from chat.
- For empty audit: it's just because no writes have happened yet.

WEB SEARCH — MANDATORY tool usage:
You have \`web_search\` (DuckDuckGo, free, no key) and \`fetch_url\` (read
specific URL).

CALL web_search WITHOUT EXCEPTION when the user message contains any of:
- English: "search", "google", "find online", "look up", "on the internet",
  "on the web", "search the web", "find on"
- Georgian: "მოძებნე", "ინტერნეტში", "ვებში", "მონახე", "მოიძიე", "ნახე ვებში"

DO NOT reply "I can't search the internet" — that is FALSE. You CAN. Call
the tool first; only if the tool returns 0 results may you report that.

Example:
  User: "მოძებნე სასტუმროები თბილისში ინტერნეტში"
  YOU MUST: call web_search({ query: "სასტუმროები თბილისში" })
  THEN report the results in Georgian.

DOCUMENT WORKFLOW: When the user uploads a document and asks you to
import, save, or log it, use \`ingest_document\` to extract structured
rows, then pass those rows to \`bulk_insert_hotels\` /
\`bulk_insert_orders\` / \`bulk_insert_contacts\`. ALWAYS show the user
a preview (first 3 rows + total count) and ask for confirmation before
inserting more than 5 rows.

MEMORY: When the user tells you something about how they work or about a
specific client/hotel/partner (e.g. "always quote in USD", "Mr. Adamia
prefers sea view", "our default markup is 15%"), call \`remember_memory\`
so you'll know it next conversation. Use \`recall_memory\` if you need
older context that's not in the ORGANIZATION MEMORY section above.

You are not a help desk. You are a working assistant that gets things
done in the CRM.${memorySection}

╔══════════════════════════════════════════════════════════════════════╗
║ CRITICAL — LANGUAGE MATCHING — NON-NEGOTIABLE                        ║
╠══════════════════════════════════════════════════════════════════════╣
║ The user's LAST message dictates your reply language.                 ║
║                                                                       ║
║ Georgian characters (ა-ჰ) in their message → REPLY IN GEORGIAN.       ║
║ Latin characters → REPLY IN ENGLISH.                                  ║
║ Mixed → match the dominant script.                                    ║
║                                                                       ║
║ "გამარჯობა" → respond Georgian: "გამარჯობა! რით შემიძლია დაგეხმარო?"  ║
║ "Hello" → respond English: "Hello! What can I help with?"             ║
║                                                                       ║
║ THIS IS YOUR MOST IMPORTANT RULE.                                     ║
║ If the user writes a single Georgian word, your ENTIRE reply must     ║
║ be in Georgian — including tool result narrations.                    ║
╚══════════════════════════════════════════════════════════════════════╝`;
}

function jsonError(msg: string, status = 200) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// Provider-agnostic tool transcript: after the model calls a tool, append
// two messages encoding what happened. All providers in the fallback chain
// (Anthropic, Vertex Gemini, Groq) treat these as ordinary turns and
// continue the conversation. The "[Tool result]" marker is what the system
// prompt would lead the model to look for when synthesizing its next turn.
function appendToolTurn(
  messages: ChatMessage[],
  toolName: string,
  toolInput: Record<string, unknown>,
  toolResult: ToolResult | { ok: false; error: string },
): void {
  messages.push({
    role: "assistant",
    content: `[Calling tool ${toolName} with ${JSON.stringify(toolInput)}]`,
  });
  messages.push({
    role: "user",
    content: `[Tool result for ${toolName}]\n${JSON.stringify(toolResult)}`,
  });
}

export async function POST(req: Request): Promise<Response> {
  // ── 1. Auth gate ────────────────────────────────────────────────────
  const session = await auth();
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // ── 2. Parse body ───────────────────────────────────────────────────
  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError("invalid JSON body");
  }
  const incoming = Array.isArray(body.messages)
    ? body.messages.filter(
        (m): m is IncomingMessage =>
          !!m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim() !== "",
      )
    : [];
  if (incoming.length === 0) {
    return jsonError("no messages");
  }
  const incomingAttachments: IncomingAttachment[] = Array.isArray(
    body.attachments,
  )
    ? body.attachments.filter(
        (a): a is IncomingAttachment =>
          !!a &&
          typeof (a as IncomingAttachment).name === "string" &&
          typeof (a as IncomingAttachment).type === "string" &&
          typeof (a as IncomingAttachment).path === "string",
      )
    : [];

  // ── 3. Provider config check ───────────────────────────────────────
  // Need at least one tool-capable provider configured. Vertex (Gemini)
  // is the production path; Anthropic is optional. callLLMWithTools
  // itself will fall through to text-only if no tool-use provider has
  // credentials, which would silently disable the agent — guard here.
  const hasAnthropic = !!process.env["ANTHROPIC_API_KEY"];
  const hasVertex = !!(
    process.env["GCP_SA_JSON_B64"] && process.env["GCP_PROJECT_ID"]
  );
  if (!hasAnthropic && !hasVertex) {
    console.warn(
      "[api/chat] no tool-capable LLM provider configured (need ANTHROPIC_API_KEY or GCP_SA_JSON_B64+GCP_PROJECT_ID)",
    );
    return jsonError(
      "Chat not configured (no LLM provider with tool-use available)",
    );
  }

  // ── 4. Org-scoped client + caller context ──────────────────────────
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return jsonError(
      `session is not bound to an organization: ${(e as Error).message}`,
    );
  }
  const { client: supabase, orgId } = scoped;
  const user = session.user as Record<string, unknown>;
  const ctx: ToolContext = {
    userEmail: scoped.userEmail,
    role: (user["role"] as string) ?? scoped.role ?? "unknown",
    permissions: scoped.permissions,
    orgId,
    orgName: scoped.orgName ?? "",
    supabase: supabase as any,
    attachments: incomingAttachments,
  };

  const memories = await loadOrgMemories(supabase, orgId, 10);

  const systemPrompt = buildSystemPrompt({
    userName:
      (user["name"] as string) ??
      scoped.userName ??
      scoped.userEmail.split("@")[0] ??
      "operator",
    userEmail: scoped.userEmail,
    role: ctx.role,
    permissions: ctx.permissions,
    orgName: ctx.orgName,
    orgId: ctx.orgId,
    todayDate: new Date().toISOString().slice(0, 10),
    memories,
  });

  // ── 5. Tool definitions (Anthropic-shape passes through unchanged) ─
  const toolDefs: ToolDef[] = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  // ── 6. Tool-use loop ───────────────────────────────────────────────
  const messages: ChatMessage[] = incoming.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Inject attachment manifest into the LAST user turn so the model can
  // reach the files via the `ingest_document` tool. We deliberately don't
  // expose signed URLs here — the tool reads from Storage server-side using
  // the path, so URLs never leave the server.
  if (incomingAttachments.length > 0) {
    // Find the last user message; that's the turn the files belong to.
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") {
        const manifest = incomingAttachments
          .map(
            (a) =>
              `- ${a.name} (${a.type || "unknown"}, server path: ${a.path})`,
          )
          .join("\n");
        messages[i] = {
          ...messages[i],
          content: `User attached ${incomingAttachments.length} file(s). Use the \`ingest_document\` tool with the server path to read them.\n${manifest}\n\n${messages[i]!.content}`,
        };
        break;
      }
    }
  }

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const resp = await callLLMWithTools({
        system: systemPrompt,
        messages,
        tools: toolDefs,
        maxTokens: MAX_TOKENS,
      });

      if (resp.kind === "text") {
        return NextResponse.json({ ok: true, text: resp.text });
      }

      // resp.kind === "tool_use"
      const tool = TOOLS.find((t) => t.name === resp.name);
      if (!tool) {
        appendToolTurn(messages, resp.name, resp.input, {
          ok: false,
          error: `unknown tool: ${resp.name}`,
        });
        continue;
      }
      if (
        tool.permission &&
        !ctx.permissions.includes(tool.permission) &&
        !ctx.permissions.includes("admin.all")
      ) {
        appendToolTurn(messages, resp.name, resp.input, {
          ok: false,
          error: `Permission ${tool.permission} required`,
        });
        continue;
      }
      try {
        const result = await tool.handler(resp.input ?? {}, ctx);
        appendToolTurn(messages, resp.name, resp.input, result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[api/chat] tool ${resp.name} threw:`, msg);
        appendToolTurn(messages, resp.name, resp.input, {
          ok: false,
          error: msg,
        });
      }
    }

    // Max iterations reached — the model kept calling tools without
    // settling on a reply. Return a graceful stub rather than spinning
    // forever.
    return NextResponse.json({
      ok: true,
      text: "I worked on that but ran out of steps. Could you give me a more specific instruction?",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/chat] error:", msg);
    return jsonError(`Chat failed: ${msg}`);
  }
}
