import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseHotelExcel } from "@/app/api/hotels/import/_parse";

function buildWorkbook(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hotels");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("parseHotelExcel", () => {
  it("parses valid rows", () => {
    const buf = buildWorkbook([
      { name: "Hotel A", identification: "111111111", hotel_range: 5 },
      { name: "Hotel B", identification: "222222222", hotel_range: 4 },
    ]);
    const out = parseHotelExcel(buf);
    expect(out.rows).toHaveLength(2);
    expect(out.errors).toHaveLength(0);
    expect(out.rows[0]).toMatchObject({ name: "Hotel A", hotel_range: 5 });
  });

  it("collects per-row validation errors", () => {
    const buf = buildWorkbook([
      { name: "", hotel_range: 10 }, // missing name + out-of-range
      { name: "Hotel B" }, // ok
    ]);
    const out = parseHotelExcel(buf);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0].row).toBe(1);
    expect(out.rows).toHaveLength(1);
  });

  it("accepts legacy UPLOAD HOTEL.xls headers", () => {
    const buf = buildWorkbook([
      {
        "Hotel Name": "Marriott Tbilisi",
        Jurisdicial: 1,
        "Jurisdicial Form": "LLC",
        Cathegory: "Boutique",
        "Full Name": "LLC Marriott Tbilisi",
        "I/N": "123456789",
        Country: "Georgia",
        Region: "Tbilisi",
        City: "Tbilisi",
        Stars: 5,
        "E-Mail": "ops@marriott.ge",
        Telephone: "+995322000000",
        "Bank Name": "TBC",
        "Swift Code": "TBCBGE22",
      },
    ]);
    const out = parseHotelExcel(buf);
    expect(out.errors).toHaveLength(0);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]).toMatchObject({
      name: "Marriott Tbilisi",
      type: 1,
      juridical_form: "LLC",
      hotel_group: "Boutique",
      identification: "123456789",
      country: "Georgia",
      region: "Tbilisi",
      city: "Tbilisi",
      hotel_range: 5,
      contact_email: "ops@marriott.ge",
      telephone: "+995322000000",
      bank_name: "TBC",
      swift_code: "TBCBGE22",
    });
  });

  it("rejects hotel_range > 5 or < 0", () => {
    const buf = buildWorkbook([
      { name: "X", hotel_range: 6 },
      { name: "Y", hotel_range: -1 },
    ]);
    const out = parseHotelExcel(buf);
    expect(out.errors).toHaveLength(2);
    expect(out.rows).toHaveLength(0);
  });

  it("skips fully blank rows silently", () => {
    const buf = buildWorkbook([
      { name: "Real Hotel" },
      { name: null, country: null, city: null },
    ]);
    const out = parseHotelExcel(buf);
    expect(out.rows).toHaveLength(1);
    expect(out.errors).toHaveLength(0);
  });
});
