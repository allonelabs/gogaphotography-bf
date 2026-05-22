// ════════════════════════════════════════════════════════════════════════════
// video-projects-store — server-only persistence for video editor state.
//
// One project = one row in .bf/video-projects.json.
// One generation request = one row in .bf/video-generations.jsonl.
//
// The shape is Remotion-compatible: width/height/fps/durationFrames map 1:1 to
// <Composition> props. Track + Clip ids stable across edits so renders are
// reproducible.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { withFileMutex } from './file-mutex';
import { resolveOutRoot } from './spawn-loader';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

export type ClipAssetKind = 'upload' | 'generated' | 'external';
export type TrackKind = 'video' | 'audio' | 'text';

/** Per-clip effect kinds. Each ships with a static `params` map; keyframed
 *  overrides land in Slice 5 when the keyframe UI extends site-wide. */
export type EffectKind =
  | 'color'         // brightness · contrast · saturation · hue
  | 'whitebalance'  // temperature · tint
  | 'vignette'      // amount · falloff
  | 'blur'          // amount · style (0=gauss · 1=motion · 2=radial)
  | 'grain'         // amount · size
  | 'glow'          // amount · threshold
  | 'sharpen'       // amount
  | 'chromatic'     // amount
  | 'levels';       // black · white · gamma

export type TransitionKind =
  | 'cross-dissolve' | 'dip-to-color' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down'
  | 'iris-circle' | 'iris-square' | 'wipe-clock' | 'zoom-in' | 'zoom-out' | 'glitch' | 'whip-pan';

export type EasingKind = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface ClipTransition {
  kind: TransitionKind;
  durationFrames: number;
  easing: EasingKind;
  /** For 'dip-to-color' — hex string. Default '#000'. */
  color?: string;
}

/** Catalog of every effect with its parameter schema (for inspector + render). */
export interface EffectParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: '%' | '°' | 'K' | 'px';
}

export const EFFECT_CATALOG: Record<EffectKind, { label: string; description: string; params: EffectParamDef[] }> = {
  color: {
    label: 'Color',
    description: 'Brightness · contrast · saturation · hue rotation.',
    params: [
      { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1, default: 0,   unit: '%' },
      { key: 'contrast',   label: 'Contrast',   min: -100, max: 100, step: 1, default: 0,   unit: '%' },
      { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, default: 0,   unit: '%' },
      { key: 'hue',        label: 'Hue',        min: -180, max: 180, step: 1, default: 0,   unit: '°' },
    ],
  },
  whitebalance: {
    label: 'White balance',
    description: 'Temperature (Kelvin) · tint (green ↔ magenta).',
    params: [
      { key: 'temperature', label: 'Temperature', min: -100, max: 100, step: 1, default: 0, unit: 'K' },
      { key: 'tint',        label: 'Tint',        min: -100, max: 100, step: 1, default: 0 },
    ],
  },
  vignette: {
    label: 'Vignette',
    description: 'Darken edges to focus the viewer on the subject.',
    params: [
      { key: 'amount',  label: 'Amount',  min: 0, max: 100, step: 1, default: 30, unit: '%' },
      { key: 'falloff', label: 'Falloff', min: 0, max: 100, step: 1, default: 50, unit: '%' },
    ],
  },
  blur: {
    label: 'Blur',
    description: 'Gaussian (style 0) · motion (1) · radial (2).',
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, default: 10, unit: 'px' },
      { key: 'style',  label: 'Style',  min: 0, max: 2,   step: 1, default: 0 },
    ],
  },
  grain: {
    label: 'Film grain',
    description: 'Adds a film-stock noise overlay.',
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, default: 15, unit: '%' },
      { key: 'size',   label: 'Size',   min: 1, max: 10,  step: 1, default: 2 },
    ],
  },
  glow: {
    label: 'Glow / bloom',
    description: 'Light spill on bright pixels above threshold.',
    params: [
      { key: 'amount',    label: 'Amount',    min: 0, max: 100, step: 1, default: 20, unit: '%' },
      { key: 'threshold', label: 'Threshold', min: 0, max: 100, step: 1, default: 70, unit: '%' },
    ],
  },
  sharpen: {
    label: 'Sharpen',
    description: 'Unsharp-mask edge enhancement.',
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, default: 25, unit: '%' },
    ],
  },
  chromatic: {
    label: 'Chromatic aberration',
    description: 'RGB-channel split (cinematic / glitch).',
    params: [
      { key: 'amount', label: 'Amount', min: 0, max: 100, step: 1, default: 10, unit: '%' },
    ],
  },
  levels: {
    label: 'Levels',
    description: 'Black point · white point · gamma curve midpoint.',
    params: [
      { key: 'black', label: 'Black point', min: 0,   max: 255, step: 1,    default: 0 },
      { key: 'white', label: 'White point', min: 0,   max: 255, step: 1,    default: 255 },
      { key: 'gamma', label: 'Gamma',       min: 0.1, max: 4,   step: 0.05, default: 1 },
    ],
  },
};

