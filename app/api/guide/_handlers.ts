import { z } from "zod";
import { createCrudHandlers } from "../_lib/crud-route";

const guideCore = {
  username: z.string().nullable().optional(),
  type: z.number().int().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  first_name_en: z.string().nullable().optional(),
  last_name_en: z.string().nullable().optional(),
  self_number: z.string().nullable().optional(),
  pasport_number: z.string().nullable().optional(),
  gender: z.number().int().nullable().optional(),
  birthday: z.string().nullable().optional(),
  cc1_country_id: z.number().int().nullable().optional(),
  cc1_region_id: z.number().int().nullable().optional(),
  cc1_city_id: z.number().int().nullable().optional(),
  c_guide_category_id: z.number().int().nullable().optional(),
  address: z.string().nullable().optional(),
  phone_home: z.string().nullable().optional(),
  phone_work: z.string().nullable().optional(),
  phone_mobile: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  mail: z.string().nullable().optional(),
  info1: z.string().nullable().optional(),
  info2: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  ok_message: z.boolean().nullable().optional(),
  start_date: z.string().nullable().optional(),
  start_balance: z.number().nullable().optional(),
  active: z.boolean().nullable().optional(),
};

const insertSchema = z
  .object({
    ...guideCore,
    first_name: z.string().min(1),
    last_name: z.string().min(1),
  })
  .strip();

const patchSchema = z.object(guideCore).partial();

export const guideHandlers = createCrudHandlers({
  table: "guide",
  filterCols: ["cc1_country_id", "c_guide_category_id"],
  searchColumn: "last_name",
  sortCols: ["last_name", "first_name", "id"],
  defaultSort: { column: "last_name", ascending: true },
  insertSchema,
  patchSchema,
  selectList: `
    id, first_name, last_name, first_name_en, last_name_en, mail, mobile, phone_mobile, active,
    category:c_guide_category(name),
    country:cc1_country(name),
    city:cc1_city(name)
  `,
  selectDetail: `*, category:c_guide_category(*), country:cc1_country(*), region:cc1_region(*), city:cc1_city(*)`,
  permissions: { write: "guide.write", delete: "guide.delete" },
});
