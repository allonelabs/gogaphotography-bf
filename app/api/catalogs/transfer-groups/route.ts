import { createCatalogHandlers } from "../_lib";

const h = createCatalogHandlers({ table: "c_transfer_group" });
export const GET = h.listGET;
export const POST = h.POST;
