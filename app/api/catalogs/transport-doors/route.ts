import { createCatalogHandlers } from "../_lib";

const h = createCatalogHandlers({ table: "c_transport_door" });
export const GET = h.listGET;
export const POST = h.POST;
