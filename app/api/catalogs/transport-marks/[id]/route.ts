import { createCatalogHandlers } from "../../_lib";

const h = createCatalogHandlers({ table: "cc2_transport_mark" });
export const PATCH = h.itemPATCH;
export const DELETE = h.itemDELETE;
