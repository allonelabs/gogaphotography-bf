// ════════════════════════════════════════════════════════════════════════════
// Server-side brand-forge loader — reads `out/<id>/.cells/brand-forge.*.json`.
//
// Sibling of spawn-loader.ts. Surfaces the canonical token tree + variant
// declarations + component manifest + version log so /s/brand pages can
// render against real spawn data with a clean mock fallback when a cell
// hasn't been authored yet (slice-2 pattern).
//
// The shape exported here is intentionally *narrow*: it's just what the
// /s/brand UI surfaces consume. The full DTCG types live in
// src/lib/brand-forge/tokens/types.ts and stay server-side. UI consumers
// should not depend on those types directly to keep the bundle thin.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

// ── Public types ────────────────────────────────────────────────────────

export interface BrandTokenLeaf {
  $value: unknown;                  // raw — could be string, number, ref, mode-shaped
  $type: string;
  $description?: string;
  $deprecated?: boolean;
  $replacement?: string;
  $colorSpace?: { hex?: string; oklch?: { l: number; c: number; h: number } };
  $locked?: boolean;
  $source?: string;
  /** Plan 4 semantic role — drives client-side dark-mode clamping + WCAG
   *  pairing. Mirrors `SemanticRole` from src/lib/brand-forge/tokens/types. */
  $semantic?:
    | 'fg'
    | 'fg-muted'
    | 'bg'
    | 'surface'
    | 'border'
    | 'accent'
    | 'success'
    | 'warn'
    | 'danger'
    | 'info';
}

export type BrandTokenGroup = { [key: string]: BrandTokenLeaf | BrandTokenGroup };

export interface BrandTokenTree {
  /** DTCG-shaped root group. */
  set: BrandTokenGroup;
  /** When this cell was last composed. */
  composedAt: string;
  /** Provenance tag (`ai-authored | deterministic | imported | manual`). */
  source: string;
  /** Locked tokens survive respawn. */
  locked: boolean;
}

