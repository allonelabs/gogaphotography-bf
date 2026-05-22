import { companyVerticalHandlers } from "../../../_lib/company-vertical";

const h = companyVerticalHandlers("excursion");
export const GET = h.banks.listGET;
export const POST = h.banks.POST;
