"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type { LeadStage } from "./leads";

export async function setLeadStage(
  leadId: string,
  stage: LeadStage,
): Promise<void> {
  const sb = gogaAdmin();
  const { error } = await sb.from("leads").update({ stage }).eq("id", leadId);
  if (error) throw new Error(error.message);
  await sb
    .from("lead_events")
    .insert({ lead_id: leadId, kind: "stage.changed", payload: { stage } });
  revalidatePath("/app/leads");
  revalidatePath(`/app/leads/${leadId}`);
}

export async function updateLeadNotes(
  leadId: string,
  notes: string,
): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("leads").update({ notes }).eq("id", leadId);
  await sb
    .from("lead_events")
    .insert({ lead_id: leadId, kind: "notes.updated" });
  revalidatePath(`/app/leads/${leadId}`);
}

export async function archiveLead(leadId: string): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("leads").update({ archived: true }).eq("id", leadId);
  await sb
    .from("lead_events")
    .insert({ lead_id: leadId, kind: "lead.archived" });
  revalidatePath("/app/leads");
}

export async function togglePackagePublished(
  id: string,
  next: boolean,
): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("packages").update({ published: next }).eq("id", id);
  revalidatePath("/app/packages");
}

export async function toggleProjectPublished(
  id: string,
  next: boolean,
): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("projects").update({ published: next }).eq("id", id);
  revalidatePath("/app/projects");
}

export async function toggleServicePublished(
  id: string,
  next: boolean,
): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("services").update({ published: next }).eq("id", id);
  revalidatePath("/app/services");
}
