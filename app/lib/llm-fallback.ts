// app/lib/llm-fallback.ts
//
// Provider-fallback chain for chat-style LLM calls. Tries providers in
// strict order, falling through on any error (auth, billing, rate-limit,
// network) so the operator chat keeps working even when one provider is
// down or out of credits.
//
//   1. Anthropic API           (primary — multimodal supported)
//   2. Claude CLI subprocess   (dev-only — uses local subscription)
//   3. Gemini                  (text-only)
//   4. Groq                    (text-only)
//
// Each provider is gated on its env var being set; absent providers skip
// silently. Missing all providers throws.

import "server-only";
import { spawn } from "node:child_process";

import Anthropic from "@anthropic-ai/sdk";

// ── Public types ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Tool-use shape mirrors Anthropic's API. `input_schema` is JSON Schema.
export interface ToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// First-turn result: model either replied with text OR asked to use a tool.
// On `tool_use`, the caller is expected to execute the tool and then make
// a follow-up call feeding the result back. The actual tool-call loop
// lives in the chat route (per-tool authorization + streaming UI).
export type ToolCallResult =
  | { kind: "text"; text: string; provider: Provider }
  | {
      kind: "tool_use";
      toolUseId: string;
      name: string;
      input: Record<string, unknown>;
      provider: Provider;
    };

export interface AnthropicMessage {
  role: "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | {
            type: "image";
            source: {
              type: "base64";
              media_type:
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp";
              data: string;
            };
          }
        | {
            type: "document";
            source: { type: "base64"; media_type: string; data: string };
          }
      >;
}

export interface LLMRequest {
  system: string;
  messages: ChatMessage[];
  /** Anthropic-only: preferred when present (carries multimodal blocks). */
  anthropicMessages?: AnthropicMessage[];
  maxTokens?: number;
  /** Override default model per provider. */
  models?: Partial<Record<Provider, string>>;
  /** Force the model to return strict JSON (Gemini supports this natively). */
  jsonMode?: boolean;
}

export type Provider = "anthropic" | "claude-cli" | "gemini" | "groq";

export interface LLMResult {
  text: string;
  provider: Provider;
  durationMs: number;
  /** Errors from providers earlier in the chain that fell through. */
  fellBackFrom: Array<{ provider: Provider; error: string }>;
}

// ── Defaults ──────────────────────────────────────────────────────────

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-4-5",
  "claude-cli": "claude-sonnet-4-5",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
};

// ── Public entry point ────────────────────────────────────────────────

export async function callLLM(req: LLMRequest): Promise<LLMResult> {
  const fellBackFrom: Array<{ provider: Provider; error: string }> = [];
  const isDev =
    process.env["NODE_ENV"] !== "production" ||
    process.env["CLAUDE_CLI_FALLBACK"] === "1";
  const max = req.maxTokens ?? 1024;

  // 1. Anthropic API
  if (process.env["ANTHROPIC_API_KEY"]) {
    const t0 = Date.now();
    try {
      const text = await callAnthropic(req, max);
      return {
        text,
        provider: "anthropic",
        durationMs: Date.now() - t0,
        fellBackFrom,
      };
    } catch (e) {
      fellBackFrom.push({ provider: "anthropic", error: errMsg(e) });
    }
  }

  // 2. Claude CLI (local dev subscription)
  if (isDev) {
    const t0 = Date.now();
    try {
      const text = await callClaudeCli(req, max);
      return {
        text,
        provider: "claude-cli",
        durationMs: Date.now() - t0,
        fellBackFrom,
      };
    } catch (e) {
      fellBackFrom.push({ provider: "claude-cli", error: errMsg(e) });
    }
  }

  // 3. Gemini — either Vertex AI (GCP service account) or AI Studio key.
  //    callGemini dispatches internally; presence of either credential set
  //    is enough to enter this branch. AI Studio billing is depleted in
  //    AllOnce prod so Vertex is the path actually used.
  if (
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_AI_API_KEY"] ||
    (process.env["GCP_SA_JSON_B64"] && process.env["GCP_PROJECT_ID"])
  ) {
    const t0 = Date.now();
    try {
      const text = await callGemini(req, max);
      return {
        text,
        provider: "gemini",
        durationMs: Date.now() - t0,
        fellBackFrom,
      };
    } catch (e) {
      fellBackFrom.push({ provider: "gemini", error: errMsg(e) });
    }
  }

  // 4. Groq
  if (process.env["GROQ_API_KEY"]) {
    const t0 = Date.now();
    try {
      const text = await callGroq(req, max);
      return {
        text,
        provider: "groq",
        durationMs: Date.now() - t0,
        fellBackFrom,
      };
    } catch (e) {
      fellBackFrom.push({ provider: "groq", error: errMsg(e) });
    }
  }

  throw new Error(
    fellBackFrom.length === 0
      ? "no LLM provider configured (set ANTHROPIC_API_KEY, GCP_SA_JSON_B64+GCP_PROJECT_ID for Vertex, GEMINI_API_KEY, or GROQ_API_KEY)"
      : `all LLM providers failed:\n  ${fellBackFrom.map((f) => `${f.provider}: ${f.error}`).join("\n  ")}`,
  );
}

