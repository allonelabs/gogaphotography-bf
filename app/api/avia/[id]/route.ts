import { companyVerticalHandlers } from "../../_lib/company-vertical";

const h = companyVerticalHandlers("avia");
export const GET = h.main.itemGET;
export const PATCH = h.main.PATCH;
export const DELETE = h.main.DELETE;
