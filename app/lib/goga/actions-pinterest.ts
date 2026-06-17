// app/lib/goga/actions-pinterest.ts
"use server";
import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { saveSettings } from "./pinterest-settings";
import { enqueueAllEligible } from "./pinterest-queue";

export async function savePinterestSettings(formData: FormData): Promise<void> {
  await requireSession();
  const pins_per_run = Math.max(
    1,
    parseInt(String(formData.get("pins_per_run") ?? "1"), 10) || 1,
  );
  const enabled = formData.get("enabled") === "on";
  const default_board_id =
    String(formData.get("default_board_id") ?? "").trim() || null;
  let board_map: Record<string, string> = {};
  try {
    board_map = JSON.parse(String(formData.get("board_map") ?? "{}"));
  } catch {
    board_map = {};
  }
  await saveSettings({ pins_per_run, enabled, default_board_id, board_map });
  revalidatePath("/app/pinterest");
}

export async function disconnectPinterest(): Promise<void> {
  await requireSession();
  await saveSettings({
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
    connected_account: null,
  });
  revalidatePath("/app/pinterest");
}

export async function backfillPins(): Promise<void> {
  await requireSession();
  await enqueueAllEligible();
  revalidatePath("/app/pinterest");
}

export async function skipPin(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("pinterest_pins")
    .update({ status: "skipped" })
    .eq("id", id);
  revalidatePath("/app/pinterest");
}

export async function requeuePin(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("pinterest_pins")
    .update({
      status: "queued",
      error: null,
      scheduled_for: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/app/pinterest");
}
