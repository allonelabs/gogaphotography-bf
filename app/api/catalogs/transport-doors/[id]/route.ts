import { createCatalogHandlers } from "../../_lib";

const h = createCatalogHandlers({ table: "c_transport_door" });
export const PATCH = h.itemPATCH;
export const DELETE = h.itemDELETE;
