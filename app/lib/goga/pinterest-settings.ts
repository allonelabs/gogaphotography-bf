// app/lib/goga/pinterest-settings.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { refreshAccessToken } from "@/app/lib/pinterest";
import { needsRefresh } from "./pinterest-logic";
import type { PinterestSettingsRow } from "@/app/lib/db/pinterest-types";

export async function getSettings(): Promise<PinterestSettingsRow> {
  const { data } = await gogaAdmin()
    .from("pinterest_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (
    (data as PinterestSettingsRow) ?? {
      id: 1,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_account: null,
      default_board_id: null,
      board_map: {},
      pins_per_run: 1,
      enabled: false,
      updated_at: new Date().toISOString(),
    }
  );
}

export async function saveSettings(
  patch: Partial<PinterestSettingsRow>,
): Promise<void> {
  await gogaAdmin()
    .from("pinterest_settings")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    } as PinterestSettingsRow)
    .eq("id", 1);
}

export function isConnected(s: PinterestSettingsRow): boolean {
  return !!s.access_token;
}

/** Return a valid access token, refreshing + persisting if expired. Null if not connected. */
export async function getValidAccessToken(): Promise<string | null> {
  const s = await getSettings();
  if (!s.access_token) return null;
  if (!needsRefresh(s.token_expires_at, new Date())) return s.access_token;
  if (!s.refresh_token) return s.access_token; // can't refresh; try as-is
  const tok = await refreshAccessToken(s.refresh_token);
  const token_expires_at = new Date(
    Date.now() + tok.expires_in * 1000,
  ).toISOString();
  await saveSettings({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? s.refresh_token,
    token_expires_at,
  });
  return tok.access_token;
}