/** Catalog used by the inspector dropdown. */
export const TRANSITION_CATALOG: Array<{ kind: TransitionKind; label: string; description: string }> = [
  { kind: 'cross-dissolve', label: 'Cross dissolve', description: 'Smooth alpha blend (default).' },
  { kind: 'dip-to-color',   label: 'Dip to color',   description: 'Fade through black/white/brand.' },
  { kind: 'slide-left',     label: 'Slide left',     description: 'New clip slides in from the right.' },
  { kind: 'slide-right',    label: 'Slide right',    description: 'New clip slides in from the left.' },
  { kind: 'slide-up',       label: 'Slide up',       description: 'New clip slides in from the bottom.' },
  { kind: 'slide-down',     label: 'Slide down',     description: 'New clip slides in from the top.' },
  { kind: 'iris-circle',    label: 'Iris circle',    description: 'Circular reveal from center.' },
  { kind: 'iris-square',    label: 'Iris square',    description: 'Square reveal from center.' },
  { kind: 'wipe-clock',     label: 'Wipe clock',     description: 'Clockwise wipe.' },
  { kind: 'zoom-in',        label: 'Zoom in',        description: 'Scale outgoing clip to 200% as it fades.' },
  { kind: 'zoom-out',       label: 'Zoom out',       description: 'Incoming clip scales from 200% to 100%.' },
  { kind: 'glitch',         label: 'Glitch / RGB-split', description: 'Channel-split + chromatic aberration.' },
  { kind: 'whip-pan',       label: 'Whip pan',       description: 'Motion-blur horizontal pan between clips.' },
];

export interface ClipEffect {
  kind: EffectKind;
  /** Toggle without losing the configured params. */
  enabled: boolean;
  /** Static parameter values — keys match EFFECT_CATALOG[kind].params[].key. */
  params: Record<string, number>;
  /** Keyframed overrides per param. Empty = constant. Slice 5 wires the curve UI. */
  keyframes?: Array<{ param: string; frame: number; value: number }>;
}

export function defaultEffectParams(kind: EffectKind): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of EFFECT_CATALOG[kind].params) out[p.key] = p.default;
  return out;
}

/** Per-clip motion. All values default to identity — rendering with these
 *  defaults produces the unmodified frame. x/y are pixel offsets from anchor;
 *  scale 1 = original; rotation in degrees; opacity 0..1; anchor 0..1
 *  normalized to clip bounds. */
export interface ClipMotion {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  anchorX: number;
  anchorY: number;
  /** Optional wiggle — adds Perlin-style random motion within bounds. */
  wiggle?: {
    amount: number;     // pixels of position jitter
    frequency: number;  // Hz — wiggles per second
  };
}

export const DEFAULT_MOTION: ClipMotion = {
  x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, anchorX: 0.5, anchorY: 0.5,
};

// ── Text clips (titles, captions, lower thirds) ─────────────────────────

