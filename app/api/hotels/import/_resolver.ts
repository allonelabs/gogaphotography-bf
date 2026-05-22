import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/db/types";

/**
 * Resolver — converts catalog NAMES (as supplied in a hotel-import row)
 * into the corresponding catalog row IDs. If the catalog row doesn't
 * exist yet it CREATES it (upsert-by-name) and returns the new id.
 *
 * This is the classic "create-on-import" pattern: an admin uploads a
 * spreadsheet referencing a city we don't have yet, and rather than
 * 400ing we just add the city to the catalog and link the hotel to it.
 *
 * Lookups are case-insensitive (`ilike`). Each method memoises by the
 * normalized name (+ parent id for hierarchical catalogs) so a 500-row
 * import doesn't hit the DB 500 times for "Georgia".
 *
 * Returned stats are aggregated across all methods so the route can
 * report e.g. `createdCatalogs.countries = 2` to the UI.
 */
export interface CreatedCatalogStats {
  countries: number;
  regions: number;
  cities: number;
  juridical_forms: number;
  hotel_groups: number;
}

export interface Resolver {
  juridicalFormByName(name: string | null | undefined): Promise<number | null>;
  hotelGroupByName(name: string | null | undefined): Promise<number | null>;
  countryByName(name: string | null | undefined): Promise<number | null>;
  regionByName(
    countryId: number | null,
    name: string | null | undefined,
  ): Promise<number | null>;
  cityByName(
    regionId: number | null,
    name: string | null | undefined,
  ): Promise<number | null>;
  stats: CreatedCatalogStats;
}

type DB = SupabaseClient<Database>;

function norm(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t === "" ? null : t;
}

export function createResolver(supabase: DB): Resolver {
  const stats: CreatedCatalogStats = {
    countries: 0,
    regions: 0,
    cities: 0,
    juridical_forms: 0,
    hotel_groups: 0,
  };

  const cache = {
    juridical: new Map<string, number>(),
    group: new Map<string, number>(),
    country: new Map<string, number>(),
    region: new Map<string, number>(), // key: `${countryId ?? "_"}::${name}`
    city: new Map<string, number>(), // key: `${regionId ?? "_"}::${name}`
  };

  async function flatLookup(
    table: "c_juridical_form" | "c_hotel_group" | "cc1_country",
    name: string,
  ): Promise<number | null> {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .ilike("name", name)
      .limit(1);
    if (error) throw new Error(`${table} lookup failed: ${error.message}`);
    return data && data.length > 0 ? (data[0].id as number) : null;
  }

  async function flatInsert(
    table: "c_juridical_form" | "c_hotel_group",
    name: string,
  ): Promise<number> {
    const { data, error } = await supabase
      .from(table)
      .insert({ name })
      .select("id")
      .single();
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
    return data.id as number;
  }

  return {
    stats,

    async juridicalFormByName(rawName) {
      const name = norm(rawName);
      if (!name) return null;
      const key = name.toLowerCase();
      if (cache.juridical.has(key)) return cache.juridical.get(key)!;
      let id = await flatLookup("c_juridical_form", name);
      if (id == null) {
        id = await flatInsert("c_juridical_form", name);
        stats.juridical_forms++;
      }
      cache.juridical.set(key, id);
      return id;
    },

    async hotelGroupByName(rawName) {
      const name = norm(rawName);
      if (!name) return null;
      const key = name.toLowerCase();
      if (cache.group.has(key)) return cache.group.get(key)!;
      let id = await flatLookup("c_hotel_group", name);
      if (id == null) {
        id = await flatInsert("c_hotel_group", name);
        stats.hotel_groups++;
      }
      cache.group.set(key, id);
      return id;
    },

    async countryByName(rawName) {
      const name = norm(rawName);
      if (!name) return null;
      const key = name.toLowerCase();
      if (cache.country.has(key)) return cache.country.get(key)!;
      let id = await flatLookup("cc1_country", name);
      if (id == null) {
        const { data, error } = await supabase
          .from("cc1_country")
          .insert({ name })
          .select("id")
          .single();
        if (error)
          throw new Error(`cc1_country insert failed: ${error.message}`);
        id = data.id as number;
        stats.countries++;
      }
      cache.country.set(key, id);
      return id;
    },

    async regionByName(countryId, rawName) {
      const name = norm(rawName);
      if (!name) return null;
      const key = `${countryId ?? "_"}::${name.toLowerCase()}`;
      if (cache.region.has(key)) return cache.region.get(key)!;

      let q = supabase
        .from("cc1_region")
        .select("id")
        .ilike("name", name)
        .limit(1);
      if (countryId != null) q = q.eq("cc1_country_id", countryId);
      const { data, error } = await q;
      if (error) throw new Error(`cc1_region lookup failed: ${error.message}`);

      let id: number;
      if (data && data.length > 0) {
        id = data[0].id as number;
      } else {
        const insertRow: { name: string; cc1_country_id?: number | null } = {
          name,
        };
        if (countryId != null) insertRow.cc1_country_id = countryId;
        const { data: created, error: insErr } = await supabase
          .from("cc1_region")
          .insert(insertRow)
          .select("id")
          .single();
        if (insErr)
          throw new Error(`cc1_region insert failed: ${insErr.message}`);
        id = created.id as number;
        stats.regions++;
      }
      cache.region.set(key, id);
      return id;
    },

    async cityByName(regionId, rawName) {
      const name = norm(rawName);
      if (!name) return null;
      const key = `${regionId ?? "_"}::${name.toLowerCase()}`;
      if (cache.city.has(key)) return cache.city.get(key)!;

      let q = supabase
        .from("cc1_city")
        .select("id")
        .ilike("name", name)
        .limit(1);
      if (regionId != null) q = q.eq("cc1_region_id", regionId);
      const { data, error } = await q;
      if (error) throw new Error(`cc1_city lookup failed: ${error.message}`);

      let id: number;
      if (data && data.length > 0) {
        id = data[0].id as number;
      } else {
        const insertRow: { name: string; cc1_region_id?: number | null } = {
          name,
        };
        if (regionId != null) insertRow.cc1_region_id = regionId;
        const { data: created, error: insErr } = await supabase
          .from("cc1_city")
          .insert(insertRow)
          .select("id")
          .single();
        if (insErr)
          throw new Error(`cc1_city insert failed: ${insErr.message}`);
        id = created.id as number;
        stats.cities++;
      }
      cache.city.set(key, id);
      return id;
    },
  };
}
