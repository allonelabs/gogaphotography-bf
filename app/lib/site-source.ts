// ════════════════════════════════════════════════════════════════════════════
// site-source — reads the spawned site's manifest + page source files.
// Lets the brand editor surface a real route list + per-page TSX source.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

export interface SiteRoute {
  path: string;
  filePath: string;
  ownerTool: string;
  kind?: string;
  meta?: { title?: string; description?: string };
}

export interface SiteManifest {
  apex: string;
  framework: string;
  routes: SiteRoute[];
  pages?: Array<{ path: string; title?: string; kind?: string }>;
}

export async function loadSiteManifest(spawnId: string): Promise<SiteManifest | null> {
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(spawnId)) return null;
  const file = path.join(resolveOutRoot(), spawnId, 'site', 'manifest.json');
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as SiteManifest;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadPageSource(
  spawnId: string,
  routeFilePath: string,
): Promise<string | null> {
  // Defend against `..` traversal — accept only a/b/c.tsx-style relative paths.
  if (!/^[a-z0-9_/().\-[\]]+\.tsx?$/i.test(routeFilePath)) return null;
  if (routeFilePath.includes('..')) return null;
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(spawnId)) return null;
  const file = path.join(resolveOutRoot(), spawnId, 'site', 'app', routeFilePath);
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}