export type TextAlign = 'left' | 'center' | 'right';
export type TextWeight = 400 | 500 | 600 | 700 | 800 | 900;

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  weight: TextWeight;
  color: string;
  align: TextAlign;
  italic: boolean;
  uppercase: boolean;
  /** Letter-spacing in em. Negative = condensed. */
  tracking: number;
  /** Line-height as a unitless multiplier. */
  lineHeight: number;
  /** When > 0, draws a stroke behind the fill. */
  strokeWidth: number;
  strokeColor: string;
  /** Drop shadow. */
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  /** Soft glow halo. */
  glow?: {
    radius: number;
    color: string;
    intensity: number;
  };
  /** Per-character entry animation kind. */
  characterAnim?: 'fade-up' | 'typewriter' | 'pop' | 'slide-in';
  /** Background fill behind the text — useful for lower thirds + chyrons. */
  background?: {
    color: string;
    paddingX: number;
    paddingY: number;
    radius: number;
  };
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Geist, system-ui, sans-serif',
  fontSize: 64,
  weight: 700,
  color: '#ffffff',
  align: 'center',
  italic: false,
  uppercase: false,
  tracking: 0,
  lineHeight: 1.1,
  strokeWidth: 0,
  strokeColor: '#000000',
};

/** Catalog of canned title presets — operator picks one and the
 *  corresponding TextStyle is applied to the focused text clip. */
export const TITLE_PRESETS: Array<{ key: string; label: string; description: string; style: TextStyle }> = [
  {
    key: 'big-title',
    label: 'Big title',
    description: 'Centered hero, weight 800, soft shadow.',
    style: { ...DEFAULT_TEXT_STYLE, fontSize: 96, weight: 800, shadow: { offsetX: 0, offsetY: 4, blur: 24, color: 'rgba(0,0,0,0.6)' } },
  },
  {
    key: 'sub-headline',
    label: 'Sub-headline',
    description: 'Slimmer pairing for a Big Title.',
    style: { ...DEFAULT_TEXT_STYLE, fontSize: 36, weight: 500, color: '#ffffffcc' },
  },
  {
    key: 'lower-third',
    label: 'Lower third',
    description: 'Bottom-left chyron with brand-color background bar.',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontSize: 32, weight: 600, align: 'left',
      background: { color: '#0a0a0a', paddingX: 24, paddingY: 12, radius: 6 },
    },
  },
  {
    key: 'kinetic',
    label: 'Kinetic',
    description: 'Per-character typewriter entry.',
    style: { ...DEFAULT_TEXT_STYLE, fontSize: 80, weight: 800, uppercase: true, tracking: 0.04, characterAnim: 'typewriter' },
  },
  {
    key: 'caption',
    label: 'Caption',
    description: 'Small rounded box for spoken captions.',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontSize: 28, weight: 600,
      background: { color: 'rgba(0,0,0,0.75)', paddingX: 16, paddingY: 8, radius: 4 },
    },
  },
  {
    key: 'serif-elegant',
    label: 'Serif elegant',
    description: 'Italic Instrument Serif, soft glow.',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontFamily: '"Instrument Serif", serif', fontSize: 80, weight: 400, italic: true,
      glow: { radius: 24, color: 'rgba(255,255,255,0.4)', intensity: 0.6 },
    },
  },
  {
    key: 'glitch',
    label: 'Glitch / RGB-split',
    description: 'Heavy stroke + chromatic offset glow.',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontSize: 84, weight: 900, uppercase: true, strokeWidth: 3, strokeColor: '#ff0044',
      shadow: { offsetX: -3, offsetY: 0, blur: 0, color: '#00d4ff' },
    },
  },
  {
    key: 'ticker',
    label: 'Ticker / news bar',
    description: 'Wide horizontal bar for breaking-news lower bar.',
    style: {
      ...DEFAULT_TEXT_STYLE,
      fontSize: 24, weight: 600, align: 'left', uppercase: true, tracking: 0.1,
      background: { color: '#dc2626', paddingX: 32, paddingY: 14, radius: 0 },
    },
  },
];

// ── Audio clips ─────────────────────────────────────────────────────────

