import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/app/lib/goga/image-magic-bytes";

describe("sniffImageType", () => {
  it("detects jpeg from its magic bytes", () => {
    const bytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(sniffImageType(bytes)).toBe("jpeg");
  });

  it("detects png from its magic bytes", () => {
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    expect(sniffImageType(bytes)).toBe("png");
  });

  it("detects gif from its magic bytes", () => {
    const bytes = new TextEncoder().encode("GIF89a......");
    expect(sniffImageType(bytes)).toBe("gif");
  });

  it("detects webp (RIFF....WEBP)", () => {
    const bytes = new Uint8Array(12);
    bytes.set(new TextEncoder().encode("RIFF"), 0);
    bytes.set(new TextEncoder().encode("WEBP"), 8);
    expect(sniffImageType(bytes)).toBe("webp");
  });

  it("rejects an SVG masquerading as an image (it's XML, not binary magic bytes)", () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg">',
    );
    expect(sniffImageType(svg)).toBeNull();
  });

  it("rejects an HTML file", () => {
    const html = new TextEncoder().encode(
      "<!DOCTYPE html><script>alert(1)</script>",
    );
    expect(sniffImageType(html)).toBeNull();
  });

  it("rejects empty / too-short input", () => {
    expect(sniffImageType(new Uint8Array())).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
