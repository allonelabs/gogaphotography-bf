// ════════════════════════════════════════════════════════════════════════════
// /api/ledger/boot — manage the host-level ledger-app dev server.
//
// GET    → status (running, port, ready, depsInstalled, exists)
// POST   → boot (idempotent)
// DELETE → stop
// ════════════════════════════════════════════════════════════════════════════
import { NextResponse } from 'next/server';

import {
  bootLedger,
  getRunning,
  ledgerAppExists,
  ledgerDepsInstalled,
  stopLedger,
} from '../../../lib/ledger-runner';

export const runtime = 'nodejs';

export async function GET() {
  const r = getRunning();
  return NextResponse.json({
    exists: ledgerAppExists(),
    depsInstalled: ledgerDepsInstalled(),
    running: !!r,
    port: r?.port ?? null,
    ready: r?.ready ?? false,
  });
}

export async function POST() {
  try {
    const r = await bootLedger();
    return NextResponse.json({ ok: true, port: r.port, reused: r.reused });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE() {
  return NextResponse.json({ stopped: stopLedger() });
}
