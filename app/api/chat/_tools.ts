/**
 * Tool registry for the Travelplace operator chat (/api/chat).
 *
 * Each tool is org-scoped, permission-gated, and dispatches against the
 * Supabase service-role client already constrained to the caller's
 * organization by `createOrgScopedSupabaseClient()`.
 *
 * Convention:
 *   - Reads stamp `.eq("organization_id", ctx.orgId)` explicitly (defense
 *     in depth — RLS is on, but the service-role key bypasses it).
 *   - Writes include `organization_id: ctx.orgId` in the payload (NOT NULL
 *     constraint on every tenant table since migration 0006).
 *   - Handlers return a discriminated union so the tool-use loop can
 *     surface human-readable failures back through tool_result blocks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { callGeminiMultimodal, callLLM } from "@/app/lib/llm-fallback";
import { createResolver } from "@/app/api/hotels/import/_resolver";

export interface ChatAttachmentRef {
  name: string;
  type: string;
  path: string;
}

export interface ToolContext {
  userEmail: string;
  role: string;
  permissions: string[];
  orgId: number;
  orgName: string;
  supabase: SupabaseClient; // already org-scoped service-role client
  /** Files the user attached to this turn (path is in chat-uploads bucket). */
  attachments?: ChatAttachmentRef[];
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Permission code required, or undefined if any signed-in user may call. */
  permission?: string;
  handler: (
    input: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<ToolResult>;
}

/**
 * `display` is an optional hint for the chat UI to render the tool's structured
 * result as a table, card, badge, or quick-action pill row — instead of letting
 * the LLM's prose carry the entire payload. The LLM still sees the full `data`;
 * the client gets a shape it can lay out without parsing the assistant's text.
 *
 * `actions` is a row of in-context follow-up pills the UI can render under the
 * assistant bubble (e.g. "View hotel" → `/app/hotels/123`).
 */
export type ToolDisplay =
  | { kind: "table"; title?: string; columns: string[]; rows: unknown[][] }
  | {
      kind: "card";
      title: string;
      subtitle?: string;
      fields?: Array<{ label: string; value: string | number | null }>;
    }
  | {
      kind: "badge";
      label: string;
      value: string | number;
      tone?: "default" | "good" | "warn" | "bad";
    }
  | { kind: "text"; text: string };

export interface ToolAction {
  label: string;
  href: string;
}

export type ToolResult =
  | {
      ok: true;
      data: unknown;
      display?: ToolDisplay;
      actions?: ToolAction[];
    }
  | { ok: false; error: string };

// ── Helpers ───────────────────────────────────────────────────────────

