import * as XLSX from "xlsx";

/**
 * GET /api/hotels/template — returns a fresh XLSX with the legacy
 * UPLOAD HOTEL.xls column set and two example rows. Generating it at
 * request time avoids checking a binary into the repo.
 */
export async function GET() {
  const header: Record<string, string | number | null> = {
    name: "",
    type: 1,
    juridical_form: "",
    hotel_group: "",
    full_name: "",
    identification: "",
    country: "",
    region: "",
    city: "",
    comment: "",
    hotel_range: 0,
    contact_name: "",
    contact_company: "",
    contact_position: "",
    contact_email: "",
    address: "",
    juridical_address: "",
    telephone: "",
    mobile: "",
    other_contact_info: "",
    bank_code: "",
    corr_account: "",
    currency: "",
    bank_name: "",
    swift_code: "",
  };

  const example1 = {
    ...header,
    name: "Example Hotel Tbilisi",
    type: 1,
    juridical_form: "LLC",
    hotel_group: "Boutique",
    full_name: "LLC Example Hotel Tbilisi",
    identification: "123456789",
    country: "Georgia",
    region: "Tbilisi",
    city: "Tbilisi",
    hotel_range: 4,
    contact_name: "Nino Manager",
    contact_position: "GM",
    contact_email: "gm@example.ge",
    telephone: "+995322000000",
    currency: "USD",
    bank_name: "TBC Bank",
    swift_code: "TBCBGE22",
  };

  const example2 = {
    ...header,
    name: "Example Resort Batumi",
    type: 1,
    hotel_group: "Resort",
    country: "Georgia",
    region: "Adjara",
    city: "Batumi",
    hotel_range: 5,
    currency: "USD",
  };

  const ws = XLSX.utils.json_to_sheet([example1, example2], {
    header: Object.keys(header),
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hotels");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="hotel-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
