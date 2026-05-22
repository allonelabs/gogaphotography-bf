// ════════════════════════════════════════════════════════════════════════════
// video-templates — canned VideoProject seeds the operator can spawn from.
//
// Each template builds a fresh project at the chosen aspect/duration with a
// pre-arranged track lineup (titles, captions, B-roll lanes, audio bed). The
// builder accepts an optional brand kit so dip-to-color transitions + text
// styles pick up the brand color and font automatically.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import {
  DEFAULT_AUDIO,
  DEFAULT_MOTION,
  DEFAULT_TEXT_STYLE,
  type Clip,
  type Track,
  type VideoProject,
} from './video-projects-store';

export interface BrandKit {
  /** Brand-color hex used for dip-to-color transitions + title strokes/glows. */
  brandColor?: string;
  /** Brand font family applied to text-clip TextStyles. */
  brandFont?: string;
}

export interface VideoProjectTemplate {
  key: string;
  label: string;
  description: string;
  /** Default aspect ratio for the template. Operator can change after spawn. */
  defaultAspect: '16:9' | '9:16' | '1:1';
  build: (opts?: BrandKit) => VideoProject;
}

const fps = 30;

function randId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyTrack(kind: Track['kind'], label: string): Track {
  return { id: randId('t'), kind, label, muted: false, locked: false, clips: [] };
}

function aspectDims(a: '16:9' | '9:16' | '1:1'): { width: number; height: number } {
  if (a === '9:16') return { width: 1080, height: 1920 };
  if (a === '1:1') return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}

function brandedTextStyle(brand?: BrandKit) {
  return {
    ...DEFAULT_TEXT_STYLE,
    fontFamily: brand?.brandFont ?? DEFAULT_TEXT_STYLE.fontFamily,
    color: brand?.brandColor ?? DEFAULT_TEXT_STYLE.color,
  };
}

function titleClip(opts: { startFrame: number; durationFrames: number; text: string; brand?: BrandKit; size?: number }): Clip {
  return {
    id: randId('c'),
    assetRef: '',
    assetKind: 'external',
    startFrame: opts.startFrame,
    durationFrames: opts.durationFrames,
    trimInFrames: 0, trimOutFrames: 0,
    effects: [],
    textContent: opts.text,
    motion: { ...DEFAULT_MOTION },
    textStyle: {
      ...brandedTextStyle(opts.brand),
      fontSize: opts.size ?? 96,
      weight: 800,
      shadow: opts.brand?.brandColor
        ? { offsetX: 0, offsetY: 4, blur: 24, color: `${opts.brand.brandColor}66` }
        : { offsetX: 0, offsetY: 4, blur: 24, color: 'rgba(0,0,0,0.6)' },
    },
  };
}

function audioBedClip(opts: { durationFrames: number }): Clip {
  return {
    id: randId('c'),
    assetRef: '',
    assetKind: 'external',
    startFrame: 0,
    durationFrames: opts.durationFrames,
    trimInFrames: 0, trimOutFrames: 0,
    effects: [],
    audio: { ...DEFAULT_AUDIO, volume: 0.5, fadeInFrames: 30, fadeOutFrames: 30 },
  };
}

function shellProject(name: string, aspect: '16:9' | '9:16' | '1:1', durationFrames: number, fpsOverride?: number): VideoProject {
  const dims = aspectDims(aspect);
  const now = new Date().toISOString();
  return {
    id: randId('vp'),
    name,
    fps: fpsOverride ?? fps,
    width: dims.width,
    height: dims.height,
    durationFrames,
    tracks: [],
    exportPreset: aspect === '16:9' ? 'youtube-1080p' : aspect === '9:16' ? 'tiktok-vertical' : 'instagram-square',
    createdAt: now,
    updatedAt: now,
  };
}

// ── Templates ────────────────────────────────────────────────────────────

