// Re-exports from the existing site-renderer for compatibility.
//
// The legacy site-renderer.ts and the new variant system share these types.
// One place to import them keeps the two systems in lockstep.

export type { BrandIdentity, SiteContent } from '../site-renderer';