function n(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

function s(v: unknown): string | null {
  if (typeof v === "string" && v.trim() !== "") return v;
  return null;
}

function ok(
  data: unknown,
  extras?: { display?: ToolDisplay; actions?: ToolAction[] },
): ToolResult {
  const r: ToolResult = { ok: true, data };
  if (extras?.display)
    (r as { display?: ToolDisplay }).display = extras.display;
  if (extras?.actions)
    (r as { actions?: ToolAction[] }).actions = extras.actions;
  return r;
}

function err(message: string): ToolResult {
  return { ok: false, error: message };
}

// ── Tools ─────────────────────────────────────────────────────────────

export const TOOLS: Tool[] = [
  // 1. list_hotels — search/filter ────────────────────────────────────
  {
    name: "list_hotels",
    description:
      "Search hotels in the current organization. Returns a compact list with id, name, country, city, stars, and main contact. Use when the operator asks 'show me hotels in X', 'find 5-star hotels', or wants to look something up by name. Without filters returns the most recent up to `limit` rows.",
    input_schema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Substring match on hotel name (case-insensitive).",
        },
        country: {
          type: "string",
          description: "Substring match on country name.",
        },
        region: {
          type: "string",
          description: "Substring match on region name.",
        },
        city: {
          type: "string",
          description: "Substring match on city name.",
        },
        stars: {
          type: "number",
          description: "Minimum hotel stars (0-5).",
        },
        limit: {
          type: "number",
          description: "Max rows (default 20, max 100).",
        },
      },
    },
    handler: async (input, ctx) => {
      const sb = ctx.supabase as any;
      const limit = Math.min(n(input["limit"]) ?? 20, 100);
      let q = sb
        .from("hotel")
        .select(
          `id, name, hotel_range, identification,
           country:cc1_country(name),
           region:cc1_region(name),
           city:cc1_city(name),
           main_contact:hotel_contact!main_contact_id(name)`,
        )
        .eq("organization_id", ctx.orgId)
        .order("id", { ascending: false })
        .limit(limit);
      const search = s(input["search"]);
      if (search) q = q.ilike("name", `%${search}%`);
      const stars = n(input["stars"]);
      if (stars !== null) q = q.gte("hotel_range", stars);
      // Joined-table filters via Supabase's filter on embedded table.
      const country = s(input["country"]);
      if (country) q = q.ilike("cc1_country.name", `%${country}%`);
      const region = s(input["region"]);
      if (region) q = q.ilike("cc1_region.name", `%${region}%`);
      const city = s(input["city"]);
      if (city) q = q.ilike("cc1_city.name", `%${city}%`);
      const { data, error } = await q;
      if (error) return err(error.message);
      const rows = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        stars: r.hotel_range ?? 0,
        country: r.country?.name ?? null,
        region: r.region?.name ?? null,
        city: r.city?.name ?? null,
        main_contact_name: r.main_contact?.name ?? null,
        identification: r.identification ?? null,
      }));
      // Build a chat-rendered table only when there's something to show. Cap
      // the visible row count so a 200-hotel response doesn't blow up the
      // chat bubble; the LLM still sees the full `data` for synthesis.
      const display: ToolDisplay | undefined =
        rows.length > 0
          ? {
              kind: "table",
              title:
                rows.length === 1
                  ? "1 hotel"
                  : `${rows.length} hotel${rows.length === 1 ? "" : "s"}`,
              columns: ["ID", "Name", "Stars", "Country", "City"],
              rows: rows
                .slice(0, 25)
                .map(
                  (r: {
                    id: number;
                    name: string;
                    stars: number | null;
                    country: string | null;
                    city: string | null;
                  }) => [
                    r.id,
                    r.name,
                    r.stars
                      ? "★".repeat(Math.max(0, Math.min(5, r.stars)))
                      : "—",
                    r.country ?? "—",
                    r.city ?? "—",
                  ],
                ),
            }
          : undefined;
      // Quick-jump to the first hotel detail when results are narrow.
      const actions: ToolAction[] | undefined =
        rows.length === 1 && rows[0]
          ? [{ label: "Open hotel", href: `/app/hotels/${rows[0].id}` }]
          : undefined;
      return ok({ count: rows.length, rows }, { display, actions });
    },
  },

  // 2. get_hotel — full detail incl. contacts/banks/balance ──────────
  {
    name: "get_hotel",
    description:
      "Fetch a single hotel by id, returning the parent row plus all contacts, bank accounts, and the computed balance (sold − refunded).",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Hotel id." },
      },
      required: ["id"],
    },
    handler: async (input, ctx) => {
      const id = n(input["id"]);
      if (id === null) return err("id is required");
      const sb = ctx.supabase as any;
      const { data: hotel, error: hErr } = await sb
        .from("hotel")
        .select(
          `*, group:c_hotel_group(name), country:cc1_country(name),
           region:cc1_region(name), city:cc1_city(name)`,
        )
        .eq("id", id)
        .eq("organization_id", ctx.orgId)
        .maybeSingle();
      if (hErr) return err(hErr.message);
      if (!hotel) return err(`Hotel ${id} not found in this organization`);
      const { data: contacts } = await sb
        .from("hotel_contact")
        .select("id, name, phone, email, role, is_primary")
        .eq("hotel_id", id);
      const { data: banks } = await sb
        .from("hotel_bank_account")
        .select("id, bank, account_number, iban, swift, currency")
        .eq("hotel_id", id);
      const { data: balance } = await sb
        .from("hotel_balance_computed")
        .select("total_sold, total_refunded, balance")
        .eq("hotel_id", id)
        .maybeSingle();
      return ok({
        hotel: {
          id: hotel.id,
          name: hotel.name,
          full_name: hotel.full_name,
          identification: hotel.identification,
          stars: hotel.hotel_range,
          comment: hotel.comment,
          group: hotel.group?.name ?? null,
          country: hotel.country?.name ?? null,
          region: hotel.region?.name ?? null,
          city: hotel.city?.name ?? null,
        },
        contacts: contacts ?? [],
        banks: banks ?? [],
        balance: balance ?? {
          total_sold: 0,
          total_refunded: 0,
          balance: 0,
        },
      });
    },
  },

  // 3. count_hotels ────────────────────────────────────────────────────
  {
    name: "count_hotels",
    description:
      "Return the count of hotels in the current organization, optionally filtered by country, city, or minimum stars. Use for 'how many hotels do we have in Tbilisi', 'how many 5-star'.",
    input_schema: {
      type: "object",
      properties: {
        country: { type: "string" },
        city: { type: "string" },
        stars: { type: "number", description: "Minimum stars." },
      },
    },
    handler: async (input, ctx) => {
      const sb = ctx.supabase as any;
      let q = sb
        .from("hotel")
        .select("id, country:cc1_country(name), city:cc1_city(name)", {
          count: "exact",
          head: false,
        })
        .eq("organization_id", ctx.orgId);
      const stars = n(input["stars"]);
      if (stars !== null) q = q.gte("hotel_range", stars);
      const country = s(input["country"]);
      if (country) q = q.ilike("cc1_country.name", `%${country}%`);
      const city = s(input["city"]);
      if (city) q = q.ilike("cc1_city.name", `%${city}%`);
      const { count, error } = await q;
      if (error) return err(error.message);
      return ok({ count: count ?? 0 });
    },
  },

  // 4. list_orders ─────────────────────────────────────────────────────
  {
    name: "list_orders",
    description:
      "List recent orders in the current organization with optional filters by status, hotel, client name, or date range. Returns id, order_number, client name, order_date, status, total price.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "c_semblance status filter (exact match).",
        },
        hotel_id: {
          type: "number",
          description: "Limit to orders containing this hotel in their lines.",
        },
        client_name: {
          type: "string",
          description: "Substring match on first/last name.",
        },
        date_from: {
          type: "string",
          description: "ISO date — order_date >= date_from.",
        },
        date_to: {
          type: "string",
          description: "ISO date — order_date <= date_to.",
        },
        limit: {
          type: "number",
          description: "Max rows (default 20, max 100).",
        },
      },
    },
    handler: async (input, ctx) => {
      const sb = ctx.supabase as any;
      const limit = Math.min(n(input["limit"]) ?? 20, 100);
      let q = sb
        .from("p_order")
        .select(
          `id, order_number, c_semblance, client_first_name, client_last_name,
           client_phone, order_date, c_pay_type, all_sell_price, days, in_pay,
           created_at`,
        )
        .eq("organization_id", ctx.orgId)
        .order("id", { ascending: false })
        .limit(limit);
      const status = s(input["status"]);
      if (status) q = q.eq("c_semblance", status);
      const clientName = s(input["client_name"]);
      if (clientName) {
        const t = `%${clientName}%`;
        q = q.or(`client_first_name.ilike.${t},client_last_name.ilike.${t}`);
      }
      const df = s(input["date_from"]);
      if (df) q = q.gte("order_date", df);
      const dt = s(input["date_to"]);
      if (dt) q = q.lte("order_date", dt);
      const hotelId = n(input["hotel_id"]);
      if (hotelId !== null) {
        // hotel filter: fetch ids of p_order rows referenced by p_order_hotel
        // for this hotel inside the org.
        const { data: refs, error: refErr } = await sb
          .from("p_order_hotel")
          .select("p_order_id")
          .eq("hotel_id", hotelId)
          .eq("organization_id", ctx.orgId)
          .limit(1000);
        if (refErr) return err(refErr.message);
        const ids = Array.from(
          new Set((refs ?? []).map((r: any) => r.p_order_id).filter(Boolean)),
        );
        if (ids.length === 0) return ok({ count: 0, rows: [] });
        q = q.in("id", ids);
      }
      const { data, error } = await q;
      if (error) return err(error.message);
      return ok({ count: (data ?? []).length, rows: data ?? [] });
    },
  },

  // 5. get_order — full detail with lines + tourists ──────────────────
  {
    name: "get_order",
    description:
      "Fetch a single order with all line items (hotels/avia/transfers/excursions/insurance/visas/services) and tourists.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "number" },
      },
      required: ["id"],
    },
    handler: async (input, ctx) => {
      const id = n(input["id"]);
      if (id === null) return err("id is required");
      const sb = ctx.supabase as any;
      const { data, error } = await sb
        .from("p_order")
        .select(
          `*,
           tourists:p_order_tourist(*),
           hotels:p_order_hotel(*),
           avias:p_order_avia(*),
           transfers:p_order_transfer(*),
           excursions:p_order_excursion(*),
           ensures:p_order_ensure(*),
           visas:p_order_visa(*),
           services:p_order_service(*)`,
        )
        .eq("id", id)
        .eq("organization_id", ctx.orgId)
        .maybeSingle();
      if (error) return err(error.message);
      if (!data) return err(`Order ${id} not found in this organization`);
      return ok(data);
    },
  },

  // 6. query_balance — single-hotel balance ──────────────────────────
  {
    name: "query_balance",
    description:
      "Get the computed balance for a single hotel (total sold − total refunded) from hotel_balance_computed.",
    input_schema: {
      type: "object",
      properties: {
        hotel_id: { type: "number" },
      },
      required: ["hotel_id"],
    },
    handler: async (input, ctx) => {
      const hotelId = n(input["hotel_id"]);
      if (hotelId === null) return err("hotel_id is required");
      const sb = ctx.supabase as any;
      // Confirm hotel belongs to org first (the view itself doesn't carry
      // org id, since it's derived from hotel which does).
      const { data: hotel, error: hErr } = await sb
        .from("hotel")
        .select("id, name")
        .eq("id", hotelId)
        .eq("organization_id", ctx.orgId)
        .maybeSingle();
      if (hErr) return err(hErr.message);
      if (!hotel) return err(`Hotel ${hotelId} not found in this organization`);
      const { data, error } = await sb
        .from("hotel_balance_computed")
        .select("total_sold, total_refunded, balance")
        .eq("hotel_id", hotelId)
        .maybeSingle();
      if (error) return err(error.message);
      return ok({
        hotel_id: hotelId,
        hotel_name: hotel.name,
        total_sold: data?.total_sold ?? 0,
        total_refunded: data?.total_refunded ?? 0,
        balance: data?.balance ?? 0,
      });
    },
  },

  // 7. summarize_today ─────────────────────────────────────────────────
  {
    name: "summarize_today",
    description:
      "Snapshot of org-wide KPIs: hotel count, orders created today, refunds today, and count of hotels with a positive outstanding balance. Use for 'how are things looking', 'today's summary'.",
    input_schema: {
      type: "object",
      properties: {},
    },
    handler: async (_input, ctx) => {
      const sb = ctx.supabase as any;
      const today = new Date().toISOString().slice(0, 10);
      const startOfDay = `${today}T00:00:00.000Z`;
      const [
        { count: hotelCount },
        { count: ordersToday },
        { count: refundsToday },
        { data: balances },
      ] = await Promise.all([
        sb
          .from("hotel")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", ctx.orgId),
        sb
          .from("p_order")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", ctx.orgId)
          .gte("created_at", startOfDay),
        sb
          .from("p_refund_hotel")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", ctx.orgId)
          .gte("created_at", startOfDay),
        sb.from("hotel_balance_computed").select("hotel_id, balance"),
      ]);
      const positiveBalances = Array.isArray(balances)
        ? balances.filter((b: any) => Number(b?.balance ?? 0) > 0).length
        : 0;
      return ok({
        date: today,
        hotels: hotelCount ?? 0,
        orders_today: ordersToday ?? 0,
        refunds_today: refundsToday ?? 0,
        hotels_with_positive_balance: positiveBalances,
      });
    },
  },

  // 8. search_audit — gated on audit.read ───────────────────────────
  {
    name: "search_audit",
    description:
      "Search the audit log by table, action, or actor email. Requires the audit.read permission. Returns the most recent matching rows.",
    input_schema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Exact table name." },
        action: {
          type: "string",
          enum: ["insert", "update", "delete"],
        },
        actor: {
          type: "string",
          description: "Substring of actor_email.",
        },
        limit: {
          type: "number",
          description: "Max rows (default 20, max 100).",
        },
      },
    },
    permission: "audit.read",
    handler: async (input, ctx) => {
      const sb = ctx.supabase as any;
      const limit = Math.min(n(input["limit"]) ?? 20, 100);
      let q = sb
        .from("audit_log")
        .select(
          "id, occurred_at, actor_email, action, table_name, row_id, diff",
        )
        .order("occurred_at", { ascending: false })
        .limit(limit);
      const t = s(input["table"]);
      if (t) q = q.eq("table_name", t);
      const a = s(input["action"]);
      if (a) q = q.eq("action", a);
      const actor = s(input["actor"]);
      if (actor) q = q.ilike("actor_email", `%${actor}%`);
      const { data, error } = await q;
      if (error) return err(error.message);
      return ok({ count: (data ?? []).length, rows: data ?? [] });
    },
  },

  // 9. create_hotel ────────────────────────────────────────────────────
  {
    name: "create_hotel",
    description:
      "Create a new hotel in the organization. Pass the display name and optionally country/region/city ids, hotel_range (stars 0-5), identification, and a comment.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        country_id: { type: "number" },
        region_id: { type: "number" },
        city_id: { type: "number" },
        hotel_range: { type: "number", description: "Stars 0-5." },
        identification: { type: "string" },
        comment: { type: "string" },
      },
      required: ["name"],
    },
    permission: "hotels.write",
    handler: async (input, ctx) => {
      const name = s(input["name"]);
      if (!name) return err("name is required");
      const payload: Record<string, unknown> = {
        name,
        type: 1,
        hotel_range: n(input["hotel_range"]) ?? 0,
        c_juridical_form_id: null,
        c_hotel_group_id: null,
        full_name: null,
        identification: s(input["identification"]),
        cc1_country_id: n(input["country_id"]),
        cc1_region_id: n(input["region_id"]),
        cc1_city_id: n(input["city_id"]),
        comment: s(input["comment"]),
        organization_id: ctx.orgId,
      };
      const { data, error } = await (ctx.supabase as any)
        .from("hotel")
        .insert(payload)
        .select("id, name, hotel_range")
        .single();
      if (error) return err(error.message);
      return ok({
        id: data.id,
        name: data.name,
        stars: data.hotel_range,
      });
    },
  },

  // 10. update_hotel ───────────────────────────────────────────────────
  {
    name: "update_hotel",
    description:
      "Update fields on an existing hotel by id. Pass only the fields to change.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        country_id: { type: "number" },
        region_id: { type: "number" },
        city_id: { type: "number" },
        hotel_range: { type: "number", description: "Stars 0-5." },
        identification: { type: "string" },
        comment: { type: "string" },
        main_contact_id: { type: "number" },
      },
      required: ["id"],
    },
    permission: "hotels.write",
    handler: async (input, ctx) => {
      const id = n(input["id"]);
      if (id === null) return err("id is required");
      const patch: Record<string, unknown> = {};
      if (s(input["name"])) patch["name"] = input["name"];
      if (n(input["country_id"]) !== null)
        patch["cc1_country_id"] = n(input["country_id"]);
      if (n(input["region_id"]) !== null)
        patch["cc1_region_id"] = n(input["region_id"]);
      if (n(input["city_id"]) !== null)
        patch["cc1_city_id"] = n(input["city_id"]);
      if (n(input["hotel_range"]) !== null)
        patch["hotel_range"] = n(input["hotel_range"]);
      if (s(input["identification"]))
        patch["identification"] = input["identification"];
      if (s(input["comment"])) patch["comment"] = input["comment"];
      if (n(input["main_contact_id"]) !== null)
        patch["main_contact_id"] = n(input["main_contact_id"]);
      if (Object.keys(patch).length === 0) return err("no fields to update");
      const { data, error } = await (ctx.supabase as any)
        .from("hotel")
        .update(patch)
        .eq("id", id)
        .eq("organization_id", ctx.orgId)
        .select("id, name, hotel_range")
        .single();
      if (error) return err(error.message);
      if (!data) return err(`Hotel ${id} not found in this organization`);
      return ok({ id: data.id, name: data.name, stars: data.hotel_range });
    },
  },

  // 11. add_hotel_contact ──────────────────────────────────────────────
  {
    name: "add_hotel_contact",
    description:
      "Add a new contact (sales/booking person) to a hotel. Use when the operator says 'add a contact for X', 'remember person Y at hotel Z'.",
    input_schema: {
      type: "object",
      properties: {
        hotel_id: { type: "number" },
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        position: {
          type: "string",
          description: "Role/title at the hotel.",
        },
      },
      required: ["hotel_id", "name"],
    },
    permission: "hotels.write",
    handler: async (input, ctx) => {
      const hotelId = n(input["hotel_id"]);
      const name = s(input["name"]);
      if (hotelId === null) return err("hotel_id is required");
      if (!name) return err("name is required");
      // Verify hotel belongs to org.
      const sb = ctx.supabase as any;
      const { data: hotel } = await sb
        .from("hotel")
        .select("id")
        .eq("id", hotelId)
        .eq("organization_id", ctx.orgId)
        .maybeSingle();
      if (!hotel) return err(`Hotel ${hotelId} not found in this organization`);
      const { data, error } = await sb
        .from("hotel_contact")
        .insert({
          hotel_id: hotelId,
          name,
          phone: s(input["phone"]),
          email: s(input["email"]),
          role: s(input["position"]),
          organization_id: ctx.orgId,
        })
        .select("id, name, phone, email, role")
        .single();
      if (error) return err(error.message);
      return ok(data);
    },
  },

  // 12. add_hotel_bank ─────────────────────────────────────────────────
  {
    name: "add_hotel_bank",
    description: "Add a bank account record for a hotel.",
    input_schema: {
      type: "object",
      properties: {
        hotel_id: { type: "number" },
        bank: { type: "string", description: "Bank name." },
        account_number: { type: "string" },
        iban: { type: "string" },
        swift: { type: "string" },
        currency: { type: "string", description: "ISO code, default GEL." },
      },
      required: ["hotel_id", "bank", "account_number"],
    },
    permission: "hotels.write",
    handler: async (input, ctx) => {
      const hotelId = n(input["hotel_id"]);
      const bank = s(input["bank"]);
      const account = s(input["account_number"]);
      if (hotelId === null) return err("hotel_id is required");
      if (!bank) return err("bank is required");
      if (!account) return err("account_number is required");
      const sb = ctx.supabase as any;
      const { data: hotel } = await sb
        .from("hotel")
        .select("id")
        .eq("id", hotelId)
        .eq("organization_id", ctx.orgId)
        .maybeSingle();
      if (!hotel) return err(`Hotel ${hotelId} not found in this organization`);
      const { data, error } = await sb
        .from("hotel_bank_account")
        .insert({
          hotel_id: hotelId,
          bank,
          account_number: account,
          iban: s(input["iban"]),
          swift: s(input["swift"]),
          currency: s(input["currency"]) ?? "GEL",
          organization_id: ctx.orgId,
        })
        .select("id, bank, account_number, iban, swift, currency")
        .single();
      if (error) return err(error.message);
      return ok(data);
    },
  },

  // 13. create_order ──────────────────────────────────────────────────
  {
    name: "create_order",
    description:
      "Create a new order (p_order) for a client. The order starts empty — use add_order_line to attach hotel / avia / transfer / excursion / insurance / visa / service line items afterwards.",
    input_schema: {
      type: "object",
      properties: {
        client_first_name: { type: "string" },
        client_last_name: { type: "string" },
        client_phone: { type: "string" },
        order_date: {
          type: "string",
          description: "ISO date, default today.",
        },
        c_pay_type: {
          type: "string",
          description: "Payment type label.",
        },
      },
      required: ["client_first_name", "client_last_name"],
    },
    permission: "orders.write",
    handler: async (input, ctx) => {
      const firstName = s(input["client_first_name"]);
      const lastName = s(input["client_last_name"]);
      if (!firstName) return err("client_first_name is required");
      if (!lastName) return err("client_last_name is required");
      const payload: Record<string, unknown> = {
        client_first_name: firstName,
        client_last_name: lastName,
        client_phone: s(input["client_phone"]),
        order_date:
          s(input["order_date"]) ?? new Date().toISOString().slice(0, 10),
        c_pay_type: s(input["c_pay_type"]),
        organization_id: ctx.orgId,
      };
      const { data, error } = await (ctx.supabase as any)
        .from("p_order")
        .insert(payload)
        .select(
          "id, order_number, client_first_name, client_last_name, order_date",
        )
        .single();
      if (error) return err(error.message);
      return ok(data);
    },
  },

  // 14. add_order_line ────────────────────────────────────────────────
  {
    name: "add_order_line",
    description:
      "Attach a line item to an existing order. The `vertical` field decides which p_order_<vertical> table receives the row; the relevant reference id (hotel_id / avia_id / transfer_id / excursion company_id) and price details should be passed where applicable.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "number" },
        vertical: {
          type: "string",
          enum: [
            "hotel",
            "avia",
            "transfer",
            "excursion",
            "ensure",
            "visa",
            "service",
          ],
        },
        hotel_id: { type: "number" },
        avia_id: { type: "number" },
        transfer_id: { type: "number" },
        excursion_company_id: {
          type: "number",
          description: "excursion.id — stored in company_id column.",
        },
        check_in: { type: "string", description: "ISO date (hotel)." },
        check_out: { type: "string", description: "ISO date (hotel)." },
        room_price: { type: "number", description: "Hotel room price." },
        sell_price: { type: "number" },
        currency_name: { type: "string", description: "Currency label." },
        days: { type: "number" },
        comment: { type: "string" },
      },
      required: ["order_id", "vertical"],
    },
    permission: "orders.write",
    handler: async (input, ctx) => {
      const orderId = n(input["order_id"]);
      const vertical = s(input["vertical"]);
      if (orderId === null) return err("order_id is required");
      if (!vertical) return err("vertical is required");
      const sb = ctx.supabase as any;
      // Confirm the parent order is in this org.
      const { data: parent } = await sb
        .from("p_order")
        .select("id")
        .eq("id", orderId)
        .eq("organization_id", ctx.orgId)
        .maybeSingle();
      if (!parent)
        return err(`Order ${orderId} not found in this organization`);
      const tableByVertical: Record<string, string> = {
        hotel: "p_order_hotel",
        avia: "p_order_avia",
        transfer: "p_order_transfer",
        excursion: "p_order_excursion",
        ensure: "p_order_ensure",
        visa: "p_order_visa",
        service: "p_order_service",
      };
      const table = tableByVertical[vertical];
      if (!table) return err(`Unknown vertical: ${vertical}`);
      const base: Record<string, unknown> = {
        p_order_id: orderId,
        organization_id: ctx.orgId,
      };
      // Per-vertical optional fields.
      if (vertical === "hotel") {
        if (n(input["hotel_id"]) !== null)
          base["hotel_id"] = n(input["hotel_id"]);
        if (s(input["check_in"])) base["check_in"] = input["check_in"];
        if (s(input["check_out"])) base["check_out"] = input["check_out"];
        if (n(input["room_price"]) !== null)
          base["room_price"] = n(input["room_price"]);
        if (n(input["sell_price"]) !== null)
          base["sell_price"] = n(input["sell_price"]);
        if (s(input["currency_name"]))
          base["currency_name"] = input["currency_name"];
        if (n(input["days"]) !== null) base["days"] = n(input["days"]);
      } else if (vertical === "avia") {
        if (n(input["avia_id"]) !== null) base["avia_id"] = n(input["avia_id"]);
        if (n(input["sell_price"]) !== null)
          base["ticket_price"] = n(input["sell_price"]);
      } else if (vertical === "transfer") {
        if (n(input["transfer_id"]) !== null)
          base["transfer_id"] = n(input["transfer_id"]);
        if (n(input["sell_price"]) !== null)
          base["sell_price"] = n(input["sell_price"]);
      } else if (vertical === "excursion") {
        if (n(input["excursion_company_id"]) !== null)
          base["company_id"] = n(input["excursion_company_id"]);
        if (n(input["sell_price"]) !== null)
          base["sell_price"] = n(input["sell_price"]);
      } else {
        // ensure / visa / service — keep open. Sell price + comment carry over.
        if (n(input["sell_price"]) !== null)
          base["sell_price"] = n(input["sell_price"]);
        if (s(input["comment"])) base["comment"] = input["comment"];
      }
      const { data, error } = await sb
        .from(table)
        .insert(base)
        .select("id")
        .single();
      if (error) return err(error.message);
      return ok({ id: data.id, vertical, order_id: orderId });
    },
  },

  // 15. set_hotel_main_contact ────────────────────────────────────────
  {
    name: "set_hotel_main_contact",
    description:
      "Set the main (primary) contact for a hotel — points hotel.main_contact_id at one of its existing hotel_contact rows.",
    input_schema: {
      type: "object",
      properties: {
        hotel_id: { type: "number" },
        contact_id: { type: "number" },
      },
      required: ["hotel_id", "contact_id"],
    },
    permission: "hotels.write",
    handler: async (input, ctx) => {
      const hotelId = n(input["hotel_id"]);
      const contactId = n(input["contact_id"]);
      if (hotelId === null) return err("hotel_id is required");
      if (contactId === null) return err("contact_id is required");
      const sb = ctx.supabase as any;
      // Verify the contact belongs to the same hotel within this org.
      const { data: contact } = await sb
        .from("hotel_contact")
        .select("id, hotel_id")
        .eq("id", contactId)
        .maybeSingle();
      if (!contact || contact.hotel_id !== hotelId)
        return err(`Contact ${contactId} does not belong to hotel ${hotelId}`);
      const { data, error } = await sb
        .from("hotel")
        .update({ main_contact_id: contactId })
        .eq("id", hotelId)
        .eq("organization_id", ctx.orgId)
        .select("id, name, main_contact_id")
        .single();
      if (error) return err(error.message);
      return ok(data);
    },
  },

  // ── 16. ingest_document ──────────────────────────────────────────────
  // Reads a file the user uploaded to the chat-uploads bucket and asks
  // Gemini multimodal to extract structured rows. PDFs + images go inline;
  // Excel/CSV are parsed to JSON locally first (cheaper + much higher
  // fidelity than letting the model OCR a spreadsheet). DOCX is deferred.
  {
    name: "ingest_document",
    description:
      "Read a document the user uploaded (path is shown in the user message) and extract structured rows. Supports PDF, images, Excel (xlsx/xls), and CSV. Returns an array of rows ready to feed into bulk_insert_<type>. Always inspect the preview before bulk-inserting.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Storage path of the file (taken from the 'server path:' line in the user message).",
        },
        hint: {
          type: "string",
          enum: ["hotels", "contacts", "orders", "tourists", "auto"],
          description:
            "What kind of records the document is expected to hold. 'auto' lets the model classify first.",
        },
      },
      required: ["path", "hint"],
    },
    handler: async (input, ctx) => {
      const path = s(input["path"]);
      const hintRaw = s(input["hint"]) ?? "auto";
      if (!path) return err("path is required");

      // Org-isolation: path prefix MUST start with `<orgId>/`. The upload
      // route enforces this on write; we enforce it on read as defense in
      // depth so the model can't be tricked into reading another tenant's
      // file by hallucinating a path.
      if (!path.startsWith(`${ctx.orgId}/`)) {
        return err(`path does not belong to this organization`);
      }
      const allowedHints = [
        "hotels",
        "contacts",
        "orders",
        "tourists",
        "auto",
      ] as const;
      const hint = (allowedHints as readonly string[]).includes(hintRaw)
        ? (hintRaw as (typeof allowedHints)[number])
        : "auto";

      // Download from Storage.
      const sb = ctx.supabase as any;
      const { data: blob, error: dlErr } = await sb.storage
        .from("chat-uploads")
        .download(path);
      if (dlErr || !blob) {
        return err(`could not read file: ${dlErr?.message ?? "no blob"}`);
      }
      const buf = Buffer.from(await blob.arrayBuffer());
      const lowerName = path.toLowerCase();
      const isPdf = lowerName.endsWith(".pdf");
      const isImage =
        lowerName.endsWith(".png") ||
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        lowerName.endsWith(".webp");
      const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
      const isCsv = lowerName.endsWith(".csv");
      const isTxt = lowerName.endsWith(".txt");
      const isDocx = lowerName.endsWith(".docx") || lowerName.endsWith(".doc");
      if (isDocx) {
        return err(
          "DOCX is not yet supported. Save the document as PDF or paste the contents directly.",
        );
      }

      // Per-hint schema prompt. Each describes ONLY the row shape; the
      // wrapper prompt below adds the "output JSON array only" framing.
      const schemaByHint: Record<string, string> = {
        hotels:
          "Each hotel row has: name (required string), full_name (string?), identification (string?), country (string?), region (string?), city (string?), hotel_range (integer 0-5?), comment (string?), juridical_form (string?), hotel_group (string?).",
        contacts:
          "Each contact row has: name (required string), position (string?), phone (string?), email (string?), mobile (string?), address (string?).",
        orders:
          "Each order row has: client_first_name (required), client_last_name (required), client_phone (string?), order_date (ISO date string?), c_pay_type (string?), line_items (array of { vertical: 'hotel'|'avia'|'transfer'|'excursion'|'ensure'|'visa'|'service', hotel_name?, sell_price?, check_in?, check_out?, days? })?.",
        tourists:
          "Each tourist row has: p_order_id (integer?), first_name (required), last_name (required), passport_number (string?), birthday (ISO date string?).",
      };

      // Step 1: classify if auto.
      let resolvedHint = hint as Exclude<typeof hint, "auto">;
      if (hint === "auto") {
        // Tiny classify call. For Excel/CSV we already have JSON rows;
        // we send the first few rows as text. For PDF/image we pass the
        // file to Gemini and ask which category it best matches.
        if (isExcel || isCsv) {
          const sheets = parseSpreadsheet(buf, isCsv);
          const sample = sheets[0]?.rows.slice(0, 3) ?? [];
          if (sample.length === 0) {
            return err("spreadsheet has no data rows on its first sheet");
          }
          const cls = await classifyText(JSON.stringify(sample));
          if (cls === "unknown") {
            return err(
              "Could not classify the document automatically. Please tell me whether it's hotels, contacts, orders, or tourists.",
            );
          }
          resolvedHint = cls;
        } else if (isPdf || isImage) {
          const cls = await classifyMultimodal(buf, mimeForPath(lowerName));
          if (cls === "unknown") {
            return err(
              "Could not classify the document automatically. Please tell me whether it's hotels, contacts, orders, or tourists.",
            );
          }
          resolvedHint = cls;
        } else if (isTxt) {
          const text = buf.toString("utf-8").slice(0, 4000);
          const cls = await classifyText(text);
          if (cls === "unknown") {
            return err(
              "Could not classify the plain-text document. Please specify hotels / contacts / orders / tourists.",
            );
          }
          resolvedHint = cls;
        } else {
          return err(
            `unsupported file type for ingestion: ${lowerName.split(".").pop()}`,
          );
        }
      }

      const schemaPrompt = schemaByHint[resolvedHint]!;

      // Step 2: extract.
      let rowsJson: string;
      try {
        if (isExcel || isCsv) {
          const sheets = parseSpreadsheet(buf, isCsv);
          // Flatten all sheets to one big array of source rows.
          const flat = sheets.flatMap((s) => s.rows);
          if (flat.length === 0) {
            return err("spreadsheet has no rows to import");
          }
          const prompt =
            `Map the spreadsheet rows below to a JSON array of ${resolvedHint} records.\n` +
            `${schemaPrompt}\n\n` +
            `Be lenient with column names (e.g. "Hotel Name", "name", "სასტუმრო" all map to name; "Stars", "Range" map to hotel_range). ` +
            `Skip rows that are clearly header re-runs or empty. ` +
            `Output ONLY a JSON array (no prose, no markdown), where each element is one ${resolvedHint} record.\n\n` +
            `Rows:\n${JSON.stringify(flat).slice(0, 60_000)}`;
          const r = await callLLM({
            system:
              "You are a precise data-extraction engine. Output ONLY JSON.",
            messages: [{ role: "user", content: prompt }],
            jsonMode: true,
            maxTokens: 4096,
            models: { gemini: "gemini-2.5-flash" },
          });
          rowsJson = r.text;
        } else if (isPdf || isImage) {
          const prompt =
            `Extract a JSON array of ${resolvedHint} records from this document.\n` +
            `${schemaPrompt}\n\n` +
            `Output ONLY a JSON array (no prose, no markdown).`;
          rowsJson = await callGeminiMultimodal({
            system:
              "You are a precise data-extraction engine. Output ONLY JSON.",
            prompt,
            file: {
              mimeType: mimeForPath(lowerName),
              base64: buf.toString("base64"),
            },
            jsonMode: true,
            maxTokens: 4096,
            model: "gemini-2.5-flash",
          });
        } else if (isTxt) {
          const text = buf.toString("utf-8").slice(0, 60_000);
          const prompt =
            `Extract a JSON array of ${resolvedHint} records from this text.\n` +
            `${schemaPrompt}\n\n` +
            `Output ONLY a JSON array (no prose, no markdown).\n\nText:\n${text}`;
          const r = await callLLM({
            system:
              "You are a precise data-extraction engine. Output ONLY JSON.",
            messages: [{ role: "user", content: prompt }],
            jsonMode: true,
            maxTokens: 4096,
            models: { gemini: "gemini-2.5-flash" },
          });
          rowsJson = r.text;
        } else {
          return err(`unsupported file type: ${lowerName.split(".").pop()}`);
        }
      } catch (e) {
        return err(
          `extraction failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }

      // Parse JSON. The model occasionally wraps with markdown fences
      // despite the instruction; strip those defensively.
      const stripped = rowsJson
        .trim()
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();
      let rows: unknown;
      try {
        rows = JSON.parse(stripped);
      } catch {
        return err(
          `could not parse document as JSON: ${stripped.slice(0, 200)}`,
        );
      }
      // Some models return { rows: [...] } even when told to emit a bare
      // array. Unwrap a single-key object whose value is an array.
      if (!Array.isArray(rows) && typeof rows === "object" && rows !== null) {
        const vals = Object.values(rows as Record<string, unknown>);
        const arr = vals.find((v) => Array.isArray(v));
        if (Array.isArray(arr)) rows = arr;
      }
      if (!Array.isArray(rows)) {
        return err("model output is not a JSON array");
      }
      return ok({
        hint: resolvedHint,
        count: rows.length,
        preview: rows.slice(0, 3),
        rows,
      });
    },
  },

  // ── 17. bulk_insert_hotels ──────────────────────────────────────────
  {
    name: "bulk_insert_hotels",
    description:
      "Bulk-create hotels from rows extracted by ingest_document. Each row may carry catalog names (country/region/city/juridical_form/hotel_group) which will be resolved or created on the fly. Returns the inserted count + how many catalog rows were created.",
    input_schema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          description:
            "Array of hotel records (the `rows` field from ingest_document output).",
          items: { type: "object" },
        },
      },
      required: ["rows"],
    },
    permission: "hotels.write",
    handler: async (input, ctx) => {
      const rowsIn = input["rows"];
      if (!Array.isArray(rowsIn) || rowsIn.length === 0) {
        return err("rows is required (non-empty array)");
      }
      const sb = ctx.supabase as any;
      const resolver = createResolver(sb);
      const payloads: Record<string, unknown>[] = [];
      try {
        for (const raw of rowsIn) {
          const r = (raw ?? {}) as Record<string, unknown>;
          const name = s(r["name"]);
          if (!name) continue; // silently skip nameless rows
          const countryId = await resolver.countryByName(
            (s(r["country"]) ?? null) as any,
          );
          const regionId = await resolver.regionByName(
            countryId,
            (s(r["region"]) ?? null) as any,
          );
          const cityId = await resolver.cityByName(
            regionId,
            (s(r["city"]) ?? null) as any,
          );
          const juridicalId = await resolver.juridicalFormByName(
            (s(r["juridical_form"]) ?? null) as any,
          );
          const groupId = await resolver.hotelGroupByName(
            (s(r["hotel_group"]) ?? null) as any,
          );
          payloads.push({
            name,
            type: 1,
            full_name: s(r["full_name"]),
            identification: s(r["identification"]),
            comment: s(r["comment"]),
            hotel_range: n(r["hotel_range"]) ?? 0,
            c_juridical_form_id: juridicalId,
            c_hotel_group_id: groupId,
            cc1_country_id: countryId,
            cc1_region_id: regionId,
            cc1_city_id: cityId,
            organization_id: ctx.orgId,
          });
        }
      } catch (e) {
        return err(
          `catalog resolver failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      if (payloads.length === 0) return err("no valid hotel rows to insert");
      const { data, error } = await sb
        .from("hotel")
        .insert(payloads)
        .select("id, name");
      if (error) return err(error.message);
      return ok({
        inserted: data?.length ?? 0,
        ids: (data ?? []).map((r: any) => r.id),
        createdCatalogs: resolver.stats,
      });
    },
  },

  // ── 18. bulk_insert_contacts ────────────────────────────────────────
  {
    name: "bulk_insert_contacts",
    description:
      "Bulk-create hotel contacts attached to a given hotel. Use after ingest_document for a contact list page.",
    input_schema: {
      type: "object",
      properties: {
        hotel_id: { type: "number" },
        rows: {
          type: "array",
          description:
            "Array of contact records (name required; phone/email/position/mobile/address optional).",
          items: { type: "object" },
        },
      },
      required: ["hotel_id", "rows"],
    },
    permission: "hotels.write",
    handler: async (input, ctx) => {
      const hotelId = n(input["hotel_id"]);
      const rowsIn = input["rows"];
      if (hotelId === null) return err("hotel_id is required");
      if (!Array.isArray(rowsIn) || rowsIn.length === 0) {
        return err("rows is required (non-empty array)");
      }
      const sb = ctx.supabase as any;
      // Confirm the parent hotel belongs to this org before insert.
      const { data: hotel } = await sb
        .from("hotel")
        .select("id")
        .eq("id", hotelId)
        .eq("organization_id", ctx.orgId)
        .maybeSingle();
      if (!hotel) {
        return err(`Hotel ${hotelId} not found in this organization`);
      }
      const payloads: Record<string, unknown>[] = [];
      for (const raw of rowsIn as unknown[]) {
        const r = (raw ?? {}) as Record<string, unknown>;
        const name = s(r["name"]);
        if (!name) continue;
        payloads.push({
          hotel_id: hotelId,
          name,
          role: s(r["position"]),
          phone: s(r["phone"]) ?? s(r["mobile"]),
          email: s(r["email"]),
          organization_id: ctx.orgId,
        });
      }
      if (payloads.length === 0) return err("no valid contact rows to insert");
      const { data, error } = await sb
        .from("hotel_contact")
        .insert(payloads)
        .select("id");
      if (error) return err(error.message);
      return ok({
        inserted: data?.length ?? 0,
        hotel_id: hotelId,
      });
    },
  },

  // ── 19. bulk_insert_orders ──────────────────────────────────────────
  {
    name: "bulk_insert_orders",
    description:
      "Bulk-create orders from rows extracted by ingest_document. Each row may include nested line_items[] which are inserted into p_order_<vertical>. Returns the count of parent orders + child line items inserted.",
    input_schema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          description:
            "Array of order records (client_first_name, client_last_name required; line_items[] optional).",
          items: { type: "object" },
        },
      },
      required: ["rows"],
    },
    permission: "orders.write",
    handler: async (input, ctx) => {
      const rowsIn = input["rows"];
      if (!Array.isArray(rowsIn) || rowsIn.length === 0) {
        return err("rows is required (non-empty array)");
      }
      const sb = ctx.supabase as any;
      const orderTable: Record<string, string> = {
        hotel: "p_order_hotel",
        avia: "p_order_avia",
        transfer: "p_order_transfer",
        excursion: "p_order_excursion",
        ensure: "p_order_ensure",
        visa: "p_order_visa",
        service: "p_order_service",
      };
      let parentInserted = 0;
      let lineInserted = 0;
      const errors: string[] = [];

      for (const raw of rowsIn as unknown[]) {
        const r = (raw ?? {}) as Record<string, unknown>;
        const firstName = s(r["client_first_name"]);
        const lastName = s(r["client_last_name"]);
        if (!firstName || !lastName) continue;
        const payload: Record<string, unknown> = {
          client_first_name: firstName,
          client_last_name: lastName,
          client_phone: s(r["client_phone"]),
          order_date:
            s(r["order_date"]) ?? new Date().toISOString().slice(0, 10),
          c_pay_type: s(r["c_pay_type"]),
          organization_id: ctx.orgId,
        };
        const { data: parent, error: pErr } = await sb
          .from("p_order")
          .insert(payload)
          .select("id")
          .single();
        if (pErr || !parent) {
          errors.push(pErr?.message ?? "insert returned no row");
          continue;
        }
        parentInserted++;
        const lines = r["line_items"];
        if (Array.isArray(lines)) {
          for (const lRaw of lines as unknown[]) {
            const l = (lRaw ?? {}) as Record<string, unknown>;
            const vertical = s(l["vertical"]);
            if (!vertical) continue;
            const table = orderTable[vertical];
            if (!table) continue;
            const base: Record<string, unknown> = {
              p_order_id: parent.id,
              organization_id: ctx.orgId,
            };
            if (vertical === "hotel") {
              if (n(l["hotel_id"]) !== null)
                base["hotel_id"] = n(l["hotel_id"]);
              if (s(l["check_in"])) base["check_in"] = l["check_in"];
              if (s(l["check_out"])) base["check_out"] = l["check_out"];
              if (n(l["sell_price"]) !== null)
                base["sell_price"] = n(l["sell_price"]);
              if (n(l["days"]) !== null) base["days"] = n(l["days"]);
            } else if (vertical === "avia") {
              if (n(l["sell_price"]) !== null)
                base["ticket_price"] = n(l["sell_price"]);
            } else {
              if (n(l["sell_price"]) !== null)
                base["sell_price"] = n(l["sell_price"]);
              if (s(l["comment"])) base["comment"] = l["comment"];
            }
            const { error: lErr } = await sb.from(table).insert(base);
            if (lErr) {
              errors.push(`${table}: ${lErr.message}`);
              continue;
            }
            lineInserted++;
          }
        }
      }
      if (parentInserted === 0) {
        return err(
          `no orders inserted${errors.length > 0 ? `: ${errors[0]}` : ""}`,
        );
      }
      return ok({
        inserted: parentInserted,
        lineItems: lineInserted,
        errors: errors.slice(0, 5),
      });
    },
  },
  // N. send_email — queue an outbound email through the outbox ─────────
  {
    name: "send_email",
    description:
      "Queue an outbound transactional email to a single recipient. The email is enqueued onto the outbox and delivered by the drain (cron + inline). Use when the operator asks 'send X an email saying Y' or wants to follow up with a client. Returns the outbox event id; delivery status is observable in the email_log table.",
    permission: "email.send",
    input_schema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address. Required.",
        },
        subject: {
          type: "string",
          description: "Subject line. Required.",
        },
        body: {
          type: "string",
          description:
            "Email body — plain text or HTML. Plain text is wrapped in a minimal <p> shell automatically.",
        },
      },
      required: ["to", "subject", "body"],
    },
    handler: async (input, ctx) => {
      const to = s(input["to"]);
      const subject = s(input["subject"]);
      const body = s(input["body"]);
      if (!to || !subject || !body) {
        return err("send_email requires `to`, `subject`, and `body`.");
      }
      try {
        const { sendEmail } = await import("@/app/lib/email/send");
        const html = body.trim().startsWith("<")
          ? body
          : `<p>${body.replace(/\n/g, "<br>")}</p>`;
        const r = await sendEmail({
          to,
          subject,
          html,
          text: body,
          organization_id: ctx.orgId,
        });
        return ok({
          outboxEventId: r.outboxEventId,
          emailLogId: r.emailLogId,
          status: "queued",
        });
      } catch (e) {
        return err((e as Error).message);
      }
    },
  },

  // fetch_url — chat browses the web ───────────────────────────────────
  {
    name: "fetch_url",
    description:
      "Read a public web page and return its title, description, OG image, and extracted text (HTML stripped, scripts removed). Use when the operator asks 'summarize this page', 'what does X.com say about Y', 'read this hotel's reviews on booking.com', or to verify a fact from an external source. Refuses private/loopback hosts (SSRF guard). Max 4 MB response, 15 s timeout, output text capped at 8000 chars.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Full http(s) URL to fetch.",
        },
      },
      required: ["url"],
    },
    handler: async (input) => {
      const { fetchUrlReadable } = await import("@/app/lib/url-fetch");
      const url = String(input["url"] ?? "").trim();
      const res = await fetchUrlReadable(url);
      if (!res.ok) return err(res.error);
      const d = res.data;
      let host = "";
      try {
        host = new URL(d.finalUrl).host.replace(/^www\./, "");
      } catch {
        /* ignore */
      }
      return ok(d, {
        display: {
          kind: "card",
          title: d.title || host || url,
          subtitle: d.description || undefined,
          fields: [
            { label: "Host", value: host || "—" },
            { label: "Status", value: d.status },
            { label: "Read in", value: `${d.elapsedMs}ms` },
            ...(d.truncated
              ? [{ label: "Note", value: "text truncated to 8000 chars" }]
              : []),
          ],
        },
        actions: [{ label: "Open", href: d.finalUrl }],
      });
    },
  },

  // generate_image — Vertex Imagen via existing GCP creds ──────────────
  {
    name: "generate_image",
    description:
      "Generate a marketing image with Vertex Imagen. Use when the operator says 'make a photo of X', 'generate a banner for Y hotel', 'draft a social post visual for our Tbilisi tour'. Returns a base64 PNG via Imagen 4. Permission: chat.image (defaults granted to admin + manager). Costs ~$0.04 per image — uses GCP project budget.",
    input_schema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "What to draw. Be specific about scene, mood, lighting, framing. English works best.",
        },
        aspectRatio: {
          type: "string",
          enum: ["1:1", "9:16", "16:9", "4:3", "3:4"],
          description: "Image aspect ratio (default 16:9).",
        },
      },
      required: ["prompt"],
    },
    permission: "chat.image",
    handler: async (input) => {
      const { generateImage } = await import("@/app/lib/image-gen");
      const prompt = String(input["prompt"] ?? "");
      const aspectRatio = input["aspectRatio"] as
        | "1:1"
        | "9:16"
        | "16:9"
        | "4:3"
        | "3:4"
        | undefined;
      const res = await generateImage({ prompt, aspectRatio });
      if (!res.ok) return err(res.error);
      // Don't put base64 into the LLM context (would blow tokens). Return a
      // data: URL the UI can render directly; the model only sees metadata.
      const dataUrl = `data:${res.data.mimeType};base64,${res.data.base64}`;
      return ok(
        {
          model: res.data.model,
          mimeType: res.data.mimeType,
          elapsedMs: res.data.elapsedMs,
          note: "Image generated and rendered in the chat. Confirm to the user.",
        },
        {
          display: {
            kind: "card",
            title: prompt.slice(0, 80),
            subtitle: `${res.data.model} · ${res.data.elapsedMs}ms`,
            fields: [
              { label: "Model", value: res.data.model },
              { label: "Format", value: res.data.mimeType },
            ],
          },
          actions: [{ label: "View image", href: dataUrl }],
        },
      );
    },
  },

  // remember_memory — persist org-level knowledge (preferences/facts/playbooks/references)
  {
    name: "remember_memory",
    description:
      "Save a piece of knowledge to this organization's long-term memory so future chats know it. Use when the operator says 'remember that...', 'always quote in USD', 'Mr. Adamia prefers sea-view', 'our default markup is 15%'. Auto-classifies by content (preference / fact / playbook / reference). Returns the slug so you can confirm.",
    input_schema: {
      type: "object",
      properties: {
        body: {
          type: "string",
          description:
            "The thing to remember, in 1-3 sentences. Plain prose. Don't include 'remember that'.",
        },
        type: {
          type: "string",
          enum: ["preference", "fact", "playbook", "reference"],
          description:
            "Optional explicit type. Leave blank to auto-detect. preference = how we work; fact = specific data; playbook = multi-step procedure; reference = pointer to external system.",
        },
        title: {
          type: "string",
          description:
            "Optional short title (≤60 chars). Defaults to first line of body.",
        },
      },
      required: ["body"],
    },
    handler: async (input, ctx) => {
      const body = String(input["body"] ?? "").trim();
      if (!body) return err("body required");
      const explicitType = input["type"] as
        | "preference"
        | "fact"
        | "playbook"
        | "reference"
        | undefined;
      const type = explicitType ?? guessMemoryType(body);
      const firstLine = body.split("\n")[0].trim();
      const title = (
        String(input["title"] ?? "").trim() ||
        firstLine.replace(/^#+\s*/, "").slice(0, 60) ||
        "untitled"
      ).slice(0, 60);
      const slug = `${type}-${slugify(title)}`.slice(0, 80);
      const description = firstLine.replace(/^#+\s*/, "").slice(0, 140);
      const sb = ctx.supabase as unknown as { from: (t: string) => unknown };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (sb as any)
        .from("org_memory")
        .upsert(
          {
            organization_id: ctx.orgId,
            slug,
            type,
            description,
            body,
            created_by: ctx.userEmail,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,slug" },
        )
        .select("id, slug, type, description")
        .single();
      if (error) return err(error.message);
      return ok(data, {
        display: {
          kind: "badge",
          label: "Saved",
          value: `${type}: ${title}`,
          tone: "good",
        },
      });
    },
  },

  // recall_memory — fetch relevant memories
  {
    name: "recall_memory",
    description:
      "Search this organization's long-term memory for relevant facts/preferences/playbooks. Use when you need context the user might have told you in a previous conversation (their default currency, a client's preferences, an internal procedure). The system prompt already includes the top 10 recent memories — only call this tool if you need more specific results.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text search across description and body. Empty returns the most-recent rows.",
        },
        type: {
          type: "string",
          enum: ["preference", "fact", "playbook", "reference"],
          description: "Optional type filter.",
        },
        limit: {
          type: "number",
          description: "Max rows (default 10, max 50).",
        },
      },
    },
    handler: async (input, ctx) => {
      const sb = ctx.supabase as unknown as { from: (t: string) => unknown };
      const limit = Math.min(n(input["limit"]) ?? 10, 50);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (sb as any)
        .from("org_memory")
        .select("id, slug, type, description, body, updated_at")
        .eq("organization_id", ctx.orgId)
        .order("updated_at", { ascending: false })
        .limit(limit);
      const query = s(input["query"]);
      if (query) {
        // Use plain ilike — Postgres full-text would be better but ilike is
        // good enough for a few hundred memories and doesn't need extra plumbing.
        q = q.or(`description.ilike.%${query}%,body.ilike.%${query}%`);
      }
      const typeFilter = s(input["type"]);
      if (typeFilter) q = q.eq("type", typeFilter);
      const { data, error } = await q;
      if (error) return err(error.message);
      const rows = (data ?? []) as Array<{
        slug: string;
        type: string;
        description: string;
        body: string;
      }>;
      return ok(rows, {
        display:
          rows.length > 0
            ? {
                kind: "table",
                title: `${rows.length} memor${rows.length === 1 ? "y" : "ies"}`,
                columns: ["Type", "Description"],
                rows: rows.map((r) => [r.type, r.description]),
              }
            : { kind: "text", text: "No memories match." },
      });
    },
  },

  // forget_memory — delete a single memory by slug
  {
    name: "forget_memory",
    description:
      "Remove a stored memory by slug. Use only when the operator explicitly asks to forget. Returns whether anything was deleted.",
    input_schema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "The slug returned by remember_memory or recall_memory.",
        },
      },
      required: ["slug"],
    },
    handler: async (input, ctx) => {
      const slug = String(input["slug"] ?? "");
      if (!slug) return err("slug required");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error, count } = await (ctx.supabase as any)
        .from("org_memory")
        .delete({ count: "exact" })
        .eq("organization_id", ctx.orgId)
        .eq("slug", slug);
      if (error) return err(error.message);
      return ok({ deleted: count ?? 0 });
    },
  },

  // web_search — DuckDuckGo HTML scrape, no API key needed
  {
    name: "web_search",
    description:
      "MANDATORY general-purpose web search via DuckDuckGo. CALL THIS whenever the user asks you to look something up online, on the internet, on Google, on a hotel-booking site, or for anything you don't have via CRM tools. NEVER reply 'I can't search the internet' — you HAVE this tool. Triggers to call this tool: English keywords ('search', 'google', 'find online', 'look up', 'on the web', 'on the internet'). Georgian keywords: 'მოძებნე', 'ინტერნეტში', 'ვებში', 'ნახე', 'მოიძიე', 'მონახე' — ALL of these mean SEARCH and you MUST call web_search. Returns top 5-8 results. To read a specific URL in full, follow with fetch_url. If you find what looks like hotels/restaurants/flights matching the user's query, report the results — never reply 'I couldn't find anything' before actually calling the tool.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query in plain text. English or Georgian both work — DuckDuckGo handles both.",
        },
      },
      required: ["query"],
    },
    handler: async (input) => {
      const query = String(input["query"] ?? "").trim();
      if (!query) return err("query required");
      try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 TravelplaceBot/1.0",
            "accept-language": "en-US,en;q=0.9,ka;q=0.8",
          },
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) return err(`duckduckgo HTTP ${res.status}`);
        const html = await res.text();
        // Parse DuckDuckGo HTML results. Each result: <a class="result__a" href="...">title</a> ... <a class="result__snippet">snippet</a>
        const results: Array<{ title: string; url: string; snippet: string }> =
          [];
        const re =
          /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
        let m: RegExpExecArray | null;
        let count = 0;
        while ((m = re.exec(html)) && count < 8) {
          const rawUrl = m[1];
          const title = m[2]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          const snippet = m[3]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          // DuckDuckGo wraps URLs in a redirect — extract the real one
          let realUrl = rawUrl;
          try {
            const u = new URL(rawUrl, "https://duckduckgo.com");
            const uddg = u.searchParams.get("uddg");
            if (uddg) realUrl = decodeURIComponent(uddg);
          } catch {
            /* keep rawUrl */
          }
          if (title && realUrl) {
            results.push({ title, url: realUrl, snippet });
            count++;
          }
        }
        if (results.length === 0) {
          return ok(
            { query, results: [] },
            {
              display: { kind: "text", text: `No results for "${query}"` },
            },
          );
        }
        return ok(
          { query, results },
          {
            display: {
              kind: "table",
              title: `${results.length} results for "${query}"`,
              columns: ["Title", "URL"],
              rows: results.map((r) => [
                r.title.slice(0, 80),
                r.url.slice(0, 60),
              ]),
            },
          },
        );
      } catch (e) {
        return err(`search failed: ${(e as Error).message}`);
      }
    },
  },
];

