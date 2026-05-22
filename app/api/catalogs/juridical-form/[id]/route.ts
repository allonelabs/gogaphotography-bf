import { createCatalogHandlers } from "../../_lib";

const h = createCatalogHandlers({ table: "c_juridical_form" });
export const PATCH = h.itemPATCH;
export const DELETE = h.itemDELETE;
