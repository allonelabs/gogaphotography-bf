// app/lib/goga/meta-bot.ts
import "server-only";
import {
  callLLMWithTools,
  type ChatMessage,
  type ToolDef,
} from "@/app/lib/llm-fallback";

export interface BotContext {
  studioInfo: {
    email?: string | null;
    phone?: string | null;
    address_locality?: string | null;
    address_country?: string | null;
    hours?: string | null;
  } | null;
  services: { title_en?: string | null; title_ka?: string | null }[];
  packages: {
    name_en?: string | null;
    name_ka?: string | null;
    base_price_cents?: number | null;
    currency?: string | null;
  }[];
}

export function buildSystemPrompt(ctx: BotContext): string {
  const si = ctx.studioInfo ?? {};
  const services = ctx.services
    .map((s) => s.title_en || s.title_ka)
    .filter(Boolean)
    .join(", ");
  const packages = ctx.packages
    .map(
      (p) =>
        `${p.name_en || p.name_ka} — ${((p.base_price_cents ?? 0) / 100).toFixed(0)} ${p.currency ?? "GEL"}`,
    )
    .join("; ");
  const location = [si.address_locality, si.address_country]
    .filter(Boolean)
    .join(", ");
  return [
    `You are the assistant for GOGA Photography, a photography studio.`,
    `Reply in the user's language (Georgian or English). Be warm, concise, helpful.`,
    `ONLY use the facts below; if you don't know, say so and offer to connect a human.`,
    si.email ? `Contact email: ${si.email}` : "",
    si.phone ? `Phone: ${si.phone}` : "",
    location ? `Location: ${location}` : "",
    si.hours ? `Hours: ${si.hours}` : "",
    services ? `Services: ${services}` : "",
    packages ? `Packages & prices: ${packages}` : "",
    `If the user wants to book, asks about availability, or shares their details, call the create_lead tool with whatever you have.`,
    `If the user asks to talk to a person, is upset, or the request is beyond these facts, call the request_human tool.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const BOT_TOOLS: ToolDef[] = [
  {
    name: "create_lead",
    description:
      "Capture a booking lead when the user wants to book or shares contact/date details.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer name if known" },
        contact: { type: "string", description: "Email or phone if shared" },
        date: {
          type: "string",
          description: "Desired shoot date (ISO) if mentioned",
        },
        note: { type: "string", description: "What they want" },
      },
      required: [],
    },
  },
  {
    name: "request_human",
    description:
      "Escalate to a human agent when asked or when beyond the provided facts.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: [],
    },
  },
];

export interface LeadInsert {
  name: string | null;
  email: string | null;
  phone: string | null;
  shoot_date: string | null;
  notes: string | null;
  message: string | null;
  source: string;
  stage: string;
}
export function mapLeadArgs(args: Record<string, unknown>): LeadInsert {
  const contact = typeof args.contact === "string" ? args.contact : "";
  const isEmail = contact.includes("@");
  return {
    name: (args.name as string) ?? null,
    email: isEmail ? contact : null,
    phone: !isEmail && contact ? contact : null,
    shoot_date: (args.date as string) || null,
    notes: (args.note as string) ?? null,
    message: (args.note as string) ?? null,
    source: "meta",
    stage: "lead",
  };
}

export interface BotResult {
  reply: string;
  lead?: LeadInsert;
  escalate?: boolean;
}

/** Single-turn bot: one LLM call; map tool_use to an action + a friendly reply. */
export async function runBot(
  history: ChatMessage[],
  userText: string,
  ctx: BotContext,
): Promise<BotResult> {
  const messages: ChatMessage[] = [
    ...history,
    { role: "user", content: userText },
  ];
  try {
    const result = await callLLMWithTools({
      system: buildSystemPrompt(ctx),
      messages,
      tools: BOT_TOOLS,
      maxTokens: 600,
    });
    if (result.kind === "text") return { reply: result.text.trim() || "🙂" };
    if (result.name === "create_lead") {
      return {
        reply:
          "მადლობა! დეტალები მივიღე და მალე დაგიკავშირდებით. / Thank you! I've noted your details and the studio will reach out shortly.",
        lead: mapLeadArgs(result.input),
      };
    }
    return {
      reply:
        "ერთ წუთში გადაგამისამართებთ ჩვენს გუნდთან. / Connecting you with our team — someone will reply here soon.",
      escalate: true,
    };
  } catch {
    return {
      reply:
        "ბოდიში, ახლა ვერ ვუპასუხე — გუნდი მალე გიპასუხებთ. / Sorry, I couldn't reply just now — the team will follow up.",
      escalate: true,
    };
  }
}