export const TEMPLATES: VideoProjectTemplate[] = [
  {
    key: 'intro-15',
    label: '15s brand intro',
    description: 'Cold open → big title → outro tag. Three-beat structure.',
    defaultAspect: '16:9',
    build: (brand) => {
      const total = fps * 15;
      const proj = shellProject('Brand intro', '16:9', total);
      const v1 = emptyTrack('video', 'V1 · cold open');
      const v2 = emptyTrack('video', 'V2 · titles');
      const cap = emptyTrack('text', 'Captions');
      const audio = emptyTrack('audio', 'A1 · music');

      v2.clips.push(
        titleClip({ startFrame: fps * 2, durationFrames: fps * 5, text: 'Your tagline here', brand, size: 110 }),
        titleClip({ startFrame: fps * 12, durationFrames: fps * 3, text: '@yourhandle', brand, size: 64 }),
      );
      audio.clips.push(audioBedClip({ durationFrames: total }));
      proj.tracks = [v1, v2, cap, audio];
      return proj;
    },
  },
  {
    key: 'product-promo-30',
    label: '30s product promo',
    description: 'Hook + three feature beats + CTA. Vertical for Reels/Shorts.',
    defaultAspect: '9:16',
    build: (brand) => {
      const total = fps * 30;
      const proj = shellProject('Product promo', '9:16', total);
      const broll = emptyTrack('video', 'V1 · b-roll');
      const titles = emptyTrack('text', 'T1 · feature beats');
      const cap = emptyTrack('text', 'Captions');
      const audio = emptyTrack('audio', 'A1 · music bed');

      titles.clips.push(
        titleClip({ startFrame: fps * 1,  durationFrames: fps * 4, text: 'Hook line', brand, size: 96 }),
        titleClip({ startFrame: fps * 7,  durationFrames: fps * 5, text: 'Feature one', brand, size: 80 }),
        titleClip({ startFrame: fps * 13, durationFrames: fps * 5, text: 'Feature two', brand, size: 80 }),
        titleClip({ startFrame: fps * 19, durationFrames: fps * 5, text: 'Feature three', brand, size: 80 }),
        titleClip({ startFrame: fps * 25, durationFrames: fps * 5, text: 'Try it →', brand, size: 96 }),
      );
      audio.clips.push(audioBedClip({ durationFrames: total }));
      proj.tracks = [broll, titles, cap, audio];
      return proj;
    },
  },
  {
    key: 'explainer-60',
    label: '60s explainer',
    description: 'Talking head A-roll + B-roll lane + lower thirds + captions.',
    defaultAspect: '16:9',
    build: (brand) => {
      const total = fps * 60;
      const proj = shellProject('Explainer', '16:9', total);
      const aRoll = emptyTrack('video', 'V1 · A-roll (talking head)');
      const bRoll = emptyTrack('video', 'V2 · B-roll');
      const lowerThirds = emptyTrack('text', 'T1 · lower thirds');
      const cap = emptyTrack('text', 'Captions');
      const dialogue = emptyTrack('audio', 'A1 · dialogue');
      const music = emptyTrack('audio', 'A2 · music bed');

      lowerThirds.clips.push(
        titleClip({ startFrame: fps * 5, durationFrames: fps * 6, text: 'Speaker name · Title', brand, size: 36 }),
      );
      music.clips.push({ ...audioBedClip({ durationFrames: total }), audio: { ...DEFAULT_AUDIO, volume: 0.25, duckUnderVO: true, fadeInFrames: 30, fadeOutFrames: 60 } });
      proj.tracks = [aRoll, bRoll, lowerThirds, cap, dialogue, music];
      return proj;
    },
  },
  {
    key: 'story-vertical',
    label: '15s vertical story',
    description: 'Single shot + bold sticker title for IG/TikTok stories.',
    defaultAspect: '9:16',
    build: (brand) => {
      const total = fps * 15;
      const proj = shellProject('Story', '9:16', total);
      const v1 = emptyTrack('video', 'V1 · main shot');
      const sticker = emptyTrack('text', 'T1 · sticker');
      const audio = emptyTrack('audio', 'A1 · music');

      sticker.clips.push({
        ...titleClip({ startFrame: fps * 1, durationFrames: fps * 13, text: 'STORY HEADLINE', brand, size: 84 }),
        textStyle: {
          ...brandedTextStyle(brand),
          fontSize: 84, weight: 900, uppercase: true, tracking: 0.04,
          background: brand?.brandColor
            ? { color: brand.brandColor, paddingX: 20, paddingY: 10, radius: 8 }
            : { color: '#0a0a0a', paddingX: 20, paddingY: 10, radius: 8 },
          color: '#ffffff',
        },
      });
      audio.clips.push(audioBedClip({ durationFrames: total }));
      proj.tracks = [v1, sticker, audio];
      return proj;
    },
  },
  {
    key: 'ad-reel-square',
    label: '6s ad reel',
    description: 'Square 1:1 quick-cut ad with hook + price-point title.',
    defaultAspect: '1:1',
    build: (brand) => {
      const total = fps * 6;
      const proj = shellProject('Ad reel', '1:1', total);
      const v1 = emptyTrack('video', 'V1');
      const titles = emptyTrack('text', 'T1');
      const audio = emptyTrack('audio', 'A1');

      titles.clips.push(
        titleClip({ startFrame: 0,         durationFrames: fps * 2, text: 'Hook',       brand, size: 96 }),
        titleClip({ startFrame: fps * 2,   durationFrames: fps * 2, text: 'New',        brand, size: 96 }),
        titleClip({ startFrame: fps * 4,   durationFrames: fps * 2, text: 'From $19',   brand, size: 96 }),
      );
      audio.clips.push(audioBedClip({ durationFrames: total }));
      proj.tracks = [v1, titles, audio];
      return proj;
    },
  },
];

