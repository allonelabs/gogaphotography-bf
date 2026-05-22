/**
 * PLACEHOLDER - hand-rolled to match supabase/migrations/0001_hotel_subset.sql.
 *
 * Regenerate with the real Supabase project once it exists:
 *   npx supabase gen types typescript --project-id <project-ref> > app/lib/db/types.ts
 *
 * Until then, this hand-rolled stub keeps Tasks 15-22 typecheck-clean.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      administration: {
        Row: {
          id: number;
          username: string | null;
          password: string | null;
          first_name: string | null;
          last_name: string | null;
          first_name_en: string | null;
          last_name_en: string | null;
          father_name: string | null;
          pasport_number: string | null;
          gender: number | null;
          pasport_number_self: string | null;
          pasport_term: string | null;
          birthday: string | null;
          birth_address: string | null;
          juridical_address: string | null;
          address: string | null;
          phone_home: string | null;
          phone_work: string | null;
          phone_other: string | null;
          mobile1: string | null;
          mobile2: string | null;
          mail: string | null;
          info: string | null;
          role_id: number | null;
          organization_id: number | null;
          c_admin_position_id: number | null;
          active: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["administration"]["Row"]
        > & { mail?: string | null };
        Update: Partial<Database["public"]["Tables"]["administration"]["Row"]>;
        Relationships: [];
      };
      role: {
        Row: { id: number; name: string };
        Insert: { id?: number; name: string };
        Update: Partial<{ id: number; name: string }>;
        Relationships: [];
      };
      c_admin_position: {
        Row: { id: number; name: string };
        Insert: { id?: number; name: string };
        Update: Partial<{ id: number; name: string }>;
        Relationships: [];
      };
      setting: {
        Row: { id: number; key: string; value: string | null };
        Insert: { id?: number; key: string; value?: string | null };
        Update: Partial<{ id: number; key: string; value: string | null }>;
        Relationships: [];
      };
      c_juridical_form: {
        Row: { id: number; name: string };
        Insert: { id?: number; name: string };
        Update: Partial<{ id: number; name: string }>;
        Relationships: [];
      };
      c_hotel_group: {
        Row: { id: number; name: string };
        Insert: { id?: number; name: string };
        Update: Partial<{ id: number; name: string }>;
        Relationships: [];
      };
      cc1_country: {
        Row: { id: number; name: string; code: string | null };
        Insert: { id?: number; name: string; code?: string | null };
        Update: Partial<{ id: number; name: string; code: string | null }>;
        Relationships: [];
      };
      cc1_region: {
        Row: { id: number; cc1_country_id: number | null; name: string };
        Insert: { id?: number; cc1_country_id?: number | null; name: string };
        Update: Partial<{
          id: number;
          cc1_country_id: number | null;
          name: string;
        }>;
        Relationships: [];
      };
      cc1_city: {
        Row: { id: number; cc1_region_id: number | null; name: string };
        Insert: { id?: number; cc1_region_id?: number | null; name: string };
        Update: Partial<{
          id: number;
          cc1_region_id: number | null;
          name: string;
        }>;
        Relationships: [];
      };
      hotel: {
        Row: {
          id: number;
          type: number | null;
          name: string;
          c_juridical_form_id: number | null;
          c_hotel_group_id: number | null;
          full_name: string | null;
          identification: string | null;
          cc1_country_id: number | null;
          cc1_region_id: number | null;
          cc1_city_id: number | null;
          comment: string | null;
          hotel_range: number | null;
          main_contact_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["hotel"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["hotel"]["Row"]>;
        Relationships: [];
      };
      hotel_contact: {
        Row: {
          id: number;
          hotel_id: number | null;
          name: string | null;
          role: string | null;
          phone: string | null;
          email: string | null;
          is_primary: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["hotel_contact"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["hotel_contact"]["Row"]>;
        Relationships: [];
      };
      hotel_bank_account: {
        Row: {
          id: number;
          hotel_id: number | null;
          bank: string | null;
          account_number: string | null;
          iban: string | null;
          swift: string | null;
          currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["hotel_bank_account"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["hotel_bank_account"]["Row"]
        >;
        Relationships: [];
      };
      hotel_balance: {
        Row: {
          id: number;
          hotel_id: number | null;
          amount: number | null;
          currency: string | null;
          recorded_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["hotel_balance"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["hotel_balance"]["Row"]>;
        Relationships: [];
      };
      hotel_price_list: {
        Row: {
          id: number;
          hotel_id: number | null;
          season_from: string | null;
          season_to: string | null;
          room_type: string | null;
          price: number | null;
          currency: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["hotel_price_list"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["hotel_price_list"]["Row"]
        >;
        Relationships: [];
      };
      hotel_price_grid: {
        Row: {
          id: number;
          hotel_id: number | null;
          data: Json | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["hotel_price_grid"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["hotel_price_grid"]["Row"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
