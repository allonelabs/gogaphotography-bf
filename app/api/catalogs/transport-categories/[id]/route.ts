import { createCatalogHandlers } from "../../_lib";

const h = createCatalogHandlers({ table: "c_transport_category" });
export const PATCH = h.itemPATCH;
export const DELETE = h.itemDELETE;
