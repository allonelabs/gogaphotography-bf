import { z } from "zod";
import { createCatalogHandlers } from "../../_lib";

const h = createCatalogHandlers({
  table: "cc2_transport_model",
  extraCols: { cc2_transport_mark_id: z.number().int().nullable() },
});
export const PATCH = h.itemPATCH;
export const DELETE = h.itemDELETE;
