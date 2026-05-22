import { createCatalogHandlers } from "../_lib";

const h = createCatalogHandlers({ table: "c_transport_category" });
export const GET = h.listGET;
export const POST = h.POST;
