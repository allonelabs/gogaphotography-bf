"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type { LeadStage } from "./leads";
import { requireSession } from "./require-auth";
import { logAdminEvent } from "./admin-events";

export async function setLeadStage(
  leadId: string,
  stage: LeadStage,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data: prior } = await sb
    .from("leads")
    .select("stage")
    .eq("id", leadId)
    .maybeSingle();
  const { error } = await sb.from("leads").update({ stage }).eq("id", leadId);
  if (error) throw new Error(error.message);
  await sb.from("lead_events").insert({
    lead_id: leadId,
    kind: "stage.changed",
    payload: { from: prior?.stage ?? null, to: stage },
  });
  await logAdminEvent("lead.stage_changed", {
    entityType: "lead",
    entityId: leadId,
    payload: { from: prior?.stage ?? null, to: stage },
  });
  revalidatePath("/app/leads");
  revalidatePath(`/app/leads/${leadId}`);
}

export async function updateLeadNotes(
  leadId: string,
  notes: string,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  await sb.from("leads").update({ notes }).eq("id", leadId);
  await sb
    .from("lead_events")
    .insert({ lead_id: leadId, kind: "notes.updated" });
  await logAdminEvent("lead.note_edited", {
    entityType: "lead",
    entityId: leadId,
  });
  revalidatePath(`/app/leads/${leadId}`);
}

export async function archiveLead(leadId: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  await sb.from("leads").update({ archived: true }).eq("id", leadId);
  await sb
    .from("lead_events")
    .insert({ lead_id: leadId, kind: "lead.archived" });
  await logAdminEvent("lead.archived", {
    entityType: "lead",
    entityId: leadId,
  });
  revalidatePath("/app/leads");
}
