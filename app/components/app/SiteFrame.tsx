'use client';

// ════════════════════════════════════════════════════════════════════════════
// SiteFrame — viewport-switching wrapper around the LiveSitePreview iframe.
// Renders mobile / tablet / desktop / fluid frames with live breakpoint
// readout and "open in new tab" link to the spawn dev server.
//
// Used by the Website surface (sole owner of the site preview) and previously
// by the brand SITE tab (removed — site preview belongs in /s/website).
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  LiveSitePreview,
  type SiteManifestShape,
} from './LiveSitePreview';

type Viewport = 'mobile' | 'tablet' | 'desktop' | 'fluid';

const VIEWPORTS: ReadonlyArray<{ key: Viewport; label: string; w: number | null; h: number | null; tag: string }> = [
  { key: 'mobile', label: 'Mobile', w: 390, h: 844, tag: 'iPhone 15' },
  { key: 'tablet', label: 'Tablet', w: 768, h: 1024, tag: 'iPad' },
  { key: 'desktop', label: 'Desktop', w: 1280, h: 800, tag: '1280×800' },
  { key: 'fluid', label: 'Fluid', w: null, h: null, tag: '100% × 760' },
];

interface SiteFrameProps {
  businessId: string;
  /** Pass-through for parent-driven route sync (e.g. source-code panel). */
  route?: string;
  onRouteChange?: (r: string) => void;
  /** Notified once the spawn manifest loads — parent can render route chrome. */
  onManifestLoaded?: (m: SiteManifestShape) => void;
  /** Default viewport on first paint (fluid for editors, desktop for showcase). */
  initialViewport?: Viewport;
}

export function SiteFrame({
  businessId,
  route,
  onRouteChange,
  onManifestLoaded,
  initialViewport = 'fluid',
}: SiteFrameProps) {
  const [vp, setVp] = useState<Viewport>(initialViewport);
  const active = VIEWPORTS.find((v) => v.key === vp)!;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg-app)]">
      {/* Top bar — viewport pills + meta */}
      <header className="flex items-center justify-between border-b border-[var(--bg-surface-alt)] bg-[var(--bg-surface)] px-6 py-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="eyebrow">Live preview</p>
            <h2 className="mt-0.5 font-mono text-[14px] text-[var(--ink-900)]">
              out/{businessId}/site/
            </h2>
          </div>
          <span className="ml-2 inline-flex h-5 items-center rounded-full bg-[var(--bg-surface-alt)] px-2 text-[10px] font-mono text-[var(--ink-700)]">
            {active.tag}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 items-center rounded-full bg-[var(--bg-surface-alt)] p-0.5">
            {VIEWPORTS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVp(v.key)}
                title={v.tag}
                className={`flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-medium uppercase tracking-wider transition ${
                  vp === v.key
                    ? 'bg-[var(--bg-surface)] text-[var(--ink-900)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--ink-500)] hover:text-[var(--ink-900)]'
                }`}
              >
                <ViewportIcon kind={v.key} />
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Frame area */}
      <div className="flex flex-1 items-start justify-center overflow-auto bg-[var(--bg-app)] p-6">
        {vp === 'fluid' ? (
          <div className="w-full">
            <LiveSitePreview {...previewProps(businessId, route, onRouteChange, onManifestLoaded)} />
          </div>
        ) : (
          <DeviceFrame width={active.w!} height={active.h!}>
            <LiveSitePreview {...previewProps(businessId, route, onRouteChange, onManifestLoaded)} />
          </DeviceFrame>
        )}
      </div>
    </div>
  );
}

/** Build LiveSitePreview props without including `undefined` keys —
 *  exactOptionalPropertyTypes rejects {route: undefined} for `route?: string`. */
function previewProps(
  businessId: string,
  route: string | undefined,
  onRouteChange: ((r: string) => void) | undefined,
  onManifestLoaded: ((m: SiteManifestShape) => void) | undefined,
) {
  return {
    businessId,
    ...(route !== undefined ? { route } : {}),
    ...(onRouteChange ? { onRouteChange } : {}),
    ...(onManifestLoaded ? { onManifestLoaded } : {}),
  };
}

function DeviceFrame({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-[24px] border border-[var(--bg-surface-alt)] bg-black p-2 shadow-[var(--shadow-lg)]"
      style={{ width: `${width + 16}px`, maxWidth: '100%' }}
    >
      <div
        className="overflow-hidden rounded-[16px] bg-white"
        style={{ height: `${height}px`, maxHeight: 'calc(100vh - 240px)' }}
      >
        {children}
      </div>
      <div className="mt-1 text-center font-mono text-[10px] text-[var(--ink-400)]">
        {width}×{height}
      </div>
    </div>
  );
}

function ViewportIcon({ kind }: { kind: Viewport }) {
  const common = {
    width: 11,
    height: 11,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (kind) {
    case 'mobile':
      return (
        <svg {...common}>
          <rect x="7" y="3" width="10" height="18" rx="1.5" />
          <path d="M11 18h2" />
        </svg>
      );
    case 'tablet':
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="1.5" />
          <path d="M11 18h2" />
        </svg>
      );
    case 'desktop':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="1.5" />
          <path d="M9 21h6M12 17v4" />
        </svg>
      );
    case 'fluid':
      return (
        <svg {...common}>
          <path d="M4 8h16M4 16h16M8 4l-4 4 4 4M16 12l4 4-4 4" />
        </svg>
      );
  }
}
