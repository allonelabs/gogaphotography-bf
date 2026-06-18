import type {
  StoreProductRow,
  StoreOrderRow,
  StoreOrderItemRow,
  StoreDownloadRow,
} from "./store-types";
import type {
  BlogCategoryRow,
  BlogTagRow,
  BlogPostRow,
  BlogPostTagRow,
} from "./blog-types";
import type { PinterestSettingsRow, PinterestPinRow } from "./pinterest-types";
import type {
  MetaSettingsRow,
  MetaThreadRow,
  MetaMessageRow,
} from "./meta-types";
import type { PortfolioAlbumRow, ProjectAlbumRow } from "./portfolio-types";

export type GogaJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: GogaJson | undefined }
  | GogaJson[];

export type GogaDatabase = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<GogaDatabase, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      addons: {
        Row: {
          description_en: string | null;
          description_ka: string | null;
          id: string;
          name_en: string;
          name_ka: string | null;
          price_cents: number;
          published: boolean;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          description_en?: string | null;
          description_ka?: string | null;
          id?: string;
          name_en: string;
          name_ka?: string | null;
          price_cents?: number;
          published?: boolean;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          description_en?: string | null;
          description_ka?: string | null;
          id?: string;
          name_en?: string;
          name_ka?: string | null;
          price_cents?: number;
          published?: boolean;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      availability_rules: {
        Row: {
          closed: boolean;
          end_time: string | null;
          id: string;
          start_time: string | null;
          updated_at: string;
          weekday: number | null;
        };
        Insert: {
          closed?: boolean;
          end_time?: string | null;
          id?: string;
          start_time?: string | null;
          updated_at?: string;
          weekday?: number | null;
        };
        Update: {
          closed?: boolean;
          end_time?: string | null;
          id?: string;
          start_time?: string | null;
          updated_at?: string;
          weekday?: number | null;
        };
        Relationships: [];
      };
      blackout_dates: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          reason: string | null;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          reason?: string | null;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          addons: GogaJson;
          client_email: string | null;
          client_name: string | null;
          client_phone: string | null;
          contract_path: string | null;
          contract_status: string;
          created_at: string;
          currency: string;
          deposit_cents: number;
          deposit_status: GogaDatabase["public"]["Enums"]["deposit_status"];
          duration_hours: number | null;
          id: string;
          lead_id: string | null;
          location: string | null;
          notes: string | null;
          package_id: string | null;
          shoot_date: string;
          shoot_time: string | null;
          status: GogaDatabase["public"]["Enums"]["booking_status"];
          stripe_intent_id: string | null;
          stripe_session_id: string | null;
          subtotal_cents: number;
          total_cents: number;
          updated_at: string;
        };
        Insert: {
          addons?: GogaJson;
          client_email?: string | null;
          client_name?: string | null;
          client_phone?: string | null;
          contract_path?: string | null;
          contract_status?: string;
          created_at?: string;
          currency?: string;
          deposit_cents?: number;
          deposit_status?: GogaDatabase["public"]["Enums"]["deposit_status"];
          duration_hours?: number | null;
          id?: string;
          lead_id?: string | null;
          location?: string | null;
          notes?: string | null;
          package_id?: string | null;
          shoot_date: string;
          shoot_time?: string | null;
          status?: GogaDatabase["public"]["Enums"]["booking_status"];
          stripe_intent_id?: string | null;
          stripe_session_id?: string | null;
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Update: {
          addons?: GogaJson;
          client_email?: string | null;
          client_name?: string | null;
          client_phone?: string | null;
          contract_path?: string | null;
          contract_status?: string;
          created_at?: string;
          currency?: string;
          deposit_cents?: number;
          deposit_status?: GogaDatabase["public"]["Enums"]["deposit_status"];
          duration_hours?: number | null;
          id?: string;
          lead_id?: string | null;
          location?: string | null;
          notes?: string | null;
          package_id?: string | null;
          shoot_date?: string;
          shoot_time?: string | null;
          status?: GogaDatabase["public"]["Enums"]["booking_status"];
          stripe_intent_id?: string | null;
          stripe_session_id?: string | null;
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "packages";
            referencedColumns: ["id"];
          },
        ];
      };
      chatbot_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          session_id: string;
          tool_calls: GogaJson | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          session_id: string;
          tool_calls?: GogaJson | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          session_id?: string;
          tool_calls?: GogaJson | null;
        };
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chatbot_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      chatbot_sessions: {
        Row: {
          ended_at: string | null;
          id: string;
          ip: string | null;
          lead_id: string | null;
          locale: string | null;
          message_count: number;
          session_token: string;
          started_at: string;
          user_agent: string | null;
        };
        Insert: {
          ended_at?: string | null;
          id?: string;
          ip?: string | null;
          lead_id?: string | null;
          locale?: string | null;
          message_count?: number;
          session_token: string;
          started_at?: string;
          user_agent?: string | null;
        };
        Update: {
          ended_at?: string | null;
          id?: string;
          ip?: string | null;
          lead_id?: string | null;
          locale?: string | null;
          message_count?: number;
          session_token?: string;
          started_at?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chatbot_sessions_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_submissions: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          ip: string | null;
          locale: string | null;
          message: string | null;
          name: string | null;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          ip?: string | null;
          locale?: string | null;
          message?: string | null;
          name?: string | null;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          ip?: string | null;
          locale?: string | null;
          message?: string | null;
          name?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          body_en: string | null;
          body_ka: string | null;
          booking_id: string;
          created_at: string;
          id: string;
          sent_at: string | null;
          signature_path: string | null;
          signed_at: string | null;
          signed_ip: string | null;
          signed_user_agent: string | null;
          signer_email: string | null;
          signer_name: string | null;
          status: GogaDatabase["public"]["Enums"]["contract_status"];
          token: string;
          updated_at: string;
        };
        Insert: {
          body_en?: string | null;
          body_ka?: string | null;
          booking_id: string;
          created_at?: string;
          id?: string;
          sent_at?: string | null;
          signature_path?: string | null;
          signed_at?: string | null;
          signed_ip?: string | null;
          signed_user_agent?: string | null;
          signer_email?: string | null;
          signer_name?: string | null;
          status?: GogaDatabase["public"]["Enums"]["contract_status"];
          token: string;
          updated_at?: string;
        };
        Update: {
          body_en?: string | null;
          body_ka?: string | null;
          booking_id?: string;
          created_at?: string;
          id?: string;
          sent_at?: string | null;
          signature_path?: string | null;
          signed_at?: string | null;
          signed_ip?: string | null;
          signed_user_agent?: string | null;
          signer_email?: string | null;
          signer_name?: string | null;
          status?: GogaDatabase["public"]["Enums"]["contract_status"];
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      deliveries: {
        Row: {
          archived: boolean;
          booking_id: string;
          created_at: string;
          downloads_enabled: boolean;
          expires_at: string | null;
          id: string;
          intro_en: string | null;
          intro_ka: string | null;
          last_viewed_at: string | null;
          password_hash: string | null;
          token: string;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          archived?: boolean;
          booking_id: string;
          created_at?: string;
          downloads_enabled?: boolean;
          expires_at?: string | null;
          id?: string;
          intro_en?: string | null;
          intro_ka?: string | null;
          last_viewed_at?: string | null;
          password_hash?: string | null;
          token: string;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          archived?: boolean;
          booking_id?: string;
          created_at?: string;
          downloads_enabled?: boolean;
          expires_at?: string | null;
          id?: string;
          intro_en?: string | null;
          intro_ka?: string | null;
          last_viewed_at?: string | null;
          password_hash?: string | null;
          token?: string;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_images: {
        Row: {
          caption: string | null;
          created_at: string;
          delivery_id: string;
          download_count: number;
          favorited_at: string | null;
          id: string;
          image_path: string;
          sort_order: number;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          delivery_id: string;
          download_count?: number;
          favorited_at?: string | null;
          id?: string;
          image_path: string;
          sort_order?: number;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          delivery_id?: string;
          download_count?: number;
          favorited_at?: string | null;
          id?: string;
          image_path?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_images_delivery_id_fkey";
            columns: ["delivery_id"];
            isOneToOne: false;
            referencedRelation: "deliveries";
            referencedColumns: ["id"];
          },
        ];
      };
      hero: {
        Row: {
          headline_en: string | null;
          headline_ka: string | null;
          id: number;
          subtitle_en: string | null;
          subtitle_ka: string | null;
          updated_at: string;
        };
        Insert: {
          headline_en?: string | null;
          headline_ka?: string | null;
          id?: number;
          subtitle_en?: string | null;
          subtitle_ka?: string | null;
          updated_at?: string;
        };
        Update: {
          headline_en?: string | null;
          headline_ka?: string | null;
          id?: number;
          subtitle_en?: string | null;
          subtitle_ka?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      lead_events: {
        Row: {
          actor: string | null;
          created_at: string;
          id: string;
          kind: string;
          lead_id: string;
          payload: GogaJson;
        };
        Insert: {
          actor?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          lead_id: string;
          payload?: GogaJson;
        };
        Update: {
          actor?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          lead_id?: string;
          payload?: GogaJson;
        };
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          archived: boolean;
          created_at: string;
          custom: GogaJson;
          email: string | null;
          id: string;
          ip: string | null;
          locale: string | null;
          message: string | null;
          name: string | null;
          notes: string | null;
          package_id: string | null;
          phone: string | null;
          score: number | null;
          shoot_date: string | null;
          source: GogaDatabase["public"]["Enums"]["lead_source"];
          stage: GogaDatabase["public"]["Enums"]["lead_stage"];
          updated_at: string;
        };
        Insert: {
          archived?: boolean;
          created_at?: string;
          custom?: GogaJson;
          email?: string | null;
          id?: string;
          ip?: string | null;
          locale?: string | null;
          message?: string | null;
          name?: string | null;
          notes?: string | null;
          package_id?: string | null;
          phone?: string | null;
          score?: number | null;
          shoot_date?: string | null;
          source?: GogaDatabase["public"]["Enums"]["lead_source"];
          stage?: GogaDatabase["public"]["Enums"]["lead_stage"];
          updated_at?: string;
        };
        Update: {
          archived?: boolean;
          created_at?: string;
          custom?: GogaJson;
          email?: string | null;
          id?: string;
          ip?: string | null;
          locale?: string | null;
          message?: string | null;
          name?: string | null;
          notes?: string | null;
          package_id?: string | null;
          phone?: string | null;
          score?: number | null;
          shoot_date?: string | null;
          source?: GogaDatabase["public"]["Enums"]["lead_source"];
          stage?: GogaDatabase["public"]["Enums"]["lead_stage"];
          updated_at?: string;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          base_price_cents: number;
          created_at: string;
          currency: string;
          deliverables_en: string | null;
          deliverables_ka: string | null;
          deposit_pct: number;
          duration_hours: number | null;
          id: string;
          name_en: string;
          name_ka: string | null;
          published: boolean;
          short_desc_en: string | null;
          short_desc_ka: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          base_price_cents?: number;
          created_at?: string;
          currency?: string;
          deliverables_en?: string | null;
          deliverables_ka?: string | null;
          deposit_pct?: number;
          duration_hours?: number | null;
          id?: string;
          name_en: string;
          name_ka?: string | null;
          published?: boolean;
          short_desc_en?: string | null;
          short_desc_ka?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          base_price_cents?: number;
          created_at?: string;
          currency?: string;
          deliverables_en?: string | null;
          deliverables_ka?: string | null;
          deposit_pct?: number;
          duration_hours?: number | null;
          id?: string;
          name_en?: string;
          name_ka?: string | null;
          published?: boolean;
          short_desc_en?: string | null;
          short_desc_ka?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          body_en: string | null;
          body_ka: string | null;
          slug: string;
          title_en: string | null;
          title_ka: string | null;
          updated_at: string;
        };
        Insert: {
          body_en?: string | null;
          body_ka?: string | null;
          slug: string;
          title_en?: string | null;
          title_ka?: string | null;
          updated_at?: string;
        };
        Update: {
          body_en?: string | null;
          body_ka?: string | null;
          slug?: string;
          title_en?: string | null;
          title_ka?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_images: {
        Row: {
          alt_text: string | null;
          caption: string | null;
          created_at: string;
          id: string;
          image_path: string;
          project_id: string;
          sort_order: number;
        };
        Insert: {
          alt_text?: string | null;
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path: string;
          project_id: string;
          sort_order?: number;
        };
        Update: {
          alt_text?: string | null;
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path?: string;
          project_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          description_en: string | null;
          description_ka: string | null;
          hero_image_path: string | null;
          id: string;
          location_en: string | null;
          location_ka: string | null;
          published: boolean;
          slug: string;
          sort_order: number;
          title_en: string;
          title_ka: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description_en?: string | null;
          description_ka?: string | null;
          hero_image_path?: string | null;
          id?: string;
          location_en?: string | null;
          location_ka?: string | null;
          published?: boolean;
          slug: string;
          sort_order?: number;
          title_en: string;
          title_ka?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description_en?: string | null;
          description_ka?: string | null;
          hero_image_path?: string | null;
          id?: string;
          location_en?: string | null;
          location_ka?: string | null;
          published?: boolean;
          slug?: string;
          sort_order?: number;
          title_en?: string;
          title_ka?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          description_en: string | null;
          description_ka: string | null;
          id: string;
          price: string | null;
          published: boolean;
          sort_order: number;
          title_en: string;
          title_ka: string | null;
          updated_at: string;
        };
        Insert: {
          description_en?: string | null;
          description_ka?: string | null;
          id?: string;
          price?: string | null;
          published?: boolean;
          sort_order?: number;
          title_en: string;
          title_ka?: string | null;
          updated_at?: string;
        };
        Update: {
          description_en?: string | null;
          description_ka?: string | null;
          id?: string;
          price?: string | null;
          published?: boolean;
          sort_order?: number;
          title_en?: string;
          title_ka?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_products: {
        Row: StoreProductRow;
        Insert: Partial<StoreProductRow> &
          Pick<StoreProductRow, "type" | "title" | "slug" | "price_cents">;
        Update: Partial<StoreProductRow>;
        Relationships: [];
      };
      store_orders: {
        Row: StoreOrderRow;
        Insert: Partial<StoreOrderRow> &
          Pick<StoreOrderRow, "buyer_email" | "total_cents">;
        Update: Partial<StoreOrderRow>;
        Relationships: [];
      };
      store_order_items: {
        Row: StoreOrderItemRow;
        Insert: Omit<StoreOrderItemRow, "id"> & { id?: string };
        Update: Partial<StoreOrderItemRow>;
        Relationships: [];
      };
      store_downloads: {
        Row: StoreDownloadRow;
        Insert: Omit<
          StoreDownloadRow,
          "id" | "downloads_used" | "max_downloads" | "last_downloaded_at"
        > & {
          id?: string;
          downloads_used?: number;
          max_downloads?: number;
          last_downloaded_at?: string | null;
        };
        Update: Partial<StoreDownloadRow>;
        Relationships: [];
      };
      blog_categories: {
        Row: BlogCategoryRow;
        Insert: Partial<BlogCategoryRow> & Pick<BlogCategoryRow, "slug">;
        Update: Partial<BlogCategoryRow>;
        Relationships: [];
      };
      blog_tags: {
        Row: BlogTagRow;
        Insert: Partial<BlogTagRow> & Pick<BlogTagRow, "slug">;
        Update: Partial<BlogTagRow>;
        Relationships: [];
      };
      blog_posts: {
        Row: BlogPostRow;
        Insert: Partial<BlogPostRow> & Pick<BlogPostRow, "slug">;
        Update: Partial<BlogPostRow>;
        Relationships: [];
      };
      blog_post_tags: {
        Row: BlogPostTagRow;
        Insert: BlogPostTagRow;
        Update: Partial<BlogPostTagRow>;
        Relationships: [];
      };
      pinterest_settings: {
        Row: PinterestSettingsRow;
        Insert: Partial<PinterestSettingsRow>;
        Update: Partial<PinterestSettingsRow>;
        Relationships: [];
      };
      pinterest_pins: {
        Row: PinterestPinRow;
        Insert: Partial<PinterestPinRow> &
          Pick<PinterestPinRow, "content_type" | "content_id">;
        Update: Partial<PinterestPinRow>;
        Relationships: [];
      };
      meta_settings: {
        Row: MetaSettingsRow;
        Insert: Partial<MetaSettingsRow>;
        Update: Partial<MetaSettingsRow>;
        Relationships: [];
      };
      meta_threads: {
        Row: MetaThreadRow;
        Insert: Partial<MetaThreadRow> &
          Pick<MetaThreadRow, "channel" | "external_id">;
        Update: Partial<MetaThreadRow>;
        Relationships: [];
      };
      meta_messages: {
        Row: MetaMessageRow;
        Insert: Partial<MetaMessageRow> &
          Pick<MetaMessageRow, "thread_id" | "direction" | "sender">;
        Update: Partial<MetaMessageRow>;
        Relationships: [];
      };
      portfolio_albums: {
        Row: PortfolioAlbumRow;
        Insert: Partial<PortfolioAlbumRow> & Pick<PortfolioAlbumRow, "slug">;
        Update: Partial<PortfolioAlbumRow>;
        Relationships: [];
      };
      project_albums: {
        Row: ProjectAlbumRow;
        Insert: ProjectAlbumRow;
        Update: Partial<ProjectAlbumRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      booking_status:
        | "inquiry"
        | "reserved"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show";
      contract_status: "draft" | "sent" | "signed" | "void";
      deposit_status: "none" | "pending" | "paid" | "refunded" | "failed";
      lead_source:
        | "contact_form"
        | "chatbot"
        | "booking"
        | "instagram"
        | "referral"
        | "manual"
        | "lead_hunter"
        | "other";
      lead_stage:
        | "lead"
        | "consultation"
        | "contract"
        | "shoot"
        | "delivery"
        | "upsell"
        | "won"
        | "lost";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<GogaDatabase, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof GogaDatabase,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "inquiry",
        "reserved",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      contract_status: ["draft", "sent", "signed", "void"],
      deposit_status: ["none", "pending", "paid", "refunded", "failed"],
      lead_source: [
        "contact_form",
        "chatbot",
        "booking",
        "instagram",
        "referral",
        "manual",
        "lead_hunter",
        "other",
      ],
      lead_stage: [
        "lead",
        "consultation",
        "contract",
        "shoot",
        "delivery",
        "upsell",
        "won",
        "lost",
      ],
    },
  },
} as const;
