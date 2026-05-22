export interface HotelListInput {
  search: string;
  page: number;
  pageSize: number;
  minStars?: number;
  countryId?: number;
  hotelGroupId?: number;
  sort?: "name" | "hotel_range" | "id";
  dir?: "asc" | "desc";
}

export interface HotelListQuery {
  filters: { column: string; op: string; value: string | number }[];
  range: { from: number; to: number };
  order: { column: string; ascending: boolean };
}

export function buildHotelListQuery(input: HotelListInput): HotelListQuery {
  const filters: HotelListQuery["filters"] = [];
  if (input.search)
    filters.push({ column: "name", op: "ilike", value: `%${input.search}%` });
  if (input.minStars != null)
    filters.push({ column: "hotel_range", op: "gte", value: input.minStars });
  if (input.countryId != null)
    filters.push({
      column: "cc1_country_id",
      op: "eq",
      value: input.countryId,
    });
  if (input.hotelGroupId != null)
    filters.push({
      column: "c_hotel_group_id",
      op: "eq",
      value: input.hotelGroupId,
    });

  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;

  return {
    filters,
    range: { from, to },
    order: {
      column: input.sort ?? "name",
      ascending: (input.dir ?? "asc") === "asc",
    },
  };
}
