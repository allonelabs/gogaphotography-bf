// ════════════════════════════════════════════════════════════════════════════
// security-store — operator security state (2FA + passkeys).
//
// Sessions and password are NOT stored here — sessions belong to a real auth
// system, and password changes require an auth backend (not yet wired).
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export interface Passkey {
  id: string;
  name: string;
  /** YYYY-MM-DD (UTC) of registration. */
  added: string;
}

export interface Security {
  twoFA: boolean;
  passkeys: Passkey[];
  updatedAt: string;
}

const DEFAULT_SECURITY: Security = {
  twoFA: false,
  passkeys: [],
  updatedAt: '1970-01-01T00:00:00.000Z',
};

function securityPath(): string {
  return path.join(resolveOutRoot(), '.bf-account', 'security.json');
}

export async function readSecurity(): Promise<Security> {
  try {
    const raw = await readFile(securityPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<Security>;
    return {
      twoFA: !!parsed.twoFA,
      passkeys: Array.isArray(parsed.passkeys) ? parsed.passkeys.filter(isValidPasskey) : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : DEFAULT_SECURITY.updatedAt,
    };
  } catch {
    return DEFAULT_SECURITY;
  }
}

export async function writeSecurity(input: Partial<Security>): Promise<Security> {
  const current = await readSecurity();
  const passkeys = Array.isArray(input.passkeys)
    ? input.passkeys.filter(isValidPasskey).slice(0, 20)
    : current.passkeys;
  const next: Security = {
    twoFA: input.twoFA === undefined ? current.twoFA : !!input.twoFA,
    passkeys,
    updatedAt: new Date().toISOString(),
  };
  const file = securityPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function isValidPasskey(p: unknown): p is Passkey {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o['id'] === 'string' && o['id'].length > 0 && o['id'].length <= 64 &&
    typeof o['name'] === 'string' && o['name'].length > 0 && o['name'].length <= 200 &&
    typeof o['added'] === 'string' && o['added'].length > 0 && o['added'].length <= 32
  );
}
