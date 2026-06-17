// app/lib/goga/blog-sanitize.ts
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "strong",
    "em",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "br",
    "hr",
    "img",
    "figure",
    "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

/** Sanitize blog body HTML — allow a safe subset, strip scripts/handlers/styles. */
export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS);
}
