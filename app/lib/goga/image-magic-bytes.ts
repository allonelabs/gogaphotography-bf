// Sniff the real image format from file bytes (magic numbers), ignoring the
// client-sent Content-Type / filename extension — both are trivial for an
// uploader to forge. Used to gate writes into the PUBLIC `projects` Supabase
// Storage bucket, where an SVG or HTML file served back with a spoofed
// image content-type could still execute as markup/script in a browser.
export type AllowedImageType = "jpeg" | "png" | "webp" | "gif" | "avif";

const MIME_BY_TYPE: Record<AllowedImageType, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/** Returns the detected type, or null if the bytes don't match any of the allowed image formats. */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "png";

  // GIF: "GIF87a" or "GIF89a"
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  )
    return "gif";

  // WEBP: "RIFF" <4-byte size> "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "webp";

  // AVIF: ISOBMFF box — bytes 4-7 "ftyp", brand at 8-11 "avif"/"avis"
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    (bytes[11] === 0x66 || bytes[11] === 0x73)
  )
    return "avif";

  return null;
}

export function imageMimeFor(type: AllowedImageType): string {
  return MIME_BY_TYPE[type];
}