// ── Provider 1: Anthropic API ────────────────────────────────────────

async function callAnthropic(req: LLMRequest, max: number): Promise<string> {
  const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"]! });
  const messages = req.anthropicMessages ?? messagesToAnthropic(req.messages);
  const response = await client.messages.create({
    model: req.models?.anthropic ?? DEFAULT_MODELS.anthropic,
    max_tokens: max,
    system: req.system,
    messages: messages as Anthropic.Messages.MessageParam[],
  });
  if (!("content" in response))
    throw new Error("anthropic: streaming response (unexpected)");
  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text")
    throw new Error("anthropic: no text block");
  return block.text;
}

function messagesToAnthropic(msgs: ChatMessage[]): AnthropicMessage[] {
  return msgs.map((m) => ({ role: m.role, content: m.content }));
}

// ── Provider 2: Claude CLI subprocess ────────────────────────────────

async function callClaudeCli(req: LLMRequest, max: number): Promise<string> {
  // Build a single text prompt that captures system + transcript. The CLI
  // accepts one prompt at a time via stdin in -p mode.
  const transcript = req.messages
    .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
    .join("\n\n");
  const prompt = `[System]\n${req.system}\n\n[Conversation so far]\n${transcript}\n\n[Now]\nReply as ASSISTANT. Follow the system instructions exactly. Output only the assistant's reply (no labels, no preamble).`;

  const bin =
    process.env["CLAUDE_CLI_PATH"] ||
    `${process.env["HOME"]}/.local/bin/claude`;
  // Resolution order:
  //   1. explicit CLAUDE_CONFIG_DIR_FOR_FALLBACK from .env.local
  //   2. inherited CLAUDE_CONFIG_DIR from the parent shell (often set when
  //      the dev server is launched from inside a Claude Code session)
  //   3. last-resort default ~/.claude-account1
  const configDir =
    process.env["CLAUDE_CONFIG_DIR_FOR_FALLBACK"] ||
    process.env["CLAUDE_CONFIG_DIR"] ||
    `${process.env["HOME"]}/.claude-account1`;
  // No --model flag: let the CLI use the subscription's default model.
  // Forcing a specific model (e.g. sonnet-4-5) bypasses subscription
  // billing and hits the API-credit balance instead.
  const args = ["-p", "--output-format", "json"];
  const explicitModel = req.models?.["claude-cli"];
  if (explicitModel) args.push("--model", explicitModel);

  // Strip env vars that route the CLI subprocess away from subscription auth.
  //   - ANTHROPIC_API_KEY: presence forces the CLI into API mode. Since our
  //     API key has empty credits (the whole reason we're falling through),
  //     this is exactly what we don't want here.
  //   - CLAUDECODE / CLAUDE_CODE_*: leak in when the dev server is launched
  //     from inside a Claude Code session; some can interfere with auth.
  const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
  delete cleanEnv["ANTHROPIC_API_KEY"];
  for (const k of Object.keys(cleanEnv)) {
    if (k === "CLAUDECODE" || k.startsWith("CLAUDE_CODE_")) delete cleanEnv[k];
  }
  cleanEnv["CLAUDE_CONFIG_DIR"] = configDir;

  return new Promise<string>((resolve, reject) => {
    const child = spawn(bin, args, { env: cleanEnv });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("claude cli: timeout (60s)"));
    }, 60_000);
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(
          new Error(
            `claude cli exit ${code}: ${stderr.slice(0, 200) || stdout.slice(0, 200)}`,
          ),
        );
      }
      try {
        const parsed = JSON.parse(stdout) as {
          is_error?: boolean;
          result?: string;
        };
        if (parsed.is_error)
          return reject(
            new Error(`claude cli error: ${parsed.result ?? "unknown"}`),
          );
        if (typeof parsed.result !== "string")
          return reject(new Error("claude cli: missing result field"));
        resolve(parsed.result);
      } catch (e) {
        reject(new Error(`claude cli: bad json — ${stdout.slice(0, 200)}`));
      }
    });
    child.stdin.write(prompt);
    child.stdin.end();
    void max; // CLI doesn't expose max_tokens via -p flags
  });
}