export interface BrandVariantDecl {
  axis: 'theme' | 'appearance' | 'density' | 'contrast';
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface BrandComponentSummary {
  name: string;
  source: string;
  variantCount: number;
  composedAt: string;
}

export interface BrandVersion {
  version: string;
  bumpKind: 'major' | 'minor' | 'patch';
  releasedAt: string;
  notes?: string;
  /** Token tree at the moment of release. Lights up the diff + rollback. */
  tokenSnapshot?: BrandTokenGroup;
}

export interface BrandValidationSummary {
  passed: boolean;
  errors: number;
  warnings: number;
  topIssues: Array<{ rule: string; severity: string; path?: string; message: string }>;
}

export interface BrandExport {
  /** filename (e.g. "tokens.css", "tailwind.config.css", "tokens.json") */
  filename: string;
  /** mime type for the editor's copy/preview pane */
  mimeType: string;
  /** raw contents read from disk */
  contents: string;
  /** byte size — surfaced in the UI so operators know what they're shipping */
  bytes: number;
}

export interface BrandVoice {
  archetype: string;
  tone: { formal: number; playful: number; respectful: number; enthusiastic: number };
  doWords: string[];
  dontWords: string[];
  rationale?: string;
  source: string;
  composedAt: string;
}

export type LogoFill =
  | { kind: 'solid'; value: string }
  | { kind: 'token'; tokenPath: string }
  | {
      kind: 'linear-gradient';
      angle: number;
      stops: ReadonlyArray<{ color: string; position: number }>;
    }
  | {
      // Image fill — `href` is a data: URL or http(s) URL; `fit` controls
      // how the image is sized into the shape's bbox.
      kind: 'image';
      href: string;
      fit?: 'cover' | 'contain' | 'stretch';
      opacity?: number;
    };

/** SVG-mix-blend-mode subset. `normal` is the default and matches no-blend. */
export type LogoBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';
export type LogoStroke = {
  color: string;
  width: number;
  dash?: number[];
  linecap?: 'butt' | 'round' | 'square';
  linejoin?: 'miter' | 'round' | 'bevel';
};

/** Common transform fields shared across every shape variant. */
export interface LogoShapeCommon {
  /** 0-1; default 1. */
  opacity?: number;
  /** Degrees clockwise around the shape's geometric center. */
  rotation?: number;
  locked?: boolean;
  hidden?: boolean;
  /** Shapes with the same groupId move/select as one. Empty = ungrouped. */
  groupId?: string;
  /** SVG mix-blend-mode against the layers below. Default = `normal`. */
  blendMode?: LogoBlendMode;
  /** When set, this shape is rendered clipped by another shape's geometry
   *  via SVG `<clipPath>`. The referenced shape is hidden but its
   *  geometry stays editable.
   */
  mask?: { shapeId: string };
  /** Additional fill layers stacked on top of the base `fill`. Renderer
   *  emits a clone of the shape geometry per layer. Ignored on shapes
   *  that have no base `fill` slot (line/image). */
  fillLayers?: LogoFill[];
  /** Additional stroke layers stacked on top of the base `stroke`.
   *  Useful for compound borders (e.g. inner thin + outer thick). */
  strokeLayers?: LogoStroke[];
  /** Layer effects rendered via SVG filter primitives. */
  effects?: {
    /** Drop shadow — offset + blur + colour. */
    shadow?: {
      dx: number;
      dy: number;
      blur: number;
      color: string;
      opacity?: number;
    };
    /** Gaussian blur in user-space pixels. */
    blur?: number;
    /** Inner shadow — offset + blur + colour. Rendered as inset via
     *  feComposite operator='in' atop the source alpha. */
    innerShadow?: {
      dx: number;
      dy: number;
      blur: number;
      color: string;
      opacity?: number;
    };
  };
}

export type LogoShape =
  | (LogoShapeCommon & {
      kind: 'rect';
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      fill: LogoFill;
      stroke?: LogoStroke;
      /** Uniform corner radius — kept for backwards compat. */
      r?: number;
      /** Per-corner radii (TL/TR/BR/BL). When set, overrides `r`. */
      rCorners?: { tl: number; tr: number; br: number; bl: number };
    })
  | (LogoShapeCommon & {
      kind: 'ellipse';
      id: string;
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill: LogoFill;
      stroke?: LogoStroke;
    })
  | (LogoShapeCommon & {
      kind: 'line';
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: LogoStroke;
    })
  | (LogoShapeCommon & {
      kind: 'text';
      id: string;
      x: number;
      y: number;
      text: string;
      fontSize: number;
      fontFamily: string;
      fill: LogoFill;
      fontWeight?: number;
      letterSpacing?: number;
      textAlign?: 'start' | 'middle' | 'end';
      italic?: boolean;
      /** Multi-line wrap width in user units. When unset the text renders
       *  on a single line; when set, the renderer breaks at this width
       *  using a naive whitespace tokenizer + char-count metric. */
      wrapWidth?: number;
      /** Multi-line spacing as a multiplier on fontSize. Default 1.2. */
      lineHeight?: number;
      /** When set, text follows the geometry of the referenced path
       *  shape via SVG `<textPath>`. wrapWidth/lineHeight are ignored
       *  while pathRef is in effect. */
      pathRef?: string;
    })
  | (LogoShapeCommon & {
      kind: 'polygon';
      id: string;
      cx: number;
      cy: number;
      radius: number;
      sides: number; // 3-12
      angle?: number; // rotation around center, deg (separate from common rotation)
      fill: LogoFill;
      stroke?: LogoStroke;
    })
  | (LogoShapeCommon & {
      kind: 'star';
      id: string;
      cx: number;
      cy: number;
      outer: number;
      inner: number;
      points: number; // 3-20
      angle?: number;
      fill: LogoFill;
      stroke?: LogoStroke;
    })
  | (LogoShapeCommon & {
      kind: 'path';
      id: string;
      /** SVG path d-string. Used for preset icons + bezier-pen output. */
      d: string;
      /** Bounding box of the canonical d (path is rendered translated). */
      x: number;
      y: number;
      width: number;
      height: number;
      fill: LogoFill;
      stroke?: LogoStroke;
      /** SVG fill-rule for paths with multiple subpaths. `nonzero`
       *  treats winding direction (use for boolean union/subtract);
       *  `evenodd` is the default for flatten/combine (XOR-style). */
      fillRule?: 'nonzero' | 'evenodd';
    })
  | (LogoShapeCommon & {
      kind: 'image';
      id: string;
      /** Data URL or absolute URL. SVG-as-data-url renders inline. */
      href: string;
      x: number;
      y: number;
      width: number;
      height: number;
      /** Original-image aspect ratio is captured at import time so resize
       *  handles preserve proportions when Shift is held. */
      naturalAspect?: number;
    });

export interface LogoFrame {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string | null;
  shapes: LogoShape[];
  /** Operator-placed guide lines (dragged out from rulers). Each entry is
   *  either a vertical guide at `x` or horizontal guide at `y`. */
  guides?: Array<{ id: string; axis: 'v'; x: number } | { id: string; axis: 'h'; y: number }>;
  /** Operator-defined export regions. Each slice exports as its own SVG
   *  cropped to (x, y, w, h) at the current frame's resolution. */
  slices?: Array<{ id: string; name: string; x: number; y: number; w: number; h: number }>;
}

export interface BrandLogoState {
  frames: LogoFrame[];
  activeFrameId: string;
  source: string;
  composedAt: string;
}

export interface BrandIdentity {
  /** Composed brand name (from brand-forge.name-tagline cell). */
  name: string;
  /** Composed tagline (one-liner). */
  tagline: string;
  /** Archetype seed from the token tree (e.g. "sage", "innovator"). */
  archetype: string;
  /** True when the operator hard-pinned the name (preserved across respawn). */
  namePreserved: boolean;
  /** True when the operator hard-pinned the tagline. */
  taglinePreserved: boolean;
  /** Provenance of the identity composition. */
  source: string;
}

export interface BrandSnapshot {
  /** spawn id (briefId) */
  id: string;
  identity: BrandIdentity | null;
  voice: BrandVoice | null;
  logo: BrandLogoState | null;
  tokens: BrandTokenTree | null;
  variants: BrandVariantDecl[];
  components: BrandComponentSummary[];
  versions: BrandVersion[];
  validation: BrandValidationSummary | null;
  /** v1 pipeline outputs from `.cells/brand-forge.exports/`. */
  exports: BrandExport[];
  /** Total assets recorded under this spawn (matches assets table row count). */
  assetCount: number;
  /** When the brand was last edited (max composedAt across cells). */
  lastTouchedAt: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────

async function readJsonMaybe<T>(abs: string): Promise<T | null> {
  try {
    const raw = await readFile(abs, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function maxComposedAt(...xs: Array<string | undefined | null>): string | null {
  const present = xs.filter((x): x is string => Boolean(x)).sort();
  return present.length > 0 ? present[present.length - 1] ?? null : null;
}

// ── Loaders ────────────────────────────────────────────────────────────

/**
 * Load a complete brand snapshot for one spawn. Returns null when the
 * spawn dir is absent (caller decides whether to mock or 404).
 */
export async function loadBrandSnapshot(spawnId: string): Promise<BrandSnapshot | null> {
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(spawnId)) return null;

  const cellsDir = path.join(resolveOutRoot(), spawnId, '.cells');
  let cellEntries: string[];
  try {
    cellEntries = await readdir(cellsDir);
  } catch {
    return null;
  }

  // Fan out the eight independent loads. loadIdentity depends on
  // loadTokens so it chains separately. /s/brand/* page mounts re-read
  // every brand cell — serializing 9 awaits made the page feel laggy
  // on every navigation.
  const [tokens, variants, components, versions, validation, exports, voice, logo] = await Promise.all([
    loadTokens(cellsDir),
    loadVariants(cellsDir),
    loadComponents(cellsDir, cellEntries),
    loadVersions(cellsDir),
    loadValidationSummary(cellsDir),
    loadExports(cellsDir),
    loadVoice(cellsDir),
    loadLogo(cellsDir),
  ]);
  const identity = await loadIdentity(cellsDir, tokens);
  const assetCount = cellEntries.filter((e) => e.startsWith('brand-forge.assets.')).length;
  const lastTouchedAt = maxComposedAt(
    tokens?.composedAt,
    ...components.map((c) => c.composedAt),
    ...versions.map((v) => v.releasedAt),
  );

  return {
    id: spawnId,
    identity,
    voice,
    logo,
    tokens,
    variants,
    components,
    versions,
    validation,
    exports,
    assetCount,
    lastTouchedAt,
  };
}

async function loadLogo(cellsDir: string): Promise<BrandLogoState | null> {
  type Cell = {
    output?: { frames?: LogoFrame[]; activeFrameId?: string };
    source?: string;
    composedAt?: string;
  };
  const cell = await readJsonMaybe<Cell>(path.join(cellsDir, 'brand-forge.logo.json'));
  if (!cell?.output?.frames || cell.output.frames.length === 0) return null;
  return {
    frames: cell.output.frames,
    activeFrameId: cell.output.activeFrameId ?? cell.output.frames[0]!.id,
    source: cell.source ?? 'manual',
    composedAt: cell.composedAt ?? new Date(0).toISOString(),
  };
}

async function loadVoice(cellsDir: string): Promise<BrandVoice | null> {
  type Cell = {
    output?: Partial<BrandVoice>;
    source?: string;
    composedAt?: string;
  };
  const cell = await readJsonMaybe<Cell>(path.join(cellsDir, 'brand-forge.voice.json'));
  const archetype = cell?.output?.archetype;
  if (!archetype) return null;
  const out = cell.output!;
  return {
    archetype,
    tone: {
      formal: out.tone?.formal ?? 0.5,
      playful: out.tone?.playful ?? 0.5,
      respectful: out.tone?.respectful ?? 0.5,
      enthusiastic: out.tone?.enthusiastic ?? 0.5,
    },
    doWords: out.doWords ?? [],
    dontWords: out.dontWords ?? [],
    ...(out.rationale !== undefined ? { rationale: out.rationale } : {}),
    source: cell.source ?? 'manual',
    composedAt: cell.composedAt ?? new Date().toISOString(),
  };
}

async function loadIdentity(
  cellsDir: string,
  tokens: BrandTokenTree | null,
): Promise<BrandIdentity | null> {
  type Cell = {
    output?: { name?: string; tagline?: string; namePreserved?: boolean; taglinePreserved?: boolean };
    source?: string;
  };
  const cell = await readJsonMaybe<Cell>(path.join(cellsDir, 'brand-forge.name-tagline.json'));
  if (!cell?.output?.name) return null;
  // Archetype lives at tokens.set.archetype.$value — pull it for the header
  // so the operator sees the full identity at a glance.
  const archetypeLeaf =
    tokens?.set && (tokens.set as Record<string, unknown>)['archetype'] as
      | { $value?: unknown }
      | undefined;
  const archetype = typeof archetypeLeaf?.$value === 'string' ? archetypeLeaf.$value : 'unknown';
  return {
    name: cell.output.name,
    tagline: cell.output.tagline ?? '',
    archetype,
    namePreserved: Boolean(cell.output.namePreserved),
    taglinePreserved: Boolean(cell.output.taglinePreserved),
    source: cell.source ?? 'unknown',
  };
}

async function loadExports(cellsDir: string): Promise<BrandExport[]> {
  const dir = path.join(cellsDir, 'brand-forge.exports');
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const sorted = entries.sort();
  const settled = await Promise.all(
    sorted.map(async (filename) => {
      try {
        const contents = await readFile(path.join(dir, filename), 'utf8');
        return {
          filename,
          mimeType: mimeForFilename(filename),
          contents,
          bytes: Buffer.byteLength(contents, 'utf8'),
        } satisfies BrandExport;
      } catch {
        return null;
      }
    }),
  );
  return settled.filter((e): e is BrandExport => e !== null);
}

function mimeForFilename(name: string): string {
  if (name.endsWith('.css')) return 'text/css';
  if (name.endsWith('.json')) return 'application/json';
  if (name.endsWith('.swift')) return 'text/x-swift';
  if (name.endsWith('.xml')) return 'application/xml';
  if (name.endsWith('.dart')) return 'application/dart';
  return 'text/plain';
}

async function loadTokens(cellsDir: string): Promise<BrandTokenTree | null> {
  type Cell = {
    output?: { set?: BrandTokenGroup };
    composedAt?: string;
    source?: string;
    locked?: boolean;
  };
  const cell = await readJsonMaybe<Cell>(path.join(cellsDir, 'brand-forge.tokens.json'));
  const set = cell?.output?.set;
  if (!set) return null;
  return {
    set,
    composedAt: cell?.composedAt ?? new Date(0).toISOString(),
    source: cell?.source ?? 'unknown',
    locked: Boolean(cell?.locked),
  };
}

async function loadVariants(cellsDir: string): Promise<BrandVariantDecl[]> {
  type Cell = { output?: { variants?: BrandVariantDecl[] } };
  const cell = await readJsonMaybe<Cell>(path.join(cellsDir, 'brand-forge.variants.json'));
  return cell?.output?.variants ?? [];
}

async function loadComponents(cellsDir: string, cellEntries: string[]): Promise<BrandComponentSummary[]> {
  const componentFiles = cellEntries.filter(
    (e) => e.startsWith('brand-forge.components.') && e.endsWith('.json') && e !== 'brand-forge.components.json',
  );

  const out: BrandComponentSummary[] = [];
  for (const file of componentFiles) {
    type Cell = {
      output?: { name?: string; manifest?: { variants?: unknown[] }; source?: string };
      composedAt?: string;
    };
    const cell = await readJsonMaybe<Cell>(path.join(cellsDir, file));
    if (!cell?.output?.name) continue;
    out.push({
      name: cell.output.name,
      source: cell.output.source ?? 'composed',
      variantCount: Array.isArray(cell.output.manifest?.variants) ? cell.output.manifest.variants.length : 0,
      composedAt: cell.composedAt ?? new Date(0).toISOString(),
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

async function loadVersions(cellsDir: string): Promise<BrandVersion[]> {
  type Cell = { output?: { versions?: BrandVersion[] } };
  const cell = await readJsonMaybe<Cell>(path.join(cellsDir, 'brand-forge.versions.json'));
  const xs = cell?.output?.versions ?? [];
  return [...xs].sort((a, b) => (a.releasedAt < b.releasedAt ? 1 : -1));
}

async function loadValidationSummary(cellsDir: string): Promise<BrandValidationSummary | null> {
  type Cell = {
    output?: {
      passed?: boolean;
      summary?: { errors?: number; warnings?: number };
      issues?: Array<{ rule: string; severity: string; path?: string; message: string }>;
    };
  };
  const cell = await readJsonMaybe<Cell>(path.join(cellsDir, 'brand-forge.validation.report.json'));
  const out = cell?.output;
  if (!out) return null;
  return {
    passed: Boolean(out.passed),
    errors: out.summary?.errors ?? 0,
    warnings: out.summary?.warnings ?? 0,
    topIssues: (out.issues ?? []).slice(0, 8),
  };
}

/** Token-path lookup helper for /s/brand?token=color.primary deep-links. */
export function resolveTokenAtPath(
  set: BrandTokenGroup,
  dottedPath: string,
): BrandTokenLeaf | null {
  const segs = dottedPath.split('.');
  let node: BrandTokenLeaf | BrandTokenGroup | undefined = set;
  for (const seg of segs) {
    if (!node || typeof node !== 'object' || '$value' in node) return null;
    node = (node as BrandTokenGroup)[seg];
  }
  if (!node || typeof node !== 'object' || !('$value' in node)) return null;
  return node as BrandTokenLeaf;
}
