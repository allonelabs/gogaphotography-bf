// Minimal stub for AdConfig — the video-editor surface (zone-3 / V3-E)
// owns the real type. AppChatPane only uses this as an opaque payload
// passed to AdChatPreview, so an empty open shape compiles fine and
// preserves runtime flexibility until the real config is restored.
//
// When the videos editor returns, replace this with a real schema import
// (or move it back to the original location).

// Open-shaped stub. AppChatPane reads brand.name, colors.accent,
// fonts.display, and a few siblings — declared explicitly so the optional
// chains typecheck. Extra props are accepted via the index signature.
export interface AdConfig {
  readonly brand?: { readonly name?: string };
  readonly colors?: { readonly accent?: string };
  readonly fonts?: { readonly display?: string };
  readonly [key: string]: unknown;
}
