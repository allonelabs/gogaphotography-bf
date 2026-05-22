import { companyVerticalHandlers } from "../../../_lib/company-vertical";

const h = companyVerticalHandlers("transfer");
export const GET = h.banks.listGET;
export const POST = h.banks.POST;
