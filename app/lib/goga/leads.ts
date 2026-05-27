import type { GogaDatabase } from "@/app/lib/db/goga-types";

export type LeadStage = GogaDatabase["public"]["Enums"]["lead_stage"];
export type LeadSource = GogaDatabase["public"]["Enums"]["lead_source"];

export const LEAD_STAGES: LeadStage[] = [
  "lead",
  "consultation",
  "contract",
  "shoot",
  "delivery",
  "upsell",
  "won",
  "lost",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  lead: "Lead",
  consultation: "Consultation",
  contract: "Contract",
  shoot: "Shoot",
  delivery: "Delivery",
  upsell: "Upsell",
  won: "Won",
  lost: "Lost",
};

/**
 * Monochrome stage tones. Three tiers map to the lifecycle:
 *   - cold (new prospect): light pill, muted text
 *   - active (in motion):  outlined pill, dark text
 *   - closed (terminal):   filled ink-900 pill (won) or strikethrough (lost)
 * Differentiation lives in weight + dot prefix + fill, not hue.
 */
export const STAGE_TONE: Record<LeadStage, string> = {
  lead: "bg-slate-100 text-slate-600",
  consultation: "bg-white text-slate-900 ring-1 ring-inset ring-black/15",
  contract: "bg-white text-slate-900 ring-1 ring-inset ring-black/15",
  shoot: "bg-slate-200 text-slate-900",
  delivery: "bg-slate-200 text-slate-900",
  upsell: "bg-slate-300 text-slate-900",
  won: "bg-slate-900 text-white",
  lost: "bg-slate-100 text-slate-400 line-through",
};
