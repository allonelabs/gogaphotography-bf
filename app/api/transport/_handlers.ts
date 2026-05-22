import { z } from "zod";
import { createCrudHandlers } from "../_lib/crud-route";

const transportCore = {
  holder_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  holder_contact1: z.string().nullable().optional(),
  holder_contact2: z.string().nullable().optional(),
  cc1_country_id: z.number().int().nullable().optional(),
  cc1_region_id: z.number().int().nullable().optional(),
  cc1_city_id: z.number().int().nullable().optional(),
  cc2_transport_mark_id: z.number().int().nullable().optional(),
  cc2_transport_model_id: z.number().int().nullable().optional(),
  year: z.string().nullable().optional(),
  c_transport_hydro_id: z.number().int().nullable().optional(),
  c_transport_color_id: z.number().int().nullable().optional(),
  c_transport_door_id: z.number().int().nullable().optional(),
  rudder: z.number().int().nullable().optional(),
  c_transport_category_id: z.number().int().nullable().optional(),
  parameter1: z.boolean().nullable().optional(),
  parameter2: z.boolean().nullable().optional(),
  parameter3: z.boolean().nullable().optional(),
  parameter4: z.boolean().nullable().optional(),
  parameter5: z.boolean().nullable().optional(),
  parameter6: z.boolean().nullable().optional(),
  fuel_count: z.number().nullable().optional(),
  commuter_count: z.number().int().nullable().optional(),
};

const insertSchema = z.object(transportCore);
const patchSchema = z.object(transportCore).partial();

export const transportHandlers = createCrudHandlers({
  table: "transport",
  filterCols: [
    "cc2_transport_mark_id",
    "cc2_transport_model_id",
    "c_transport_category_id",
  ],
  searchColumn: "holder_name",
  sortCols: ["id", "year", "holder_name"],
  defaultSort: { column: "id", ascending: false },
  insertSchema,
  patchSchema,
  selectList: `
    id, holder_name, phone, year, fuel_count, commuter_count,
    mark:cc2_transport_mark(name),
    model:cc2_transport_model(name),
    category:c_transport_category(name),
    color:c_transport_color(name)
  `,
  selectDetail: `*, mark:cc2_transport_mark(*), model:cc2_transport_model(*), category:c_transport_category(*), color:c_transport_color(*), hydro:c_transport_hydro(*), door:c_transport_door(*), country:cc1_country(*), region:cc1_region(*), city:cc1_city(*)`,
  permissions: { write: "transport.write", delete: "transport.delete" },
});
