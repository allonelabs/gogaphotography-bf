import { createCatalogHandlers } from "../_lib";

const h = createCatalogHandlers({ table: "c_juridical_form" });
export const GET = h.listGET;
export const POST = h.POST;
