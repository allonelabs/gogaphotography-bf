import { createCatalogHandlers } from "../_lib";

const h = createCatalogHandlers({ table: "cc2_transport_mark" });
export const GET = h.listGET;
export const POST = h.POST;
