// app/lib/db/pinterest-types.ts
export type PinContentType = "blog" | "product" | "project";
export type PinStatus = "queued" | "posted" | "failed" | "skipped";

export type PinterestSettingsRow = {
  id: number;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  connected_account: string | null;
  default_board_id: string | null;
  board_map: Record<string, string>;
  pins_per_run: number;
  enabled: boolean;
  updated_at: string;
};

export type PinterestPinRow = {
  id: string;
  content_type: PinContentType;
  content_id: string;
  board_id: string | null;
  status: PinStatus;
  scheduled_for: string;
  attempts: number;
  pin_id: string | null;
  error: string | null;
  created_at: string;
  posted_at: string | null;
};
