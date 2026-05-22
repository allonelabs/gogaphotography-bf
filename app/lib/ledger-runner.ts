// ════════════════════════════════════════════════════════════════════════════
// ledger-runner — boots the operator's standalone ledger-app
// (~/Projects/ledger-app, Next 16 + Drizzle + Supabase) as a long-lived
// child process and surfaces it inside allonce-ui via iframe.
//
// One process serves N businesses because the ledger-app is already
// multi-tenant on its `organizations` table. Per-business mapping is
// done with a query param the FinancialEditor passes into the iframe
// (?org=<businessId>); the ledger-app's auth flow picks the right org.
//
// Auto-generated ledger pages produced by the spawn pipeline at
// out/<id>/site/app/(app)/ledger/* are NOT shown in this surface — the
// real ledger-app is the source of truth for accounting work. Those
// auto-gen routes will be removed in a follow-up commit (replaced by a
// redirect to the ledger-app).
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const LEDGER_APP_DIR = path.join(homedir(), 'Projects', 'ledger-app');
const LEDGER_PORT = 4200; // stable port — one ledger instance per host

interface RunningLedger {
  port: number;
  proc: ChildProcess;
  startedAt: number;
  ready: boolean;
}

let RUNNING: RunningLedger | null = null;

export function ledgerAppExists(): boolean {
  return existsSync(path.join(LEDGER_APP_DIR, 'package.json'));
}

export function ledgerDepsInstalled(): boolean {
  return existsSync(path.join(LEDGER_APP_DIR, 'node_modules', 'next'));
}

export function getRunning(): { port: number; ready: boolean } | null {
  if (!RUNNING) return null;
  if (RUNNING.proc.killed || RUNNING.proc.exitCode !== null) {
    RUNNING = null;
    return null;
  }
  return { port: RUNNING.port, ready: RUNNING.ready };
}

export async function bootLedger(): Promise<{ port: number; reused: boolean }> {
  if (!ledgerAppExists()) {
    throw new Error(`ledger-runner: ${LEDGER_APP_DIR}/package.json not found — clone ledger-app first`);
  }
  if (!ledgerDepsInstalled()) {
    throw new Error(
      `ledger-runner: deps not installed — run \`cd ${LEDGER_APP_DIR} && pnpm install\` first`,
    );
  }

  const existing = getRunning();
  if (existing) return { port: existing.port, reused: true };

  // stdio: 'ignore' across the board — Next dev's first compile floods
  // stdout/stderr; an unread pipe will fill the OS buffer (~64KB) and
  // block the child. Readiness comes from HTTP probe.
  const proc = spawn('pnpm', ['dev', '--port', String(LEDGER_PORT)], {
    cwd: LEDGER_APP_DIR,
    stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, FORCE_COLOR: '0', NEXT_TELEMETRY_DISABLED: '1' },
    detached: false,
  });

  const entry: RunningLedger = { port: LEDGER_PORT, proc, startedAt: Date.now(), ready: false };
  RUNNING = entry;
  proc.on('exit', () => {
    if (RUNNING === entry) RUNNING = null;
  });

  await waitForReady(LEDGER_PORT, 60_000); // ledger-app's first compile is heavier
  entry.ready = true;
  return { port: LEDGER_PORT, reused: false };
}

export function stopLedger(): boolean {
  if (!RUNNING) return false;
  try {
    RUNNING.proc.kill('SIGTERM');
  } catch {
    // already dead
  }
  RUNNING = null;
  return true;
}

async function waitForReady(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://localhost:${port}/`, { method: 'GET' });
      if (r.status < 500) return;
    } catch {
      // not yet listening
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`ledger-runner: dev server on port ${port} did not become ready within ${timeoutMs}ms`);
}