// ── Provider 3: Gemini ────────────────────────────────────────────────

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

async function callGemini(req: LLMRequest, max: number): Promise<string> {
  const model = req.models?.gemini ?? DEFAULT_MODELS.gemini;
  const contents = req.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Vertex AI path — billed against GCP project credits, not AI Studio
  // prepayment. Active when GCP_SA_JSON_B64 is set (service account JSON,
  // base64-encoded to avoid newline/escaping pain in env vars).
  const saB64 = process.env["GCP_SA_JSON_B64"];
  const project = process.env["GCP_PROJECT_ID"];
  if (saB64 && project) {
    const location = process.env["GCP_LOCATION"] ?? "us-central1";
    const credentials = JSON.parse(
      Buffer.from(saB64, "base64").toString("utf-8"),
    );
    // Mint an OAuth access token from the SA. Cached per cold-start would
    // be ideal; for now mint each call (tokens last 1h, cost is negligible).
    const accessToken = await mintGcpAccessToken(credentials);
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents,
        generationConfig: {
          maxOutputTokens: max,
          responseMimeType: req.jsonMode ? "application/json" : "text/plain",
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`vertex ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = (await res.json()) as GeminiResponse;
    if (data.error?.message) throw new Error(`vertex: ${data.error.message}`);
    if (data.promptFeedback?.blockReason)
      throw new Error(`vertex blocked: ${data.promptFeedback.blockReason}`);
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("vertex: empty response");
    return text;
  }

  // AI Studio fallback — billed against AI Studio prepayment credits.
  const key =
    process.env["GEMINI_API_KEY"] || process.env["GOOGLE_AI_API_KEY"]!;
  const body = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents,
    generationConfig: {
      maxOutputTokens: max,
      responseMimeType: req.jsonMode ? "application/json" : "text/plain",
    },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as GeminiResponse;
  if (data.error?.message) throw new Error(`gemini: ${data.error.message}`);
  if (data.promptFeedback?.blockReason)
    throw new Error(`gemini blocked: ${data.promptFeedback.blockReason}`);
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("gemini: empty response");
  return text;
}

// ── Public entry point: tool-aware ─────────────────────────────────────
//
// Per OPERATOR_DIRECTIVE_2026-05-09: the chat agent needs hands. This
// variant calls a model with a tools array; if the model decides to
// invoke a tool, returns `{kind:'tool_use', name, input}` so the caller
// can execute the tool and re-call with the result.
//
// Provider priority:
//   1. Anthropic API (if ANTHROPIC_API_KEY) — native tool_use blocks
//   2. Vertex AI Gemini (if GCP_SA_JSON_B64 + GCP_PROJECT_ID) —
//      functionDeclarations / functionCall translation. AllOnce
//      production path; AI Studio billing is depleted.
//   3. Fall back to plain text via callLLM if neither has tool-use.
export async function callLLMWithTools(
  req: LLMRequest & { tools: ToolDef[] },
): Promise<ToolCallResult> {
  // 1. Anthropic — native tool_use.
  if (process.env["ANTHROPIC_API_KEY"]) {
    const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"]! });
    const messages = req.anthropicMessages ?? messagesToAnthropic(req.messages);
    const max = req.maxTokens ?? 1024;
    const response = await client.messages.create({
      model: req.models?.anthropic ?? DEFAULT_MODELS.anthropic,
      max_tokens: max,
      system: req.system,
      tools: req.tools as unknown as Anthropic.Messages.Tool[],
      messages: messages as Anthropic.Messages.MessageParam[],
    });
    if (!("content" in response))
      throw new Error("anthropic: streaming response (unexpected)");
    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      return {
        kind: "tool_use",
        toolUseId: toolUse.id,
        name: toolUse.name,
        input: toolUse.input as Record<string, unknown>,
        provider: "anthropic",
      };
    }
    const text = response.content.find((c) => c.type === "text");
    if (!text || text.type !== "text")
      throw new Error("anthropic: no text or tool_use block");
    return { kind: "text", text: text.text, provider: "anthropic" };
  }

  // 2. Vertex AI Gemini function-calling.
  const saB64 = process.env["GCP_SA_JSON_B64"];
  const project = process.env["GCP_PROJECT_ID"];
  if (saB64 && project) {
    const result = await callVertexWithTools(req, saB64, project);
    if (result) return result;
    // Otherwise fall through to text-only.
  }

  // 3. No tool-use auth — text-only.
  const r = await callLLM(req);
  return { kind: "text", text: r.text, provider: r.provider };
}

// Vertex AI Gemini function-calling. Translates the Anthropic-shape ToolDef
// to Vertex's functionDeclarations, detects functionCall in the response,
// returns null on hard error so the caller can fall through to text-only.
async function callVertexWithTools(
  req: LLMRequest & { tools: ToolDef[] },
  saB64: string,
  project: string,
): Promise<ToolCallResult | null> {
  const location = process.env["GCP_LOCATION"] ?? "us-central1";
  const model = req.models?.gemini ?? DEFAULT_MODELS.gemini;
  const max = req.maxTokens ?? 1024;
  try {
    const credentials = JSON.parse(
      Buffer.from(saB64, "base64").toString("utf-8"),
    );
    const accessToken = await mintGcpAccessToken(credentials);
    const contents = req.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    // Map ToolDef[] → Vertex functionDeclarations. input_schema is JSON Schema
    // with lowercase types; Vertex accepts both lowercase and uppercase on
    // Gemini 2.5+, so we pass through verbatim.
    const functionDeclarations = req.tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    }));
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents,
        tools: [{ functionDeclarations }],
        generationConfig: { maxOutputTokens: max },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.warn(
        `[callLLMWithTools] vertex ${res.status}: ${t.slice(0, 300)}`,
      );
      return null;
    }
    interface VertexFnCall {
      name: string;
      args?: Record<string, unknown>;
    }
    interface VertexPart {
      text?: string;
      functionCall?: VertexFnCall;
    }
    interface VertexResp {
      candidates?: Array<{ content?: { parts?: VertexPart[] } }>;
    }
    const data = (await res.json()) as VertexResp;
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const fnCall = parts.find((p) => p.functionCall)?.functionCall;
    if (fnCall) {
      return {
        kind: "tool_use",
        // Synthesize a stable id — Vertex doesn't return one; the chat route
        // uses this for the audit log + tool-result correlation.
        toolUseId: `vrx-${Date.now().toString(36)}`,
        name: fnCall.name,
        input: fnCall.args ?? {},
        provider: "gemini",
      };
    }
    const text = parts
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (text) return { kind: "text", text, provider: "gemini" };
    return null;
  } catch (err) {
    console.warn(
      `[callLLMWithTools] vertex threw: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

// Streaming variant — only Vertex AI supported for now (the only active
// provider in production). Yields text chunks as the model generates them.
// Caller must drain the iterator; if Vertex isn't configured, throws.
export async function* streamLLM(
  req: LLMRequest,
): AsyncGenerator<string, void, void> {
  const saB64 = process.env["GCP_SA_JSON_B64"];
  const project = process.env["GCP_PROJECT_ID"];
  if (!saB64 || !project) {
    throw new Error(
      "streamLLM: Vertex AI not configured (GCP_SA_JSON_B64 + GCP_PROJECT_ID required)",
    );
  }
  const location = process.env["GCP_LOCATION"] ?? "us-central1";
  const model = req.models?.gemini ?? DEFAULT_MODELS.gemini;
  const credentials = JSON.parse(
    Buffer.from(saB64, "base64").toString("utf-8"),
  );
  const accessToken = await mintGcpAccessToken(credentials);
  const contents = req.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:streamGenerateContent?alt=sse`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents,
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? 1024,
        responseMimeType: req.jsonMode ? "application/json" : "text/plain",
      },
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text();
    throw new Error(`vertex-stream ${res.status}: ${t.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl !== -1) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      nl = buf.indexOf("\n");
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const obj = JSON.parse(payload) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const text = obj.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("");
        if (text) yield text;
      } catch {
        /* malformed line — skip */
      }
    }
  }
}

