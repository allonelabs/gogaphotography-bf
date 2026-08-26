// Single source of truth for the editable CMS page slugs.
//
// These lived duplicated in the server action and in the editor route, and the
// copies drifted: the list page offered "Photobook" while the editor's inline
// allow-list omitted it, so opening it 404'd and the row could never be created
// (which in turn made the public site's /api/page?slug=photobook 404 forever).
// Keep additions here so the editor, the action and the site stay in step.

export const KNOWN_PAGE_SLUGS = [
  "about",
  "services",
  "faq",
  "photobook",
] as const;

export type KnownPageSlug = (typeof KNOWN_PAGE_SLUGS)[number];

export function isKnownPageSlug(s: string): s is KnownPageSlug {
  return (KNOWN_PAGE_SLUGS as readonly string[]).includes(s);
}
