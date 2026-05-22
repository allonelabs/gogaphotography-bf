import { createCatalogHandlers } from "../../_lib";

const h = createCatalogHandlers({ table: "c_transport_hydro" });
export const PATCH = h.itemPATCH;
export const DELETE = h.itemDELETE;