// Multimodal Vertex / Gemini call. Sends a single user turn containing a
// text prompt + one inline_data blob (PDF or image), returns plain text.
// Used by `ingest_document` to extract structured rows from uploaded files.
//
// Why not extend callLLM? `callLLM` takes ChatMessage[] (text-only). Wiring
// multimodal blocks through every provider's `content`-block shape is a
// rabbit hole — we only need Vertex/AI-Studio for this path, so this is a
// thin sibling that calls just that endpoint with the inline-data part.
export async function callGeminiMultimodal(args: {
  system: string;
  prompt: string;
  file: { mimeType: string; base64: string };
  model?: string;
  jsonMode?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const model = args.model ?? DEFAULT_MODELS.gemini;
  const max = args.maxTokens ?? 4096;
  const body = {
    systemInstruction: { parts: [{ text: args.system }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: args.prompt },
          {
            inline_data: {
              mime_type: args.file.mimeType,
              data: args.file.base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: max,
      responseMimeType: args.jsonMode ? "application/json" : "text/plain",
    },
  };

  const saB64 = process.env["GCP_SA_JSON_B64"];
  const project = process.env["GCP_PROJECT_ID"];
  if (saB64 && project) {
    const location = process.env["GCP_LOCATION"] ?? "us-central1";
    const credentials = JSON.parse(
      Buffer.from(saB64, "base64").toString("utf-8"),
    );
    const accessToken = await mintGcpAccessToken(credentials);
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`vertex-multimodal ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = (await res.json()) as GeminiResponse;
    if (data.error?.message)
      throw new Error(`vertex-multimodal: ${data.error.message}`);
    if (data.promptFeedback?.blockReason) {
      throw new Error(
        `vertex-multimodal blocked: ${data.promptFeedback.blockReason}`,
      );
    }
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("vertex-multimodal: empty response");
    return text;
  }

  // AI Studio fallback.
  const key = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_AI_API_KEY"];
  if (!key)
    throw new Error(
      "callGeminiMultimodal: no Vertex SA or AI Studio key configured",
    );
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gemini-multimodal ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as GeminiResponse;
  if (data.error?.message)
    throw new Error(`gemini-multimodal: ${data.error.message}`);
  if (data.promptFeedback?.blockReason) {
    throw new Error(
      `gemini-multimodal blocked: ${data.promptFeedback.blockReason}`,
    );
  }
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("gemini-multimodal: empty response");
  return text;
}

// Mint a GCP OAuth2 access token from a service-account JSON, scoped for
// Vertex AI (cloud-platform). Self-signed JWT → token endpoint exchange.
// No external deps — uses Node's built-in crypto.
// Exported so gemini-image.ts (and any future Vertex caller) can reuse the
// same auth path instead of duplicating the JWT-mint logic.
export async function mintGcpAccessToken(credentials: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const { createSign } = await import("node:crypto");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const b64url = (s: string) =>
    Buffer.from(s)
      .toString("base64")
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer
    .sign(credentials.private_key)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${unsigned}.${signature}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`gcp-token ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!data.access_token)
    throw new Error(
      `gcp-token: ${data.error_description ?? data.error ?? "no access_token"}`,
    );
  return data.access_token;
}

// ── Provider 4: Groq ──────────────────────────────────────────────────

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

async function callGroq(req: LLMRequest, max: number): Promise<string> {
  const key = process.env["GROQ_API_KEY"]!;
  const model = req.models?.groq ?? DEFAULT_MODELS.groq;
  const messages = [
    { role: "system" as const, content: req.system },
    ...req.messages.map((m) => ({ role: m.role, content: m.content })),
  ];
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: max }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`groq ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as GroqResponse;
  if (data.error?.message) throw new Error(`groq: ${data.error.message}`);
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("groq: empty response");
  return text;
}

// ── Helpers ───────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