export interface AudioSettings {
  /** Linear gain — 0 = silent, 1 = source level, up to 4 = +12 dB. */
  volume: number;
  muted: boolean;
  /** Fade-in / fade-out in frames. */
  fadeInFrames: number;
  fadeOutFrames: number;
  /** Audio post-processing toggles. Render-time interpretation in Slice 8. */
  noiseReduction: boolean;
  /** Compressor + limiter as a single toggle (saner default than per-knob). */
  compressor: boolean;
  /** EQ preset name; undefined = flat. */
  eqPreset?: 'voice-warm' | 'voice-bright' | 'music-club' | 'music-acoustic' | 'phone-call';
  /** Auto-duck under a voiceover track on this project. */
  duckUnderVO: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = {
  volume: 1, muted: false, fadeInFrames: 0, fadeOutFrames: 0,
  noiseReduction: false, compressor: false, duckUnderVO: false,
};

export interface Clip {
  id: string;
  /** Reference to either /public/images/<file>, /public/videos/<file>, or external URL. */
  assetRef: string;
  assetKind: ClipAssetKind;
  /** Frame the clip starts on the timeline (0-indexed). */
  startFrame: number;
  /** Length in frames. */
  durationFrames: number;
  /** Trim from source — both default 0 = no trim. */
  trimInFrames: number;
  trimOutFrames: number;
  effects: ClipEffect[];
  /** For text clips: rendered string. */
  textContent?: string;
  /** Constant playback speed multiplier. 1 = real time, 2 = 2× faster, 0.5 = half-speed. */
  speed?: number;
  /** Play source frames in reverse order. */
  reverse?: boolean;
  /** Transition applied at this clip's outgoing edge — overlaps the next clip on this track. */
  outTransition?: ClipTransition;
  /** Per-clip motion (position / scale / rotation / opacity / anchor / wiggle).
   *  Undefined = identity transform. */
  motion?: ClipMotion;
  /** Text styling for clips on text tracks. */
  textStyle?: TextStyle;
  /** Audio settings for clips on audio tracks. */
  audio?: AudioSettings;
}

export interface Track {
  id: string;
  kind: TrackKind;
  /** Operator-visible name. */
  label: string;
  muted: boolean;
  locked: boolean;
  /** When true, this track's effects propagate to every track below it
   *  (Premiere "Adjustment Layer" semantics). The track's own clips render
   *  as transparent — only their effects matter. */
  isAdjustment?: boolean;
  clips: Clip[];
}

// ── Locked identities + visual styles (v3 — slice 68) ─────────────────────
//
// Operators pin a generated character/face once and subsequent gen calls
// auto-inject the identity reference so a campaign isn't five different
// faces. Same shape for style — capture a clip's color/motion descriptor
// and condition future gens on it. fal.ai LoRA training (slices 73-74)
// converts pinned references into per-spawn LoRAs for tighter identity.
//
// Schema is forward-compatible: empty arrays / undefined for projects that
// don't use the feature; populated with `{id, label, sourceClipId, ...}`
// once the operator pins. The chat actions `lock-character` / `lock-style`
// (slices 69, 72) drive the population.

export interface LockedCharacter {
  /** Stable id, used in subsequent gen prompts to reference this identity. */
  id: string;
  /** Operator-facing label, e.g. "spokesperson", "founder", "narrator". */
  label: string;
  /** Source: a generated clip on the timeline OR a pinned reference image. */
  sourceClipId?: string;
  sourceImageUrl?: string;
  /** Embedding vector for similarity search (populated when LoRA trains). */
  embedding?: number[];
  /** fal.ai LoRA id once trained — included in subsequent gen requests. */
  falLoraId?: string;
  /** Optional per-character prompt suffix appended to generations. */
  promptSuffix?: string;
  createdAt: string;
}

export interface LockedStyle {
  /** Stable id, used in subsequent gen prompts. */
  id: string;
  /** Operator-facing label, e.g. "cinematic-teal", "bright-startup", "noir". */
  label: string;
  /** Source clip whose look defines this style. */
  sourceClipId?: string;
  /** Captured palette (hex codes, dominant first). */
  palette?: string[];
  /** Free-text descriptor of motion / pace / framing. */
  motionDescriptor?: string;
  /** fal.ai style-LoRA id once trained. */
  falLoraId?: string;
  /** Effect chain to re-apply on every clip in this style. */
  effectsRecipe?: ClipEffect[];
  createdAt: string;
}

export interface VideoProject {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
  tracks: Track[];
  /** Last-used preset for export. */
  exportPreset: 'youtube-1080p' | 'tiktok-vertical' | 'instagram-square' | 'twitter-horizontal' | 'custom';
  /** Pinned identities + styles for this project (slice 68 scaffold). */
  lockedCharacters?: LockedCharacter[];
  lockedStyles?: LockedStyle[];
  /** Per-project provider preferences (slices 70-71). */
  voicePreference?: 'fal' | 'cartesia';
  musicPreference?: 'fal' | 'lyria' | 'artlist';
  createdAt: string;
  updatedAt: string;
}

export interface GenerationRequest {
  id: string;
  at: string;
  kind: 'text-to-video' | 'image-to-video';
  prompt: string;
  durationSeconds: 5 | 10 | 15;
  aspectRatio: '16:9' | '9:16' | '1:1';
  /** Optional source-image filename for image-to-video. */
  sourceImage?: string;
  /** "stub" = recorded but not sent; "queued" = sent to fal.ai; "done" = video saved. */
  status: 'stub' | 'queued' | 'done' | 'failed';
  /** fal.ai queue request id — set when status='queued', used by GET to poll. */
  requestId?: string;
  /** fal.ai endpoint slug used for this submission (so GET can hit the right poll URL). */
  endpoint?: string;
  /** ISO timestamp the queue submission completed (status flipped to queued). */
  submittedAt?: string;
  /** ISO timestamp the result MP4 finished downloading. */
  completedAt?: string;
  /** Filename in /public/videos/ once download completes. */
  resultVideo?: string;
  error?: string;
  /** Slice 17: when this generation was spawned by the auto-broll orchestrator,
   *  link it back to the source project + beat index so the editor can drop the
   *  completed clip into the right placeholder slot automatically. */
  brollFor?: { projectId: string; beatIndex: number };
}

const PROJECTS_DEFAULT: VideoProject[] = [];

function projectsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'video-projects.json');
}

function generationsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'video-generations.jsonl');
}

export async function readProjects(spawnId: string): Promise<VideoProject[]> {
  const f = projectsFile(spawnId);
  if (!f) return PROJECTS_DEFAULT;
  try {
    const raw = await readFile(f, 'utf8');
    const parsed = JSON.parse(raw) as VideoProject[];
    return Array.isArray(parsed) ? parsed : PROJECTS_DEFAULT;
  } catch { return PROJECTS_DEFAULT; }
}

export async function writeProjects(spawnId: string, projects: VideoProject[]): Promise<void> {
  const f = projectsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(projects, null, 2), 'utf8');
}

// Per-file mutex (`withFileMutex`) lives in `./file-mutex` so the collab
// store can serialize against the same paths.

export async function readGenerations(spawnId: string, limit = 100): Promise<GenerationRequest[]> {
  const f = generationsFile(spawnId);
  if (!f) return [];
  try {
    const raw = await readFile(f, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((l) => JSON.parse(l) as GenerationRequest).slice(-limit).reverse();
  } catch { return []; }
}

export async function appendGeneration(spawnId: string, req: GenerationRequest): Promise<void> {
  const f = generationsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  // Mutex against `updateGeneration`'s read-modify-write window. POSIX
  // O_APPEND alone is atomic, but if an updater reads the file between our
  // append and its writeback, the appended row vanishes.
  return withFileMutex(f, async () => {
    await appendFile(f, JSON.stringify(req) + '\n', 'utf8');
  });
}

/** Patch a single generation row in the JSONL by id. The whole file is
 *  rewritten — JSONL doesn't support in-place edits and our row count stays
 *  bounded (UI shows last 100). Skips silently if the id isn't found so a
 *  stale poll doesn't crash the GET. */
export async function updateGeneration(
  spawnId: string,
  genId: string,
  patch: Partial<GenerationRequest>,
): Promise<void> {
  const f = generationsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  return withFileMutex(f, async () => {
    let raw: string;
    try { raw = await readFile(f, 'utf8'); } catch { return; }
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    let touched = false;
    const next = lines.map((l) => {
      try {
        const row = JSON.parse(l) as GenerationRequest;
        if (row.id === genId) {
          touched = true;
          return JSON.stringify({ ...row, ...patch });
        }
        return l;
      } catch { return l; }
    });
    if (!touched) return;
    await writeFile(f, next.join('\n') + '\n', 'utf8');
  });
}

/** Resolve the on-disk path for a generated video filename. */
export function videoOutPath(spawnId: string, fileName: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  if (!/^[a-z0-9._-]+\.mp4$/i.test(fileName)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', 'public', 'videos', fileName);
}

export async function ensureVideosDir(spawnId: string): Promise<string | null> {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  const dir = path.join(resolveOutRoot(), spawnId, 'site', 'public', 'videos');
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function ensureAudioDir(spawnId: string): Promise<string | null> {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  const dir = path.join(resolveOutRoot(), spawnId, 'site', 'public', 'audio');
  await mkdir(dir, { recursive: true });
  return dir;
}

// ── Voice clone jobs (Slice 18, item 85) ────────────────────────────────

export interface VoiceCloneRequest {
  id: string;
  at: string;
  text: string;
  /** Optional reference audio path (under /public/audio/) for voice cloning. */
  referenceAudio?: string;
  /** Transcript of what's spoken in the reference clip — improves clone fidelity. */
  referenceText?: string;
  status: 'stub' | 'queued' | 'done' | 'failed';
  requestId?: string;
  endpoint?: string;
  submittedAt?: string;
  completedAt?: string;
  /** Filename in /public/audio/ once download completes. */
  resultAudio?: string;
  error?: string;
}

function voiceClonesFile(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'voice-clones.jsonl');
}

export async function readVoiceClones(spawnId: string, limit = 100): Promise<VoiceCloneRequest[]> {
  const f = voiceClonesFile(spawnId);
  if (!f) return [];
  try {
    const raw = await readFile(f, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((l) => JSON.parse(l) as VoiceCloneRequest).slice(-limit).reverse();
  } catch { return []; }
}

export async function appendVoiceClone(spawnId: string, req: VoiceCloneRequest): Promise<void> {
  const f = voiceClonesFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  return withFileMutex(f, async () => {
    await appendFile(f, JSON.stringify(req) + '\n', 'utf8');
  });
}

export async function updateVoiceClone(spawnId: string, jobId: string, patch: Partial<VoiceCloneRequest>): Promise<void> {
  const f = voiceClonesFile(spawnId);
  if (!f) return;
  return withFileMutex(f, async () => {
    let raw: string;
    try { raw = await readFile(f, 'utf8'); } catch { return; }
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    let touched = false;
    const next = lines.map((l) => {
      try {
        const row = JSON.parse(l) as VoiceCloneRequest;
        if (row.id === jobId) { touched = true; return JSON.stringify({ ...row, ...patch }); }
        return l;
      } catch { return l; }
    });
    if (!touched) return;
    await writeFile(f, next.join('\n') + '\n', 'utf8');
  });
}

// ── Transcription jobs (v3 — slice 82) ──────────────────────────────────
// fal.ai Whisper STT for the auto-captions chat verb. Stores per-segment
// timestamps so the editor can lay out text-overlay clips at the right
// frames. Mirrors VoiceCloneRequest's queue+poll shape; falls into the
// same downloadTo / falPoll / falResult plumbing.

export interface TranscriptionSegment {
  /** Start time in seconds. */
  start: number;
  /** End time in seconds. */
  end: number;
  text: string;
}

export interface TranscriptionJob {
  id: string;
  at: string;
  /** Source clip's id (the operator's selected clip). */
  sourceClipId: string;
  /** Source asset path resolved at submit time (e.g. "/audio/foo.mp3"). */
  sourceAssetRef: string;
  /** Optional ISO-639-1 language hint passed to Whisper. */
  language?: string;
  status: 'queued' | 'done' | 'failed';
  requestId?: string;
  endpoint?: string;
  submittedAt?: string;
  completedAt?: string;
  /** Full text of the transcript when done. */
  transcript?: string;
  /** Per-segment timestamps + text. The editor maps these to text-overlay
   *  clips by computing startFrame = round(segment.start * fps). */
  segments?: TranscriptionSegment[];
  error?: string;
}

function transcriptionsFile(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'transcriptions.jsonl');
}

export async function readTranscriptions(spawnId: string, limit = 100): Promise<TranscriptionJob[]> {
  const f = transcriptionsFile(spawnId);
  if (!f) return [];
  try {
    const raw = await readFile(f, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((l) => JSON.parse(l) as TranscriptionJob).slice(-limit).reverse();
  } catch { return []; }
}

export async function appendTranscription(spawnId: string, job: TranscriptionJob): Promise<void> {
  const f = transcriptionsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  return withFileMutex(f, async () => {
    await appendFile(f, JSON.stringify(job) + '\n', 'utf8');
  });
}

export async function updateTranscription(spawnId: string, jobId: string, patch: Partial<TranscriptionJob>): Promise<void> {
  const f = transcriptionsFile(spawnId);
  if (!f) return;
  return withFileMutex(f, async () => {
    let raw: string;
    try { raw = await readFile(f, 'utf8'); } catch { return; }
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    let touched = false;
    const next = lines.map((l) => {
      try {
        const row = JSON.parse(l) as TranscriptionJob;
        if (row.id === jobId) { touched = true; return JSON.stringify({ ...row, ...patch }); }
        return l;
      } catch { return l; }
    });
    if (!touched) return;
    await writeFile(f, next.join('\n') + '\n', 'utf8');
  });
}

// ── Video FX jobs (Slice 16, items 83/84/90) ─────────────────────────────

export type VideoFxKind = 'upscale' | 'bg-remove' | 'interpolate' | 'lip-sync';

export interface VideoFxJob {
  id: string;
  kind: VideoFxKind;
  at: string;
  /** Source video filename under /public/videos/. */
  sourceVideo: string;
  /** For lip-sync: audio path under /public/audio/ to drive the mouth motion. */
  sourceAudio?: string;
  /** Optional per-kind params (e.g. upscale factor, target fps for interpolate). */
  params?: Record<string, number | string>;
  status: 'queued' | 'done' | 'failed';
  requestId?: string;
  endpoint?: string;
  submittedAt?: string;
  completedAt?: string;
  /** Filename in /public/videos/ once download completes. */
  resultVideo?: string;
  error?: string;
}

function videoFxFile(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'video-fx-jobs.jsonl');
}

export async function readVideoFxJobs(spawnId: string, limit = 100): Promise<VideoFxJob[]> {
  const f = videoFxFile(spawnId);
  if (!f) return [];
  try {
    const raw = await readFile(f, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((l) => JSON.parse(l) as VideoFxJob).slice(-limit).reverse();
  } catch { return []; }
}

export async function appendVideoFxJob(spawnId: string, job: VideoFxJob): Promise<void> {
  const f = videoFxFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  return withFileMutex(f, async () => {
    await appendFile(f, JSON.stringify(job) + '\n', 'utf8');
  });
}

export async function updateVideoFxJob(spawnId: string, jobId: string, patch: Partial<VideoFxJob>): Promise<void> {
  const f = videoFxFile(spawnId);
  if (!f) return;
  return withFileMutex(f, async () => {
    let raw: string;
    try { raw = await readFile(f, 'utf8'); } catch { return; }
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    let touched = false;
    const next = lines.map((l) => {
      try {
        const row = JSON.parse(l) as VideoFxJob;
        if (row.id === jobId) { touched = true; return JSON.stringify({ ...row, ...patch }); }
        return l;
      } catch { return l; }
    });
    if (!touched) return;
    await writeFile(f, next.join('\n') + '\n', 'utf8');
  });
}

// ── Audio generations (Slice 14) ────────────────────────────────────────

export interface AudioGenerationRequest {
  id: string;
  at: string;
  prompt: string;
  durationSeconds: number;
  status: 'stub' | 'queued' | 'done' | 'failed';
  requestId?: string;
  endpoint?: string;
  submittedAt?: string;
  completedAt?: string;
  /** Filename in /public/audio/ once download completes. */
  resultAudio?: string;
  error?: string;
}

function audioGenerationsFile(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'audio-generations.jsonl');
}

export async function readAudioGenerations(spawnId: string, limit = 100): Promise<AudioGenerationRequest[]> {
  const f = audioGenerationsFile(spawnId);
  if (!f) return [];
  try {
    const raw = await readFile(f, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((l) => JSON.parse(l) as AudioGenerationRequest).slice(-limit).reverse();
  } catch { return []; }
}

export async function appendAudioGeneration(spawnId: string, req: AudioGenerationRequest): Promise<void> {
  const f = audioGenerationsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  return withFileMutex(f, async () => {
    await appendFile(f, JSON.stringify(req) + '\n', 'utf8');
  });
}

export async function updateAudioGeneration(spawnId: string, genId: string, patch: Partial<AudioGenerationRequest>): Promise<void> {
  const f = audioGenerationsFile(spawnId);
  if (!f) return;
  return withFileMutex(f, async () => {
    let raw: string;
    try { raw = await readFile(f, 'utf8'); } catch { return; }
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    let touched = false;
    const next = lines.map((l) => {
      try {
        const row = JSON.parse(l) as AudioGenerationRequest;
        if (row.id === genId) { touched = true; return JSON.stringify({ ...row, ...patch }); }
        return l;
      } catch { return l; }
    });
    if (!touched) return;
    await writeFile(f, next.join('\n') + '\n', 'utf8');
  });
}

// ── Renders (Slice 8b) ───────────────────────────────────────────────────

export interface RenderJob {
  id: string;
  projectId: string;
  startedAt: string;
  finishedAt?: string;
  /** 'queued' = accepted, 'rendering' = bundle+render in progress,
   *  'done' = MP4 written, 'failed' = error captured. */
  status: 'queued' | 'rendering' | 'done' | 'failed';
  /** Resolution rendered at — useful for the multi-resolution roadmap (#95). */
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  /** Filename under out/<id>/site/public/exports/ */
  outputFile?: string;
  bytes?: number;
  error?: string;
}

function rendersFile(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return path.join(resolveOutRoot(), spawnId, 'site', '.bf', 'video-renders.jsonl');
}

export async function appendRender(spawnId: string, job: RenderJob): Promise<void> {
  const f = rendersFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  return withFileMutex(f, async () => {
    await appendFile(f, JSON.stringify(job) + '\n', 'utf8');
  });
}

export async function updateRender(spawnId: string, jobId: string, patch: Partial<RenderJob>): Promise<void> {
  const f = rendersFile(spawnId);
  if (!f) return;
  return withFileMutex(f, async () => {
    let raw: string;
    try { raw = await readFile(f, 'utf8'); } catch { return; }
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    let touched = false;
    const next = lines.map((l) => {
      try {
        const row = JSON.parse(l) as RenderJob;
        if (row.id === jobId) { touched = true; return JSON.stringify({ ...row, ...patch }); }
        return l;
      } catch { return l; }
    });
    if (!touched) return;
    await writeFile(f, next.join('\n') + '\n', 'utf8');
  });
}

export async function readRenders(spawnId: string, projectId?: string, limit = 50): Promise<RenderJob[]> {
  const f = rendersFile(spawnId);
  if (!f) return [];
  try {
    const raw = await readFile(f, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    const all = lines.map((l) => JSON.parse(l) as RenderJob);
    const filtered = projectId ? all.filter((r) => r.projectId === projectId) : all;
    return filtered.slice(-limit).reverse();
  } catch { return []; }
}

export async function ensureExportsDir(spawnId: string): Promise<string | null> {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  const dir = path.join(resolveOutRoot(), spawnId, 'site', 'public', 'exports');
  await mkdir(dir, { recursive: true });
  return dir;
}

export function emptyProject(): VideoProject {
  const now = new Date().toISOString();
  const id = `vp_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: 'New project',
    fps: 30,
    width: 1920,
    height: 1080,
    durationFrames: 30 * 30, // 30 seconds default
    tracks: [
      { id: `t_${Math.random().toString(36).slice(2, 6)}`, kind: 'video', label: 'V1', muted: false, locked: false, clips: [] },
      { id: `t_${Math.random().toString(36).slice(2, 6)}`, kind: 'audio', label: 'A1', muted: false, locked: false, clips: [] },
    ],
    exportPreset: 'youtube-1080p',
    createdAt: now,
    updatedAt: now,
  };
}
