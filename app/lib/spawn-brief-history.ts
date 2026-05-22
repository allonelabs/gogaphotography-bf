// localStorage-backed last-3-paragraphs history. The wizard already
// auto-saves after step 0 → step 1 advances; the operator can revert
// to a recent draft if they overwrote one they liked.

const STORAGE_KEY = 'bf:spawn-brief-history:v1';
const MAX_ENTRIES = 3;
const MIN_LENGTH = 30; // skip near-empty drafts

export interface BriefHistoryEntry {
  readonly text: string;
  readonly savedAt: string;
}

export function loadBriefHistory(): BriefHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
}

export function saveBriefDraft(text: string): BriefHistoryEntry[] {
  const trimmed = text.trim();
  if (trimmed.length < MIN_LENGTH) return loadBriefHistory();
  const all = loadBriefHistory();
  // De-duplicate against the most recent — operators often re-advance
  // through step 0 without changing the paragraph.
  if (all.length > 0 && all[0]!.text === trimmed) return all;
  const next: BriefHistoryEntry[] = [
    { text: trimmed, savedAt: new Date().toISOString() },
    ...all,
  ].slice(0, MAX_ENTRIES);
  writeToStorage(next);
  return next;
}

function writeToStorage(entries: readonly BriefHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full / disabled — skip.
  }
}

function isValidEntry(x: unknown): x is BriefHistoryEntry {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return typeof r['text'] === 'string' && typeof r['savedAt'] === 'string';
}
