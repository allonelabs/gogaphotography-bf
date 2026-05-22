import { companyVerticalHandlers } from "../_lib/company-vertical";

const h = companyVerticalHandlers("transfer");
export const GET = h.main.listGET;
export const POST = h.main.POST;