// ── Memory helpers ──────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function guessMemoryType(
  body: string,
): "preference" | "fact" | "playbook" | "reference" {
  const lower = body.toLowerCase();
  // Playbook — multi-step procedures
  if (
    /\b(when\s.+\s(then|do)|step\s\d|first\s.+\sthen|workflow|procedure)\b/.test(
      lower,
    )
  )
    return "playbook";
  // Preference — how we work
  if (
    /\b(always|never|prefer|default|usually|standard|policy|markup|rule)\b/.test(
      lower,
    )
  )
    return "preference";
  // Reference — pointer to external system
  if (
    /\b(keychain|api|url|http|endpoint|dashboard|portal|account|@|\.com|\.ge)\b/.test(
      lower,
    )
  )
    return "reference";
  // Default = fact
  return "fact";
}

/**
 * Fetch the top-N most-recent memories for the current org. Called by
 * `/api/chat/route.ts` at conversation start to prime the system prompt
 * with operator-set context the LLM should always know about.
 */
export async function loadOrgMemories(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: number,
  limit: number = 10,
): Promise<Array<{ type: string; description: string; body: string }>> {
  const { data } = await supabase
    .from("org_memory")
    .select("type, description, body")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Array<{
    type: string;
    description: string;
    body: string;
  }>;
}