export function templateByKey(key: string): VideoProjectTemplate | null {
  return TEMPLATES.find((t) => t.key === key) ?? null;
}

// ── Storyboard from a free-text script (Slice 15, item 87) ───────────────

/** Split a script into beats. Empty lines and `\n---\n` rules separate beats
 *  hardest; otherwise sentences (.!?) split on period+space. Each beat is
 *  trimmed and capped at 240 chars so a single mega-paragraph doesn't blow
 *  the title rendering. */
function splitScriptToBeats(script: string): string[] {
  const trimmed = script.trim();
  if (!trimmed) return [];
  // Block-level: blank lines or --- separators.
  const blocks = trimmed.split(/\n\s*\n+|\n---+\n/g).map((b) => b.trim()).filter(Boolean);
  if (blocks.length >= 2) return blocks.map((b) => b.slice(0, 240));
  // Sentence-level fallback.
  const sents = trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z“"'(])/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return (sents.length > 0 ? sents : [trimmed]).map((b) => b.slice(0, 240));
}

export interface StoryboardOpts extends BrandKit {
  fps?: number;
  aspect?: '16:9' | '9:16' | '1:1';
  /** Default seconds per beat. Total project length = beats × secondsPerBeat. */
  secondsPerBeat?: number;
}

/** Builds a VideoProject from a free-text script. Each beat lands as a text
 *  clip on a "Storyboard" track + an empty positional placeholder lane on V1
 *  for the operator to drop matching footage onto. */
export function projectFromScript(script: string, opts?: StoryboardOpts): VideoProject {
  const fpsLocal = opts?.fps ?? fps;
  const aspect = opts?.aspect ?? '16:9';
  const beats = splitScriptToBeats(script);
  if (beats.length === 0) return shellProject('Storyboard', aspect, fpsLocal * 10, fpsLocal);
  const secPerBeat = opts?.secondsPerBeat ?? 5;
  const total = fpsLocal * secPerBeat * beats.length;

  const proj = shellProject('Storyboard', aspect, total, fpsLocal);
  const v1 = emptyTrack('video', 'V1 · footage placeholders');
  const story = emptyTrack('text', 'Storyboard · script beats');
  const audio = emptyTrack('audio', 'A1 · music bed');

  beats.forEach((text, i) => {
    const startFrame = i * secPerBeat * fpsLocal;
    const durationFrames = secPerBeat * fpsLocal;
    story.clips.push({
      id: randId('c'),
      assetRef: '',
      assetKind: 'external',
      startFrame, durationFrames,
      trimInFrames: 0, trimOutFrames: 0,
      effects: [],
      textContent: text,
      motion: { ...DEFAULT_MOTION },
      textStyle: {
        ...brandedTextStyle(opts),
        fontSize: aspect === '9:16' ? 56 : 64,
        weight: 700,
        background: opts?.brandColor
          ? { color: `${opts.brandColor}cc`, paddingX: 24, paddingY: 14, radius: 8 }
          : { color: 'rgba(0,0,0,0.7)', paddingX: 24, paddingY: 14, radius: 8 },
      },
    });
  });

  audio.clips.push(audioBedClip({ durationFrames: total }));
  proj.tracks = [v1, story, audio];
  return proj;
}

