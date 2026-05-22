// ════════════════════════════════════════════════════════════════════════════
// app/components/ui/* — operator UI design-system primitives.
//
// Wave 2 of operator-ui-ia.md. These primitives extract the design language
// already used in BrandEditor + RunRails so the rest of the workspaces can
// adopt them. Globally-correct vocabulary, consistent spacing, on-brand
// chrome.
//
// Existing utility CSS classes in app/globals.css (.card, .chip, .eyebrow,
// .btn-primary, .btn-ghost, .display-h1) remain the lower-level layer;
// these primitives compose them with semantic intent.
// ════════════════════════════════════════════════════════════════════════════

export { Pill } from './Pill';
export { Eyebrow } from './Eyebrow';
export { Card } from './Card';
export { EmptyState } from './EmptyState';
export { TabBar } from './TabBar';
export type { TabBarItem } from './TabBar';
export { GroupedTabBar } from './GroupedTabBar';
export type { GroupedTab, TabGroup } from './GroupedTabBar';
export { InlineEditor } from './InlineEditor';
