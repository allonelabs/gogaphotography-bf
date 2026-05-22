// localStorage-backed identity presets. Operators who spawn many
// businesses in the same shape ("EU SaaS minimal", "editorial food-bev",
// "warm-humanist nonprofit") shouldn't have to re-pick the same 7
// dimensions each time.
//
// Schema is intentionally narrow + flat — easy to migrate, no nested
// shape to break. Loaded lazily via `loadPresets()` so SSR doesn't trip
// on `window.localStorage`.

const STORAGE_KEY = 'bf:spawn-presets:v1';
const MAX_PRESETS = 12;

export interface SpawnPreset {
  readonly id: string;
  readonly name: string;
  readonly archetype: string;
  readonly aesthetic: string;
  readonly voice: string;
  readonly pace: string;
  readonly motion: string;
  readonly density: string;
  readonly seedColor: string;
  readonly createdAt: string;
}

export function loadPresets(): SpawnPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Defensive: filter out anything that doesn't match the shape.
    return parsed.filter(isValidPreset);
  } catch {
    return [];
  }
}

export function savePreset(preset: Omit<SpawnPreset, 'id' | 'createdAt'>): SpawnPreset {
  const all = loadPresets();
  const created: SpawnPreset = {
    ...preset,
    id: `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  // Most-recent-first; cap at MAX_PRESETS so storage doesn't grow unbounded.
  const next = [created, ...all].slice(0, MAX_PRESETS);
  writeToStorage(next);
  return created;
}

export function deletePreset(id: string): SpawnPreset[] {
  const next = loadPresets().filter((p) => p.id !== id);
  writeToStorage(next);
  return next;
}

function writeToStorage(presets: readonly SpawnPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // localStorage full / disabled — skip silently.
  }
}

function isValidPreset(x: unknown): x is SpawnPreset {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r['id'] === 'string' &&
    typeof r['name'] === 'string' &&
    typeof r['archetype'] === 'string' &&
    typeof r['aesthetic'] === 'string' &&
    typeof r['voice'] === 'string' &&
    typeof r['pace'] === 'string' &&
    typeof r['motion'] === 'string' &&
    typeof r['density'] === 'string' &&
    typeof r['seedColor'] === 'string' &&
    typeof r['createdAt'] === 'string'
  );
}
