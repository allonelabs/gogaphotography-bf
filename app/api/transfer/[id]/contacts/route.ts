import { companyVerticalHandlers } from "../../../_lib/company-vertical";

const h = companyVerticalHandlers("transfer");
export const GET = h.contacts.listGET;
export const POST = h.contacts.POST;
