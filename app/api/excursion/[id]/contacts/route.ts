import { companyVerticalHandlers } from "../../../_lib/company-vertical";

const h = companyVerticalHandlers("excursion");
export const GET = h.contacts.listGET;
export const POST = h.contacts.POST;