// ── Spreadsheet / classification helpers ────────────────────────────────

function parseSpreadsheet(
  buf: Buffer,
  csv: boolean,
): Array<{ name: string; rows: Record<string, unknown>[] }> {
  const wb = csv
    ? XLSX.read(buf.toString("utf-8"), { type: "string" })
    : XLSX.read(buf, { type: "buffer" });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    if (!ws) return { name, rows: [] };
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
      raw: false,
    });
    return { name, rows };
  });
}

function mimeForPath(p: string): string {
  if (p.endsWith(".pdf")) return "application/pdf";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

type IngestKind = "hotels" | "contacts" | "orders" | "tourists" | "unknown";

async function classifyText(sample: string): Promise<IngestKind> {
  const r = await callLLM({
    system:
      "Classify input as one of: hotels, contacts, orders, tourists, unknown. Reply with ONLY the single word.",
    messages: [
      {
        role: "user",
        content: `Classify this data sample.\n\n${sample.slice(0, 2000)}`,
      },
    ],
    maxTokens: 8,
    models: { gemini: "gemini-2.5-flash" },
  });
  return normalizeKind(r.text);
}

async function classifyMultimodal(
  buf: Buffer,
  mimeType: string,
): Promise<IngestKind> {
  const text = await callGeminiMultimodal({
    system:
      "Classify the document as one of: hotels, contacts, orders, tourists, unknown. Reply with ONLY the single word.",
    prompt: "Classify this document.",
    file: { mimeType, base64: buf.toString("base64") },
    maxTokens: 8,
    model: "gemini-2.5-flash",
  });
  return normalizeKind(text);
}

function normalizeKind(raw: string): IngestKind {
  const t = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (t === "hotels" || t === "hotel") return "hotels";
  if (t === "contacts" || t === "contact") return "contacts";
  if (t === "orders" || t === "order") return "orders";
  if (t === "tourists" || t === "tourist") return "tourists";
  return "unknown";
}
