// ════════════════════════════════════════════════════════════════════════════
// preferences-store — operator workspace preferences.
//
// Single-record store. Server-side validates enums + accent hex so the UI
// can trust the response shape without re-validating on read.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

const THEMES = ['light', 'dark', 'auto'] as const;
const DENSITIES = ['comfortable', 'compact', 'dense'] as const;
const CHAT_SIDES = ['right', 'left'] as const;

export type Theme = (typeof THEMES)[number];
export type Density = (typeof DENSITIES)[number];
export type ChatSide = (typeof CHAT_SIDES)[number];

export interface Preferences {
  theme: Theme;
  density: Density;
  chatSide: ChatSide;
  /** Hex color, validated as #RRGGBB. */
  accent: string;
  notifyEmail: boolean;
  notifySlack: boolean;
  notifyDesktop: boolean;
  defaultBusiness: string;
  updatedAt: string;
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  density: 'comfortable',
  chatSide: 'right',
  accent: '#0047FF',
  notifyEmail: true,
  notifySlack: false,
  notifyDesktop: true,
  defaultBusiness: 'acme-co',
  updatedAt: '1970-01-01T00:00:00.000Z',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function preferencesPath(): string {
  return path.join(resolveOutRoot(), '.bf-account', 'preferences.json');
}

export async function readPreferences(): Promise<Preferences> {
  try {
    const raw = await readFile(preferencesPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function writePreferences(input: Partial<Preferences>): Promise<Preferences> {
  const current = await readPreferences();
  const next: Preferences = {
    theme: validEnum(input.theme, THEMES, current.theme),
    density: validEnum(input.density, DENSITIES, current.density),
    chatSide: validEnum(input.chatSide, CHAT_SIDES, current.chatSide),
    accent: typeof input.accent === 'string' && HEX_RE.test(input.accent) ? input.accent.toUpperCase() : current.accent,
    notifyEmail: input.notifyEmail === undefined ? current.notifyEmail : !!input.notifyEmail,
    notifySlack: input.notifySlack === undefined ? current.notifySlack : !!input.notifySlack,
    notifyDesktop: input.notifyDesktop === undefined ? current.notifyDesktop : !!input.notifyDesktop,
    defaultBusiness:
      typeof input.defaultBusiness === 'string' && input.defaultBusiness.trim().length > 0
        ? input.defaultBusiness.trim().slice(0, 120)
        : current.defaultBusiness,
    updatedAt: new Date().toISOString(),
  };
  const file = preferencesPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function mergeWithDefaults(parsed: Partial<Preferences>): Preferences {
  return {
    theme: validEnum(parsed.theme, THEMES, DEFAULT_PREFERENCES.theme),
    density: validEnum(parsed.density, DENSITIES, DEFAULT_PREFERENCES.density),
    chatSide: validEnum(parsed.chatSide, CHAT_SIDES, DEFAULT_PREFERENCES.chatSide),
    accent: typeof parsed.accent === 'string' && HEX_RE.test(parsed.accent) ? parsed.accent.toUpperCase() : DEFAULT_PREFERENCES.accent,
    notifyEmail: parsed.notifyEmail === undefined ? DEFAULT_PREFERENCES.notifyEmail : !!parsed.notifyEmail,
    notifySlack: parsed.notifySlack === undefined ? DEFAULT_PREFERENCES.notifySlack : !!parsed.notifySlack,
    notifyDesktop: parsed.notifyDesktop === undefined ? DEFAULT_PREFERENCES.notifyDesktop : !!parsed.notifyDesktop,
    defaultBusiness:
      typeof parsed.defaultBusiness === 'string' && parsed.defaultBusiness.trim().length > 0
        ? parsed.defaultBusiness.trim().slice(0, 120)
        : DEFAULT_PREFERENCES.defaultBusiness,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : DEFAULT_PREFERENCES.updatedAt,
  };
}

function validEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export const VALID_THEMES = THEMES;
export const VALID_DENSITIES = DENSITIES;
export const VALID_CHAT_SIDES = CHAT_SIDES;
