import { createCatalogHandlers } from "../_lib";

const h = createCatalogHandlers({ table: "c_consul_group" });
export const GET = h.listGET;
export const POST = h.POST;
