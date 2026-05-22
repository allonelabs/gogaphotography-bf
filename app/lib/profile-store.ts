// ════════════════════════════════════════════════════════════════════════════
// profile-store — operator (account-level) profile persistence.
//
// Single-record store. Lives at <outRoot>/.bf-account/profile.json so it sits
// alongside spawn directories without colliding with any spawn id (the leading
// dot is reserved per the spawn id regex used elsewhere).
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

const TIMEZONES = [
  'Europe/Tbilisi',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Dubai',
] as const;
export type Timezone = (typeof TIMEZONES)[number];

export interface Profile {
  name: string;
  email: string;
  role: string;
  timezone: string;
  bio: string;
  twitter: string;
  github: string;
  /** ISO timestamp of last server-side save. */
  updatedAt: string;
}

// Empty by default. The profile is hydrated from the auth session by the
// /api/account/profile GET route when no row exists yet — never with a
// specific person's identity. Previously seeded with "Luka Adamia /
// Growth Director" which leaked into every signed-in operator's profile
// before they saved their own.
const DEFAULT_PROFILE: Profile = {
  name: '',
  email: '',
  role: '',
  timezone: '',
  bio: '',
  twitter: '',
  github: '',
  updatedAt: '1970-01-01T00:00:00.000Z',
};

function profilePath(): string {
  return path.join(resolveOutRoot(), '.bf-account', 'profile.json');
}

export async function readProfile(): Promise<Profile> {
  try {
    const raw = await readFile(profilePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function writeProfile(input: Partial<Profile>): Promise<Profile> {
  const current = await readProfile();
  const next: Profile = {
    name: clamp(input.name ?? current.name, 200) || DEFAULT_PROFILE.name,
    email: clamp(input.email ?? current.email, 320) || DEFAULT_PROFILE.email,
    role: clamp(input.role ?? current.role, 120),
    timezone: TIMEZONES.includes(input.timezone as Timezone)
      ? (input.timezone as Timezone)
      : current.timezone,
    bio: clamp(input.bio ?? current.bio, 600),
    twitter: clamp(input.twitter ?? current.twitter, 80),
    github: clamp(input.github ?? current.github, 80),
    updatedAt: new Date().toISOString(),
  };
  const file = profilePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function clamp(s: unknown, max: number): string {
  return String(s ?? '').trim().slice(0, max);
}

export const VALID_TIMEZONES = TIMEZONES;
