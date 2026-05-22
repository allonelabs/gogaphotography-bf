import { z } from "zod";
import { createCatalogHandlers } from "../_lib";

const h = createCatalogHandlers({
  table: "cc2_transport_model",
  extraCols: { cc2_transport_mark_id: z.number().int().nullable() },
  filterColumn: "cc2_transport_mark_id",
  filterParam: "mark_id",
});

export const GET = h.listGET;
export const POST = h.POST;
