// app/lib/db/meta-types.ts
export type MetaChannel = "messenger" | "instagram";
export type MetaDirection = "in" | "out";
export type MetaSender = "user" | "bot" | "agent";

export type MetaSettingsRow = {
  id: number;
  page_id: string | null;
  page_access_token: string | null;
  verify_token: string | null;
  app_secret: string | null;
  ig_user_id: string | null;
  bot_enabled: boolean;
  updated_at: string;
};

export type MetaThreadRow = {
  id: string;
  channel: MetaChannel;
  external_id: string;
  display_name: string | null;
  last_message_at: string | null;
  unread: number;
  handoff: boolean;
  created_at: string;
};

export type MetaMessageRow = {
  id: string;
  thread_id: string;
  direction: MetaDirection;
  sender: MetaSender;
  text: string;
  meta_message_id: string | null;
  created_at: string;
};
