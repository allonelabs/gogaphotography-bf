// /api/account/preferences — GET + PUT operator workspace preferences.
import { NextResponse } from 'next/server';

import { readPreferences, writePreferences } from '../../../lib/preferences-store';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const preferences = await readPreferences();
  return NextResponse.json({ preferences });
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
  const preferences = await writePreferences(body as Record<string, unknown>);
  return NextResponse.json({ preferences });
}
