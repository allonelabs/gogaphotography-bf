import { createCatalogHandlers } from "../_lib";

const h = createCatalogHandlers({ table: "c_transport_color" });
export const GET = h.listGET;
export const POST = h.POST;
