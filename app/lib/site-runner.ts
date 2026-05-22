// ════════════════════════════════════════════════════════════════════════════
// site-runner — manages `next dev` child processes for spawned sites.
//
// One spawn → one running dev server on a stable port (4000 + slot).
// Boot is idempotent: requesting boot for an already-running spawn returns
// the existing port. Stop kills the process. Status reports running/port.
//
// In-memory state — process registry is per-Node-process. If allonce-ui
// restarts, dev servers go with it. Acceptable for the operator-tool use
// case (no persistence needed across allonce-ui restarts).
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';

interface RunningSite {
  spawnId: string;
  port: number;
  proc: ChildProcess;
  startedAt: number;
  ready: boolean;
}

const PORT_BASE = 4000;
const MAX_SLOTS = 100;
const REGISTRY = new Map<string, RunningSite>();

function allocatePort(): number {
  const used = new Set([...REGISTRY.values()].map((s) => s.port));
  for (let i = 0; i < MAX_SLOTS; i++) {
    const p = PORT_BASE + i;
    if (!used.has(p)) return p;
  }
  throw new Error('site-runner: no free ports in 4000–4099');
}

function spawnOutDir(spawnId: string): string {
  return path.join(resolveOutRoot(), spawnId);
}

function siteDir(spawnId: string): string {
  return path.join(spawnOutDir(spawnId), 'site');
}

export function getRunning(spawnId: string): { port: number; ready: boolean } | null {
  const r = REGISTRY.get(spawnId);
  if (!r) return null;
  if (r.proc.killed || r.proc.exitCode !== null) {
    REGISTRY.delete(spawnId);
    return null;
  }
  return { port: r.port, ready: r.ready };
}

export function depsInstalled(spawnId: string): boolean {
  return existsSync(path.join(siteDir(spawnId), 'node_modules', 'next'));
}

/**
 * Boot a dev server for the named spawn. Returns the assigned port + a
 * promise that resolves when the server is HTTP-ready (or rejects on
 * boot failure). Idempotent — re-calling on a running spawn reuses.
 */
export async function bootSite(spawnId: string): Promise<{ port: number; reused: boolean }> {
  if (!/^[a-z0-9][a-z0-9.\-_]*$/i.test(spawnId)) {
    throw new Error(`site-runner: invalid spawn id "${spawnId}"`);
  }
  const dir = siteDir(spawnId);
  if (!existsSync(path.join(dir, 'package.json'))) {
    throw new Error(`site-runner: no spawned site at ${dir}`);
  }
  if (!depsInstalled(spawnId)) {
    throw new Error(
      `site-runner: deps not installed at ${dir}/node_modules/next — run \`cd ${dir} && pnpm install\` first`,
    );
  }

  const existing = getRunning(spawnId);
  if (existing) {
    return { port: existing.port, reused: true };
  }

  const port = allocatePort();
  // stdio: 'ignore' on stdout/stderr — Next dev floods stdout on first compile
  // (route-by-route logging). If we 'pipe' but never drain the streams, the
  // OS pipe buffer fills (~64KB) and the child blocks mid-startup. Readiness
  // is detected via HTTP probe, so we don't need stdout anyway.
  const proc = spawn('pnpm', ['dev', '--port', String(port), '--turbo'], {
    cwd: dir,
    stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, FORCE_COLOR: '0', NEXT_TELEMETRY_DISABLED: '1' },
    detached: false,
  });

  const entry: RunningSite = { spawnId, port, proc, startedAt: Date.now(), ready: false };
  REGISTRY.set(spawnId, entry);

  proc.on('exit', () => {
    REGISTRY.delete(spawnId);
  });

  // Wait for readiness via HTTP probe. Faster + more reliable than parsing
  // stdout, which Next's banner format changes between versions.
  await waitForReady(port, 30_000);
  entry.ready = true;
  return { port, reused: false };
}

export function stopSite(spawnId: string): boolean {
  const r = REGISTRY.get(spawnId);
  if (!r) return false;
  try {
    r.proc.kill('SIGTERM');
  } catch {
    // proc already dead
  }
  REGISTRY.delete(spawnId);
  return true;
}

async function waitForReady(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://localhost:${port}/`, { method: 'GET' });
      if (r.status < 500) return;
    } catch {
      // server not yet listening
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`site-runner: dev server on port ${port} did not become ready within ${timeoutMs}ms`);
}
