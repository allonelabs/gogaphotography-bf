import { describe, it, expect } from "vitest";
import { buildHotelListQuery } from "@/app/api/hotels/_query";

describe("buildHotelListQuery", () => {
  it("applies search term with ilike", () => {
    const q = buildHotelListQuery({ search: "stamba", page: 1, pageSize: 50 });
    expect(q.filters).toContainEqual({
      column: "name",
      op: "ilike",
      value: "%stamba%",
    });
  });

  it("applies pagination", () => {
    const q = buildHotelListQuery({ search: "", page: 2, pageSize: 25 });
    expect(q.range).toEqual({ from: 25, to: 49 });
  });

  it("applies hotel_range filter", () => {
    const q = buildHotelListQuery({
      search: "",
      page: 1,
      pageSize: 50,
      minStars: 3,
    });
    expect(q.filters).toContainEqual({
      column: "hotel_range",
      op: "gte",
      value: 3,
    });
  });
});
