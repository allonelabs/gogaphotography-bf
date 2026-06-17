// tests/store-email.test.ts
import { describe, it, expect } from "vitest";
import { buildDownloadEmail } from "@/app/lib/goga/store-email";

describe("buildDownloadEmail", () => {
  it("renders subject and one link per item with the origin", () => {
    const html = buildDownloadEmail({
      origin: "https://gogaphotography-bf.vercel.app",
      items: [
        { title: "Warm Pack", token: "t1" },
        { title: "Tbilisi Album", token: "t2" },
      ],
    });
    expect(html.subject).toMatch(/download/i);
    expect(html.html).toContain(
      "https://gogaphotography-bf.vercel.app/api/store/download/t1",
    );
    expect(html.html).toContain(
      "https://gogaphotography-bf.vercel.app/api/store/download/t2",
    );
    expect(html.html).toContain("Warm Pack");
    expect(html.html).toContain("Tbilisi Album");
  });
});
