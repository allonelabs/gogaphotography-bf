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

export const STAGE_TONE: Record<LeadStage, string> = {
  lead: "bg-slate-100 text-slate-700",
  consultation: "bg-blue-50 text-blue-700",
  contract: "bg-amber-50 text-amber-700",
  shoot: "bg-violet-50 text-violet-700",
  delivery: "bg-cyan-50 text-cyan-700",
  upsell: "bg-fuchsia-50 text-fuchsia-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-rose-50 text-rose-700",
};
