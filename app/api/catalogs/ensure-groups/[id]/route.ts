import { createCatalogHandlers } from "../../_lib";

const h = createCatalogHandlers({ table: "c_ensure_group" });
export const PATCH = h.itemPATCH;
export const DELETE = h.itemDELETE;
