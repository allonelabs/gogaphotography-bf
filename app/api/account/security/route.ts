// /api/account/security — GET + PUT 2FA + passkeys.
import { NextResponse } from 'next/server';

import { readSecurity, writeSecurity } from '../../../lib/security-store';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const security = await readSecurity();
  return NextResponse.json({ security });
}

export async function PUT(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'expected object' }, { status: 400 });
  }
  const security = await writeSecurity(body as Record<string, unknown>);
  return NextResponse.json({ security });
}
